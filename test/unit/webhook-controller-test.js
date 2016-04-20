'use strict';

/*
 Following the error handling cases that can happen on calling this API:
 //Get webhook configuration by hook token
 router.get('/wh/config/:hookToken', function(req, res){}
 and should be tested somehow

 no value under the existing key:
 [2016-04-18 15:07:21.673] [ERROR] webhook-controller.js - Webhook configuration is incorrect for 26b623840a56944fa2e4f00c78eb2b4d2dab8b0d
 HTTP-500:
 {
 "status": "error",
 "msg": "Webhook configuration is incorrect for 26b623840a56944fa2e4f00c78eb2b4d2dab8b0d"
 }

 cannot parse the value (invalid json)
 [2016-04-18 15:12:02.973] [ERROR] webhook-controller.js - Failed to parse value for token {"action":"get","node":{"key":"/webhooks/26b623840a56944fa2e4f00c78eb2b4d2dab8b0d","value":"asdasd assa","modifiedIndex":585819,"createdIndex":585819}}
 [2016-04-18 15:12:02.973] [ERROR] webhook-controller.js - Webhook details are broken for 26b623840a56944fa2e4f00c78eb2b4d2dab8b0d
 HTTP-500:
 {
 "status": "error",
 "msg": "Webhook details are broken for 26b623840a56944fa2e4f00c78eb2b4d2dab8b0d"
 }

 bad wh details (json is parseable but missing datasource, for example)
 [2016-04-18 15:14:11.320] [ERROR] webhook-controller.js - Webhook details are broken for 26b623840a56944fa2e4f00c78eb2b4d2dab8b0d
 HTTP-500:
 {
 "status": "error",
 "msg": "Webhook details are broken for 26b623840a56944fa2e4f00c78eb2b4d2dab8b0d"
 }

 wh not found in the persistence layer
 [2016-04-18 15:23:27.092] [ERROR] webhook-controller.js - Key not found(26b623840a56944fa2e4f00c78eb2b4d2dab8b0e)
 HTTP-400
 {
 "status": "error",
 "msg": "Failed to get webhook details"
 }*/


var chai = require('chai');

//var Q = require('q');

var whc = require('../../controllers/webhook-controller');

describe('#webhook-unit-test', function () {

    var token = {
        node: {
            key: '"/webhooks/aaa',
            value: '{"datasource":"github","eventType":"push","createdAt":1461145170798,"apiToken":"0bcfb625-ee6d-4d66-bbbf-73966d2426a4","tenantId":3602590810,"token":"78a184cc05756f1657f3e778db2e0c8963596e80","hookUrl":"https://gaia-local.skydns.local:88/wh/0bcfb685-ee7d-4d66-bbbf-73966d2326a4/78a184cc05756f1657f3e778db2e0c8963596e80"}'
        }
    };

    describe("#validateToken", function () {

        it('#validateGoodToken', function () {

            chai.assert.notEqual(whc.validateTokenDetails(token), null, 'Should not be null:');
        });

        it('#validateBadToken-NoEventType', function () {

            var jsonValue = JSON.parse(token.node.value);
            jsonValue.eventType = "";
            token.node.value = JSON.stringify(jsonValue);

            chai.assert.equal(whc.validateTokenDetails(token), null, 'Should be null:');
        });
    });
});
