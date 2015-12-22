'use strict';

/*
var Etcd = require('node-etcd');
var Q = require('q');

function sayHello() {
    return {say: "hello"};
}

function etcdVersion(host, port) {

    var deferred = Q.defer();
    var etcd = new Etcd(host, port);
    etcd.version(function (err, result) {
        if (err) {
            console.log('error');
            deferred.reject(new Error(err));
        } else {
            console.log('passed');
            deferred.resolve(result);
        }

    });

    return deferred.promise;
}

function etcdGet(path, obj){
    var deferred = Q.defer();
    var etcd = new Etcd("gaia.skydns.local", 4001);
    etcd.get(path+"/"+obj, function(err, data){
        if(err){
//            console.error(err);
            deferred.reject(new Error(err));
        } else {
//            console.log(data);
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}

function etcdPost(path, obj) {
    var deferred = Q.defer();
    var etcd = new Etcd("gaia.skydns.local", 4001);
    etcd.set(path, JSON.stringify(obj), function(err, data){
        if(err){
            console.error(err);
            deferred.reject(new Error(err));
        } else {
            console.log(data);
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}

function firedByRabbitGetTenantData(obj){
    console.log("RECEIVED: " + obj);
    var path = "/tenants";
    var requestedTenantId = obj;
    var result = etcdGet(path, requestedTenantId);
    return result;
/!*    Q.fcall(etcdGet, path, requestedTenantId).then(function(data){
        return data;
    }).fail(function (err) {
        console.error('failed to get data from etcd for tenantId ' + obj + '; reason: ' + err);
        throw new Error('failed to get data from etcd for tenantId ' + obj + '; reason: ' + err);
    })*!/
}

exports.etcdGet = etcdGet;
exports.etcdPost = etcdPost;
exports.etcdVersion = etcdVersion;
exports.sayHello = sayHello;
exports.firedByRabbitGetTenantData = firedByRabbitGetTenantData;*/
