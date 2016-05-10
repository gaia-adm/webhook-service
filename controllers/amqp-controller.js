'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('amqp-controller.js');
var errorUtils = require('../helpers/error-utils');
var getFullError = errorUtils.getFullError;

var amqp = require('amqplib');
var Q = require('q');

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

        connection.on('close', onClose);
        connection.on('error', onError);

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
    var ok = conn.createChannel().then(function (ch) {
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

        return ch.assertExchange('events-to-enrich', 'topic', {durable: true}).then(function() {
            reconnectCounter = 0;
            logger.debug('Exchange \'events-to-enrich\' has been asserted into existence');
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
 * Sends webhook data to events-to-enrich exchange
 * @param routingKey: RabbitMQ routingKey. Need to be in the format of: "event.TENANT_ID.DATA_SOURCE.DATA_TYPE"
 * @param content: webhook event content
 * @param headers: message headers, tsField (field that contains timestamp in the webhook) is the only header that sent; empty object is sent if tsField is not set
 * @returns promise
 */
function sendToEnricher(routingKey, content, headers) {

    return Q.Promise(function (resolve, reject) {
        if (!channel) {
            reject(new Error('Notification channel is not ready'));
        } else {
            var bufferNotFull = channel.publish('events-to-enrich', routingKey, new Buffer(content), {
                mandatory: false,
                persistent: true,
                headers: headers
            });

            //amqplib returns true even if RabbitMQ is down, the send operation will fail
            //only when the connection will be closed (automatically after few seconds)
            //and the channel will be null
            //I've opened this issue in amqplib github account: https://github.com/squaremo/amqp.node/issues/220
            if (bufferNotFull) {
                resolve();
            }
            else{
                reject();
            }
        }
    });
}


exports.initAmq = initAmq;
exports.shutdown = shutdown;
exports.sendToEnricher = sendToEnricher;
