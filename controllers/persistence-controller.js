'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('persistence-controller.js');
var errorUtils = require('../helpers/error-utils');
var getFullError = errorUtils.getFullError;

var EtcdForNode = require('node-etcd');
var Q = require('q');

var BASE_PATH = 'webhooks/';
var etcd = null;

function getEtcdDetails() {
    if (!process.env.ETCD_SERVER) {
        logger.log('CRITICAL', 'persistence-controller', 'ETCD_SERVER environment variable must be set in format host:port');
        throw new Error('ETCD_SERVER environment variable must be set in format host:port');
    }
    var etcdDetails = process.env.ETCD_SERVER.split(':');
    if (etcdDetails.length !== 2) {
        logger.log('CRITICAL', 'persistence-controller', 'ETCD_SERVER environment variable must be set in format host:port');
        throw new Error('ETCD_SERVER environment variable must be set in format host:port');
    }

    return {hostname: etcdDetails[0], port: etcdDetails[1]};

}

function initEtcd() {

    var etcdParams = getEtcdDetails();

    etcd = new EtcdForNode(etcdParams.hostname, etcdParams.port);
    return Q.Promise(function (resolve, reject) {
        if (!etcd) {
            logger.log('CRITICAL', 'persistence-controller', 'Etcd is not configured properly');
            reject(new Error('Etcd is not configured properly'));
        } else {
            etcd.get(BASE_PATH, function(err){
                if (err) {
                    logger.warn('Checked the existence of ', BASE_PATH, ' directory and the result is: ', err);
                    etcd.mkdir(BASE_PATH, function (err) {
                        if (err) {
                            logger.error(BASE_PATH, ' folder does not exist and cannot create it', err);
                            reject(new Error('Error accessing Etcd on ' + etcdParams.hostname + ':' + etcdParams.port));
                        } else {
                            logger.log('INFO', 'persistence-controller', 'Cannot connect ' + BASE_PATH + ' folder on ' + etcdParams.hostname + ':' + etcdParams.port);
                            resolve();
                        }
                    });
                } else {
                    logger.log('INFO', 'persistence-controller', 'Connected to Etcd on ' + etcdParams.hostname + ':' + etcdParams.port);
                    resolve();
                }
            });
        }
    });
}

/*
 Store webhook token in the persistence
 Parameters:
 - key - generated token that used as a key together  with the BASE_PATH const
 - value - token metadata (includes the token itself as well)
 Returns: a promise
 */

function add(key, value) {
    var deferred = Q.defer();
    etcd.set(BASE_PATH + key, value, function (err) {
        if (err) {
            logger.error(getFullError(err));
            deferred.reject(new Error(err));
        } else {
            logger.debug('Saved data for token ' + key);
            deferred.resolve();
        }
    });
    return deferred.promise;
}

/*
 Get webhook token details
 Parameters:
 - webhook token
 Returns: a promise with webhook details, if exists or error
 */
function getTokenDetails(key) {
    var deferred = Q.defer();
    etcd.get(BASE_PATH + key, function (err, data) {
        if (err) {
            deferred.reject(err.message + '(' + key + ')');
        } else {
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}

/*
 Get all webhook details
 Returns: a promise with a list of webhooks details, if exist or error
 */
function getAllDetails() {
    var deferred = Q.defer();

    etcd.get(BASE_PATH, {recursive: true}, function (err, data) {
        console.log(require('util').inspect(err, true, 10));
        if (err) {
            deferred.reject(err.message + '(' + BASE_PATH + ')');
        } else {
            var usefulData = data.node.nodes;
            console.log('useful data: ' + JSON.stringify(data));
            deferred.resolve(usefulData);
        }
    });
    return deferred.promise;
}

function deleteTokenDetails(key) {
    var deferred = Q.defer();
    etcd.del(BASE_PATH + key, function (err) {
        if (err) {
            logger.error(getFullError(err));
            deferred.reject(new Error(err));
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise;
}


/*
 var database = {};

 function insert(key, value) {
 database[key] = value;
 return database[key];
 }

 function getByKey(key) {
 return database[key];
 }

 function getFullDatabase() {
 return database;
 }

 function cleanDB() {
 database = {};
 }

 exports.add = insert;
 exports.getByKey = getByKey;
 exports.getFullDatabase = getFullDatabase;
 exports.cleanDB = cleanDB;
 */

exports.add = add;
exports.get = getTokenDetails;
exports.getAll = getAllDetails;
exports.delete = deleteTokenDetails;
exports.initEtcdConnection = initEtcd;