'use strict';

var chai = require('chai');
var Q = require('q');

var pc = require('../../controllers/persistence-controller');

describe('persistence-unit-test', function () {

    describe('#failures', function () {
        it('#initMissingEtcd', function () {
            Q.fcall(pc.initEtcdConnection).then(function () {
                done();
            }, function (err) {
                chai.expect.ok(err.message);
            });
        });
        it('#initInvalidEtcd', function () {
            Q.fcall(pc.initEtcdConnection).then(function () {
                done();
            }, function (err) {
                chai.expect.ok(err.message);
            });
        });

    });

    describe('#init', function () {
        it('#initOK', function () {
            if ((!process.env.ETCD_SERVER)) {
                process.env.ETCD_SERVER = 'localhost:4001';
            }
            Q.fcall(pc.initEtcdConnection).then(function () {
                done();
            }, function (err) {
                console.error('b: ' + err.message);
                chai.expect.to.be.undefined;
            });
        });
    });

});

