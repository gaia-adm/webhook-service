'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('webhook-controller.js');
var errorUtils = require('../helpers/error-utils');
var getFullError = errorUtils.getFullError;

var morgan = require('morgan');

var express = require('express');
var router = express.Router();
router.use(morgan(':date[iso] HTTP/:http-version" :method :url :status :response-time[digits] :res[content-length] :referrer agent:user-agent'));
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
    var timestampField = req.body.tsField;
    var currentTime = Date.now();

    logger.info('Checking, if the webhook already exists and should be updated or this is a new one and should be created');

    Q.fcall(function () {
        //validate input
        if (!datasource) {
            logger.error('Invalid input for POST request of tenant ' + req.oauth.bearerToken.tenantId + '; datasource: ' + datasource + ', event: ' + eventType);
            res.status(HttpStatus.BAD_REQUEST).json({
                status: 'error',
                msg: 'Bad request: datasource must be provided'
            });
            res.end();
            throw new Error('Bad request: datasource must be provided');
        }
        if (!eventType) {
            logger.error('Invalid input for POST request of tenant ' + req.oauth.bearerToken.tenantId + '; datasource: ' + datasource + ', event: ' + eventType);
            res.status(HttpStatus.BAD_REQUEST).json({
                status: 'error',
                msg: 'Bad request: event must be provided'
            });
            res.end();
            throw new Error('Bad request:  event must be provided');
        }
        if(!req.get('X-ORIG-SERVER')) {
            logger.error('Mandatory header is not provided, please check the documentation');
            res.status(HttpStatus.BAD_REQUEST).json({
                status: 'error',
                msg: 'Bad request: Mandatory header is not provided'
            });
            res.end();
            throw new Error('Bad request: Mandatory header is not provided');
        }
    }).then(function () {
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
                respBody.createdAt = data4.createdAt;
                respBody.apiToken = req.oauth.bearerToken.accessToken;
                respBody.tenantId = req.oauth.bearerToken.tenantId;
                respBody.token = data4.token;
                logger.debug('X-ORIG-SERVER is ' + req.get('X-ORIG-SERVER'));
                if(req.get('X-ORIG-SERVER').startsWith('webhook')){
                    respBody.hookUrl = 'https://' + req.get('X-ORIG-SERVER') + '/wh/' + respBody.apiToken + '/' + respBody.token;
                } else {
                    respBody.hookUrl = 'https://webhook.' + req.get('X-ORIG-SERVER') + '/wh/' + respBody.apiToken + '/' + respBody.token;
                }
                if (typeof timestampField === 'undefined' || timestampField === null) {
                    //if no timestampField or sent null, continue using the existing one
                    respBody.tsField = data4.tsField;
                } else if (timestampField.length === 0) {
                    //if timestampField is set to empty string explicitly, we remove it
                    delete respBody.tsField;
                } else {
                    //if timestampField provided, using it
                    //NOTE: if empty string provided as a value, tsField will be reset (removed) from the configuration
                    respBody.tsField = timestampField;
                }
                //   res.status(HttpStatus.OK).json({result: data4.key});
            } else {
                logger.trace('Creating webhook for tenant ' + req.oauth.bearerToken.tenantId);
                respBody.datasource = datasource;
                respBody.eventType = eventType;
                if (timestampField) {
                    respBody.tsField = timestampField;
                }
                respBody.createdAt = currentTime;
                respBody.apiToken = req.oauth.bearerToken.accessToken;
                respBody.tenantId = req.oauth.bearerToken.tenantId;
                respBody.token = crypto.createSHA1(datasource, eventType, respBody.tenantId, currentTime);
                if(req.get('X-ORIG-SERVER').startsWith('webhook')){
                    respBody.hookUrl = 'https://' + req.get('X-ORIG-SERVER') + '/wh/' + respBody.apiToken + '/' + respBody.token;
                } else {
                    respBody.hookUrl = 'https://webhook.' + req.get('X-ORIG-SERVER') + '/wh/' + respBody.apiToken + '/' + respBody.token;
                }
            }
            Q.fcall(db.add, respBody.token, JSON.stringify(respBody)).then(function () {
                //ugly workaround due to naming mismatch - customer-facing "event" vs. internally used "eventType"
                respBody.event = respBody.eventType;
                delete respBody.eventType;
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
    if (data && data.constructor === Array) {
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
            if (jsonValue && (req.params.oauthToken === jsonValue.apiToken)) {
                logger.debug('Webhook URL checked and found valid: ' + fullUrl);
                res.status(HttpStatus.OK).send();
            } else {
                //webhook is found but its configuraion is invalid: empty datasource/tenantId/eType
                var message = 'Webhook URL that ends with ' + req.params.hookToken + ' is broken';
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

    var ct = req.get('Content-Type');
    if ( !(ct && ct.indexOf('application/json') !== -1) ) {
        res.sendStatus(HttpStatus.UNSUPPORTED_MEDIA_TYPE).end();
        throw new Error('Unsupported Content-Type: must be application/json, found: ' + ct);
    }

    db.get(req.params.hookToken).then(function (tokenDetails) {
        if (tokenDetails.node.value) {
            logger.trace('TOKEN DETAILS: ' + JSON.stringify(tokenDetails.node.value));
            var jsonValue = JSON.parse(tokenDetails.node.value);
            if(req.params.oauthToken !== jsonValue.apiToken) {
                throw new Error('Invalid API token');
            }
            var eType = jsonValue ? jsonValue.eventType : null;
            var datasource = jsonValue ? jsonValue.datasource : null;
            var tenantId = jsonValue.tenantId;
            var hookHeaders = {};
            hookHeaders.tsField = jsonValue ? jsonValue.tsField : null;
            if (eType && tenantId && datasource) {
                logger.debug('PUSHING DATA FOR TENANT: ' + tenantId + ',data source: ' + datasource + ', data type: ' + eType);
                var lineSeparator = '\n';
                var wordSeparator = '.';
                var routingKey = 'event' + wordSeparator + tenantId + wordSeparator + datasource + wordSeparator + eType;
                var content = JSON.stringify(req.body);

                amqp.sendToEnricher(routingKey, content, hookHeaders).timeout(RABBIT_TIMEOUT_MSEC).then(function () {
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
        res.status(HttpStatus.BAD_REQUEST).json({status: 'error', msg: err.message});
    });

});

module.exports = router;
module.exports.validateTokenDetails = validateTokenDetails;
module.exports.filterByTenant = filterWebhooksByTenantId;