'use strict';

var SHA1 = require('crypto-js/sha1');


//Todo - boris: make functions in this module asynchronous?

function createSHA1(datasource, type, tenantId, timeInMS){
    return SHA1(datasource+type+tenantId+timeInMS).toString();
}

function validateSHA1(datasource, type, tenantId, sha1String){
    if(createSHA1(datasource, type) === sha1String){
        return true;
    } else {
        return false;
    }
}

exports.createSHA1 = createSHA1;
exports.validateSHA1 = validateSHA1;