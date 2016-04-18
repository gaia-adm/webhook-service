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

    logger.info('Creating webhook for ' + datasource + ' and event type ' + eventType);

    respBody.datasource = datasource;
    respBody.eventType = eventType;
    respBody.createdAt = currentTime;
    respBody.apiToken = req.oauth.bearerToken.accessToken;
    respBody.tenantId = req.oauth.bearerToken.tenantId;
    respBody.token = crypto.createSHA1(datasource, eventType, respBody.tenantId, currentTime);
    respBody.hookUrl = 'https://' + req.get('Host') + '/wh/' + respBody.apiToken + '/' + respBody.token;


    Q.fcall(db.add, respBody.token, JSON.stringify(respBody)).then(function () {
        res.status(HttpStatus.OK).json(respBody);
    }).fail(function (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: err.message});
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


function validateTokenDetails(tokenDetails) {
    logger.trace('TOKEN DETAILS: ' + JSON.stringify(tokenDetails.node.value));
    var jsonValue;
    try {
        jsonValue = JSON.parse(tokenDetails.node.value);
    } catch(e){
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
router.get('/wh/config/:hookToken', function(req, res){
    db.get(req.params.hookToken).then(function (tokenDetails) {
        if (tokenDetails.node.value) {
            var jsonValue = validateTokenDetails(tokenDetails);
            if(jsonValue){
                logger.debug('Webhook ' + req.params.hookToken + ' is OK and will be returned');
                res.status(HttpStatus.OK).json(jsonValue);
            } else {
                //webhook is found but its configuraion is invalid: empty datasource/tenantId/eType
                var message = 'Webhook details are broken for '+ req.params.hookToken;
                logger.error(message);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: message});
            }
        } else {
            //persistence layer has a reference (etcd key) but no data found (etcd value)
            var message ='Webhook configuration is incorrect for '+ req.params.hookToken
            logger.error(message);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: message});
        }
    }).fail(function (err) {
        //failed to find webhook details in the persistence layer
        logger.error(getFullError(err));
        res.status(HttpStatus.BAD_REQUEST).json({status: 'error', msg: 'Failed to get webhook details'});
    });
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
                var message = 'Webhook details are broken for '+ req.params.hookToken;
                logger.error(message);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
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

    /*    logger.debug('URL: ' + (req.protocol + '://' + req.get('Host') + req.originalUrl));
     logger.debug('Hook Token: ' + req.params.hookToken);
     logger.debug('HEADERS: ' + JSON.stringify(req.headers));
     logger.debug(JSON.stringify(req.body));*/

    db.get(req.params.hookToken).then(function (tokenDetails) {
        if (tokenDetails.node.value) {
            logger.trace('TOKEN DETAILS: ' + JSON.stringify(tokenDetails.node.value));
            var jsonValue = JSON.parse(tokenDetails.node.value);
            var eType = jsonValue ? jsonValue.eventType : null;
            var datasource = jsonValue ? jsonValue.datasource : null;
            var tenantId = jsonValue.tenantId;
            if (eType && tenantId && datasource) {
                logger.debug('PUSHING DATA FOR TENANT: ' + tenantId + ',data source: ' +  datasource + ', data type: ' + eType);
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