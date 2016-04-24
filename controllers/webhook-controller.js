'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('webhook-controller.js');
var errorUtils = require('../helpers/error-utils');
var getFullError = errorUtils.getFullError;

var express = require('express');
var router = express.Router();
var HttpStatus = require('http-status-codes');
var Q = require('q');

var crypto = require('../helpers/crypto-helper');
var amqp = require('./amqp-controller');
var db = require('./persistence-controller');

var auth = require('../middlewares/auth');
router.use('/wh/:oauthToken/:hookToken', auth.setAuthorizationHeader);
router.use('/wh/config*', auth.authorise);
router.use('/wh/config*', auth.errorHandler);

var RABBIT_TIMEOUT_MSEC = 10000;

//Create webhook configuration
router.post('/wh/config', function (req, res) {

    var respBody = {};
    var datasource = req.body.datasource;
    var eventType = req.body.event;
    var currentTime = Date.now();

    logger.info('Checking, if the webhook already exists and should be updated or this is a new one and should be created');


    Q.fcall(function () {
        return db.getAll();
    }).then(function (data) {
        Q.fcall(function () {
            return filterWebhooksByTenantId(data, req.oauth.bearerToken.tenantId);
        }).then(function (data3) {
            for (var i = 0; i < data3.length; i++) {
                if (data3[i].datasource === datasource && data3[i].eventType === eventType) {
                    return data3[i];
                }
            }
            return null;
        }).then(function (data4) {
            if (data4) {
                logger.trace('Requested webhook already exists, editing...');
                respBody.datasource = data4.datasource;
                respBody.eventType = data4.eventType;
                respBody.createdAt = data4.currentTime;
                respBody.apiToken = req.oauth.bearerToken.accessToken;
                respBody.tenantId = req.oauth.bearerToken.tenantId;
                respBody.token = data4.token;
                respBody.hookUrl = 'https://' + req.get('Host') + '/wh/' + respBody.apiToken + '/' + respBody.token;
                //   res.status(HttpStatus.OK).json({result: data4.key});
            } else {
                logger.trace('Creating webhook for tenant ' + req.oauth.bearerToken.tenantId);
                respBody.datasource = datasource;
                respBody.eventType = eventType;
                respBody.createdAt = currentTime;
                respBody.apiToken = req.oauth.bearerToken.accessToken;
                respBody.tenantId = req.oauth.bearerToken.tenantId;
                respBody.token = crypto.createSHA1(datasource, eventType, respBody.tenantId, currentTime);
                respBody.hookUrl = 'https://' + req.get('Host') + '/wh/' + respBody.apiToken + '/' + respBody.token;
            }
            Q.fcall(db.add, respBody.token, JSON.stringify(respBody)).then(function () {
                res.status(HttpStatus.OK).json(respBody);
            }).fail(function (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: err.message});
            });
        });
    });
});

//Delete webhook configuration
router.delete('/wh/config/:hookToken', function (req, res) {

    Q.fcall(db.delete, req.params.hookToken).then(function () {
        res.status(HttpStatus.NO_CONTENT).send();
    }).fail(function (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: err.message});
    });

});

//When all webhooks details requested, return only those that owned by tenant that sent the request
function filterWebhooksByTenantId(data, tenantId) {
    var result = [];
    if (data.constructor === Array) {
        logger.trace('Total webhooks defined for all tenants: ' + data.length);
        for (var i = 0; i < data.length; i++) {
            var parsed = JSON.parse(data[i].value);
            if ('' + parsed.tenantId === '' + tenantId) {
                result.push(parsed);
            }
        }
    }
    logger.trace('Webhooks defined for tenant ' + tenantId + ': ' + result.length);
    return result;
}

function validateTokenDetails(tokenDetails) {
    logger.trace('TOKEN DETAILS: ' + JSON.stringify(tokenDetails.node.value));
    var jsonValue;
    try {
        jsonValue = JSON.parse(tokenDetails.node.value);
    } catch (e) {
        logger.error(getFullError(e));
        //logger.error('Failed to parse value for token ' + JSON.stringify(tokenDetails));
        return null;
    }
    var eType = jsonValue ? jsonValue.eventType : null;
    var datasource = jsonValue ? jsonValue.datasource : null;
    var tenantId = jsonValue.tenantId;
    if (eType && tenantId && datasource) {
        return jsonValue;
    } else {
        return null;
    }
}

