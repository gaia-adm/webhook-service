'use strict';

var log4js = require('log4js');
log4js.replaceConsole();
if (process.env.LOG_LEVEL) {
    log4js.setGlobalLogLevel(process.env.LOG_LEVEL);
}
var logger = log4js.getLogger('server.js');
var errorUtils = require('./helpers/error-utils.js');
var getFullError = errorUtils.getFullError;


var express = require('express');
var bodyParser = require('body-parser');
var Q = require('q');

var app = express();
var server;
var down;
app.use(logger('combined'));
app.use(bodyParser.json());
app.use(require('./controllers'));
var amqpController = require('./controllers/amqp-controller');
var persistenceController = require('./controllers/persistence-controller');
//app.use(require('./controllers/tasks-config'));
app.use(require('./controllers/webhook-controller'));
app.set('port', process.env.PORT || 3000);


function initServer() {
    // add any async initializations here
    //NOTES:
    // - etcd is must for starting, RabbitMQ does not prevent start (it is in finally section)
    // - STS (AUTH_SERVER) location is collected by middleware on demand and is not a part of server startup

    Q.fcall(persistenceController.initEtcdConnection).then(function(){
        Q.fcall(amqpController.initAmq(true)).finally(function () {
            server = app.listen(app.get('port'), function () {
                logger.info('Running on http://localhost:' + app.get('port'));
                down = shutdown;
            });
        });
    }).fail(function(err){
       logger.error(getFullError(err));
       process.exit(-2);
    });



}

var shutdown = function () {
    server.close(function () {
        Q.fcall(amqpController.shutdown).then(function () {
            logger.debug('AMQ connection has been closed gracefully');
            process.exit(0);
        }).fail(function () {
            logger.error('Failed to close AMQ connection gracefully');
            process.exit(-1);
        });
    });
};

process.on('SIGBREAK', function () {
    Q.fcall(shutdown()).finally(function (code) {
        logger.debug('Shutting down as SIGBREAK received')
    });
});
process.on('SIGTERM', function () {
    Q.fcall(shutdown()).finally(function (code) {
        logger.debug('Shutting down as SIGTERM received')
    });
});
process.on('SIGINT', function () {
    Q.fcall(shutdown()).finally(function (code) {
        logger.debug('Shutting down as SIGINT received')
    });
});

initServer();
