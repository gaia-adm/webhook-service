'use strict';

/*
var INTERVAL_IN_SECONDS = 300;

var express = require('express');
var router = express.Router();
var HttpStatus = require('http-status-codes');
var cronHelper = require('../helpers/cron-helper');
var mp = require('./data-handler');
var dbController = require('./persistence-controller');
var CollectionTask = require('../models/CollectionTask');
var Q = require('q');

//create new task
router.post('/config/task', function (req, res) {

    //Payload example: {"providerType":"alm/issue/change","providerProps":{"url":"http://qc1.hp.com:8080","domain":"QC","project":"proj1","init_history_days":14},"runPeriod":{"minute":{"value":30,"every":true},"hour":{"value":2,"every":true}},"credentialsId":"borisQcCredentials"}

    //Todo - boris: add more validations on input
    var collectionTask = new CollectionTask(req.body.providerType, req.body.providerProps, cronHelper.createCronExpression(req.body.runPeriod), req.body.credentialsId);
    if (typeof collectionTask.providerType === 'undefined' || typeof collectionTask.providerProps === 'undefined' || typeof collectionTask.credentialsId === 'undefined' || collectionTask.providerType === null || collectionTask.providerProps === null) {
        res.status(HttpStatus.BAD_REQUEST);
        res.json({status: 'error', msg: 'At least one of mandatory parameters is not provided'});
    }
    else {
        console.log(collectionTask);
        Q.fcall(dbController.add, JSON.stringify(collectionTask.providerProps), collectionTask).then(function (result) {
            console.log('added to database');
            res.status(HttpStatus.CREATED).json(result);
        }).fail(function (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: new Error(err)});
        });
    }
});

//get all tasks
router.get('/config/task', function (req, res) {
    Q.fcall(dbController.getFullDatabase).then(function (result) {
        var body = [];
        if (result) {
            for (var v in result) {
                if (v) {
                    var item = result[v];
                    item.nextRunUTC = cronHelper.getNextOccurrence(item.runPeriod, INTERVAL_IN_SECONDS);
                    body.push(item);
                }
            }
            res.status(HttpStatus.OK).json(body);
        } else {
            res.status(HttpStatus.OK).json([]);
        }
    }).fail(function (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: new Error(err)});
    });
});

//get tasks ready to run (next occurrence of runPeriod cron expression took place in the recent INTERVAL_IN_SECONDS sec)
router.get('/config/task/ready', function (req, res) {
    Q.fcall(dbController.getFullDatabase).then(function (result) {
        var body = [];
        if (result) {
            for (var v in result) {
                if (v) {
                    var item = result[v];
                    item.nextRunUTC = cronHelper.getNextOccurrence(item.runPeriod, INTERVAL_IN_SECONDS);
                    if (item.nextRunUTC) {
                        body.push(item);
                    }
                }
            }
            res.status(HttpStatus.OK).json(body);
        } else {
            res.status(HttpStatus.OK).json([]);
        }
    }).fail(function (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', msg: new Error(err)});
    });
});

//updated task (scheduling or credentials only)
router.put('/config/task/:taskId', function (req, res) {

    res.statusCode(HttpStatus.BAD_REQUEST);
    res.json({status: 'error', msg: 'Not implemented yet'});
});
//get specific task
router.get('/config/task/:taskId', function (req, res) {

    res.statusCode(HttpStatus.BAD_REQUEST);
    res.json({status: 'error', msg: 'Not implemented yet'});
});

//================================= Start of dummy code ============================================================

/!*
 router.get('/config/tasks/tenant/:tenantId', function (req, res, next) {
 var tenantId = req.params.tenantId;
 console.log("Input data: " + tenantId);
 Q.fcall(mp.etcdGet, "/tenants", tenantId).then(function (result) {
 console.log("result: " + JSON.stringify(result));
 res.send(result.node.value);
 }).fail(function (error) {
 console.error('too bad...');
 res.status(HttpStatus.NOT_FOUND).json({status: 'error', msg: error.message});
 });
 });
 *!/

router.get('/config/tasks/etcdv', function (req, res) {
    Q.fcall(mp.etcdVersion, "localhost", 4001).then(function (result) {
        res.send(result);
    });
});

//================================= End of dummy code ============================================================

module.exports = router;*/