//Get webhook configuration by hook token
router.get('/wh/config/:hookToken', function (req, res) {
    db.get(req.params.hookToken).then(function (tokenDetails) {
        var message;
        if (tokenDetails.node.value) {
            var jsonValue = validateTokenDetails(tokenDetails);
            if (jsonValue) {
                logger.debug('Webhook ' + req.params.hookToken + ' is OK and will be returned');
                res.status(HttpStatus.OK).json(jsonValue);
            } else {
                //webhook is found but its configuraion is invalid: empty datasource/tenantId/eType
                message = 'Webhook details are broken for ' + req.params.hookToken;
                logger.error(message);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: message});
            }
        } else {
            //persistence layer has a reference (etcd key) but no data found (etcd value)
            message = 'Webhook configuration is incorrect for ' + req.params.hookToken;
            logger.error(message);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: message});
        }
    }).fail(function (err) {
        //failed to find webhook details in the persistence layer
        logger.error(getFullError(err));
        res.status(HttpStatus.BAD_REQUEST).json({status: 'error', msg: 'Failed to get webhook details'});
    });
});

//Get webhook configurations for the provided tenantId
router.get('/wh/config', function (req, res) {
    var tenantId = req.oauth.bearerToken.tenantId;
    if (!tenantId) {
        res.status(HttpStatus.UNAUTHORIZED).json({status: 'error', msg: 'Cannot authenticate'});
    } else {
        db.getAll().then(function (data, err) {
            if (err) {
                logger.error(err);
                res.status(HttpStatus.NOT_FOUND).send();
            } else {
                logger.trace(data);
                Q.fcall(filterWebhooksByTenantId, data, tenantId).then(function (result) {
                    res.status(HttpStatus.OK).json(result);
                });

            }
        });

    }
});

//Validate webhook URL (optional)
//Trello issues HEAD request to the Webhook URL during configuration in order to check URL validness
//This method answers with empty HTTP-200, if the URL is valid
router.head('/wh/:oauthToken/:hookToken', function (req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    db.get(req.params.hookToken).then(function (tokenDetails) {
        if (tokenDetails.node.value) {
            var jsonValue = validateTokenDetails(tokenDetails);
            if (jsonValue) {
                logger.debug('Webhook URL checked and found valid: ' + fullUrl);
                res.status(HttpStatus.OK).send();
            } else {
                //webhook is found but its configuraion is invalid: empty datasource/tenantId/eType
                var message = 'Webhook details are broken for ' + req.params.hookToken;
                logger.error(message);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
            }
        } else {
            //persistence layer has a reference (etcd key) but no data found (etcd value)
            logger.debug('Webhook URL checked and found INVALID due to invalid structure: ' + fullUrl);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
        }
    }).fail(function (err) {
        //failed to find webhook details in the persistence layer
        logger.error(getFullError(err));
        res.status(HttpStatus.BAD_REQUEST).send();
    });
});

//Post webhook data
router.post('/wh/:oauthToken/:hookToken', function (req, res) {
    db.get(req.params.hookToken).then(function (tokenDetails) {
        if (tokenDetails.node.value) {
            logger.trace('TOKEN DETAILS: ' + JSON.stringify(tokenDetails.node.value));
            var jsonValue = JSON.parse(tokenDetails.node.value);
            var eType = jsonValue ? jsonValue.eventType : null;
            var datasource = jsonValue ? jsonValue.datasource : null;
            var tenantId = jsonValue.tenantId;
            if (eType && tenantId && datasource) {
                logger.debug('PUSHING DATA FOR TENANT: ' + tenantId + ',data source: ' + datasource + ', data type: ' + eType);
                var lineSeparator = '\n';
                var wordSeparator = '.';
                var routingKey = 'event' + wordSeparator + tenantId + wordSeparator + datasource + wordSeparator + eType;
                var content = JSON.stringify(req.body);
                amqp.sendToEnricher(routingKey, content).timeout(RABBIT_TIMEOUT_MSEC).then(function () {
                    logger.trace('Successfully sent to RabbitMQ: ' + JSON.stringify(req.body) + lineSeparator);
                    res.status(HttpStatus.NO_CONTENT).send();
                }, function (err) {
                    logger.error('Failed to send data to RabbitMQ: ' + JSON.stringify(req.body) + lineSeparator);
                    logger.error(getFullError(err));
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                        status: 'error',
                        msg: 'Data push for event enricher failure'
                    });
                });
            } else {
                logger.error('Invalid token is stored in Etcd - event type is missing: ' + JSON.stringify(jsonValue));
                throw new Error('Invalid token in use');
            }
        } else {
            logger.error('Token value is missing in Etcd for token ' + req.params.hookToken);
            throw new Error('Invalid token in use');
        }
    }).fail(function (err) {
        //failure due to token problems
        logger.error(getFullError(err));
        res.status(HttpStatus.BAD_REQUEST).json({status: 'error', msg: 'Invalid token in use'});
    });

});

module.exports = router;
module.exports.validateTokenDetails = validateTokenDetails;
module.exports.filterByTenant = filterWebhooksByTenantId;