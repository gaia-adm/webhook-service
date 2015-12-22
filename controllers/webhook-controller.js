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

var RABBIT_TIMEOUT_MSEC = 3000;

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

router.delete('/wh/config/:hookToken', function (req, res) {

    Q.fcall(db.delete, req.params.hookToken).then(function () {
        res.status(HttpStatus.NO_CONTENT).send();
    }).fail(function (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: err.message});
    });

});

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
            logger.debug('PUSHING DATA FOR TENANT: ' + tenantId);
            if (eType && tenantId && datasource) {
                var lineSeparator = '\n';
                var wordSeparator = '.';
                req.headers.tenantId = jsonValue.tenantId;
                req.headers.gaiaReceived = new Date().toISOString();
                var metadata = {};
                metadata.index = {};
                metadata.index._index = 'gaia_' + tenantId;
                metadata.index._type = eType + wordSeparator + datasource;
                var content = JSON.stringify(metadata) + lineSeparator + JSON.stringify(req.body) + lineSeparator;
                amqp.sendToIndexer(req.headers, content).timeout(RABBIT_TIMEOUT_MSEC).then(function () {
                    logger.trace('Successfully sent to event_indexer queue: ' + JSON.stringify(metadata.index) + lineSeparator + JSON.stringify(req.body) + lineSeparator);
                    res.status(HttpStatus.NO_CONTENT).send();
                }, function (err) {
                    logger.error('Failed to send data to event indexer queue: ' + JSON.stringify(metadata.index) + lineSeparator + JSON.stringify(req.body) + lineSeparator);
                    logger.error(getFullError(err));
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: 'Data push for event indexer failure'});
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