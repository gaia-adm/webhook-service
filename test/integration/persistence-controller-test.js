'use strict';

var pc = require('../../controllers/persistence-controller');
var chai = require("chai");


describe('persistence with Etcd tests', function () {

    before(function(){
        if((!process.env.ETCD_SERVER)){
            process.env.ETCD_SERVER = 'localhost:4001';
        }
        pc.initEtcdConnection();
        console.log('Etcd set');
    });

    describe('#addAndGet', function(){
        it('#add', function () {
            return (pc.add('aaa', 'bbb')).then(function (data) {
                chai.expect(data).to.be.undefined;
                //console.log('done ' + JSON.stringify(data));
            }, function(err){
                console.log('err ' + err);
            });
        });
        it('#get', function () {
            return (pc.get('aaa')).then(function (data) {
                chai.assert.equal(data.node.value, 'bbb', 'should be bbb');
                //console.log('done ' + JSON.stringify(data));
            }, function(err){
                console.log('err ' + err);
            });
        });
        it('#delete', function () {
            return (pc.delete('aaa')).then(function (data) {
                chai.expect(data).to.be.undefined;
            }, function(err){
                console.log('err ' + err);
            });
        });
    });

    describe('#failures', function(){
        it('#getFailure', function () {
            return (pc.get('nobody')).then(function (data) {
                chai.expect(data).to.be.undefined;
                console.log('done ' + JSON.stringify(data));
            }, function(err){
                console.log('err ' + err);
                chai.assert.ok(err, 'error must appear');
            });
        });
        it('#deleteFailure', function () {
            return (pc.delete('nobody')).then(function (data) {
                chai.assert.ok(data);
                console.log('done ' + JSON.stringify(data));
            }, function(err){
                chai.assert.ok(err, 'error must appear');
            });
        });
    });


});

