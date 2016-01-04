'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('amqp-controller.js');
var errorUtils = require('../helpers/error-utils');
var getFullError = errorUtils.getFullError;

var amqp = require('amqplib');
var Q = require('q');

var EVENT_INDEXER_QUEUE = 'es-events-indexer';
var channel = null;
var conn = null;

var RECONNECT_TIMEOUT = 10000;
var MAX_RECONNECT_COUNTER = 3;
var reconnectCounter = 0;
var recreateChannelTimerId = null;
var reconnectTimerId = null;

function getAmqServer() {
    if (!process.env.AMQ_SERVER) {
        throw new Error('AMQ_SERVER environment variable must be set in format host:port');
    }
    return process.env.AMQ_SERVER;
}

function getAmqCredentials() {
    if (!process.env.AMQ_USER) {
        throw new Error('AMQ_USER environment variable must be set');
    }
    var pwd = process.env.AMQ_PASSWORD ? process.env.AMQ_PASSWORD : '';

    return {username: process.env.AMQ_USER, password: pwd};

}

/**
 * Initializes connection to RabbitMQ and returns promise to allow waiting for initialization completion.
 * @returns promise
 */
function connectAmqServer(handleReconnect) {
    var credentials = getAmqCredentials();
    var url = 'amqp://' + credentials.username + ':' + credentials.password + '@' + getAmqServer() + '?frameMax=0x1000&heartbeat=30';
    logger.info('Connecting to ' + url);
    var ok = amqp.connect(url);
    return ok.then(function (connection) {

        function onClose() {
            logger.info('AMQ connection is closed');
            conn = null;
        }

        function onError() {
            logger.error('Error occurred :(((');
            if (handleReconnect) {
                scheduleReconnect();
            } else {
                conn = null;
            }
        }

        function cleanup() {
            conn.removeListener('close', onClose);
            conn.removeListener('error', onError);
            conn.removeListener('close', cleanup);
        }


        connection.on('close', onClose);
        connection.on('error', onError);
        connection.on('close', cleanup);

        conn = connection;

        return initChannel(conn);
    }, function (err) {
        throw new Error('Failed to connect...', err);
    });

}

/**
 * Creates AMQ channel on which messages can be sent.
 *
 * @param conn AMQ connection
 * @returns promise
 */
function initChannel(conn) {
    var ok = conn.createConfirmChannel().then(function (ch) {
        function onClose() {
            logger.info('AMQ channel is closed');
            channel = null;
        }

        function onError(err) {
            logger.error(getFullError(err));
            scheduleRecreateChannel();
        }

        function cleanup() {
            ch.removeListener('close', onClose);
            ch.removeListener('error', onError);

            ch.removeListener('close', cleanup);
        }

        ch.on('close', onClose);
        ch.on('error', onError);

        ch.on('close', cleanup);

        channel = ch;

        return ch.assertQueue(EVENT_INDEXER_QUEUE, {durable: true}).then(function(){
            reconnectCounter = 0;
            logger.debug('Queue ' + EVENT_INDEXER_QUEUE + ' has been asserted into existence');
        });
    });
    return ok;
}

function initAmq(handleReconnect) {
    var ok = connectAmqServer(handleReconnect);
    return ok.catch(function (err) {
        if (handleReconnect) {
            logger.error(getFullError(err));
            scheduleReconnect();
        } else {
            throw err;
        }
    });
}

function scheduleReconnect() {
    if (recreateChannelTimerId) {
        reconnectCounter--;
        reconnectCounter = Math.max(reconnectCounter, 0);
        clearTimeout(recreateChannelTimerId);
        recreateChannelTimerId = null;
    }
    if (reconnectTimerId) {
        return;
    }
    function doReconnect() {
        reconnectTimerId = null;
        shutdown().finally(function () {
            logger.warn('Reconnecting to RabbitMQ..');
            initAmq(true);
        });
    }

    reconnectCounter++;
    reconnectCounter = Math.min(reconnectCounter, MAX_RECONNECT_COUNTER);
    var delay = reconnectCounter * RECONNECT_TIMEOUT;
    logger.warn('Trying next reconnect in ' + delay / 1000 + 's');
    reconnectTimerId = setTimeout(doReconnect, delay);
}

function scheduleRecreateChannel() {
    if (recreateChannelTimerId) {
        return;
    }
    function doRecreateChannel() {
        recreateChannelTimerId = null;
        closeChannel().finally(function () {
            if (conn !== null) {
                logger.warn('Recreating channel..');
                initChannel(conn);
            }
        });
    }

    reconnectCounter++;
    reconnectCounter = Math.min(reconnectCounter, MAX_RECONNECT_COUNTER);
    var delay = reconnectCounter * RECONNECT_TIMEOUT;
    logger.warn('Trying next channel recreation in ' + delay / 1000 + 's');
    recreateChannelTimerId = setTimeout(doRecreateChannel, delay);
}

/**
 * Closes all channels and connection.
 *
 * @returns promise
 */
function shutdown() {
    var ok = closeChannel();
    return ok.then(closeConnection);
}

function closeConnection() {
    if (conn !== null) {
        return conn.close();
    } else {
        return Q.fcall(function () {
            return 'Connection is already closed';
        });
    }
}

/**
 * Closes the channel.
 *
 * @returns promise
 */
function closeChannel() {
    if (channel !== null) {
        return channel.close();
    } else {
        return Q.fcall(function () {
            return 'Channel is already closed';
        });
    }
}

/**
 * Sends webhook data to event-indexer.
 * @param hookHeaders: future message header, includes HTTP headers of the webhook call as well as the tenant id
 * @param content: future message payload, includes ElasticSearch _bulk API metadata and webhook event content
 * @returns promise
 */
function sendToIndexer(hookHeaders, content) {

    return Q.Promise(function (resolve, reject) {
        if (!channel) {
            reject(new Error('Notification channel is not ready'));
        } else {

            // Todo - boris: amqplib bug workaround - https://github.com/squaremo/amqp.node/issues/179.
            // NOT SURE IF APPLICABLE to sendToQueue!!!
            // If exists, add assertQueue and then sendToQueue
            channel.sendToQueue('es-events-indexer', new Buffer(content), {
                mandatory: false,
                persistent: true,
                headers: hookHeaders
            }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
    });
}


exports.initAmq = initAmq;
exports.shutdown = shutdown;
exports.sendToIndexer = sendToIndexer;
