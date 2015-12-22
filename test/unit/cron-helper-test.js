'use strict';

var chai = require('chai');
var assert = chai.assert;

var cronHelper = require('../../helpers/cron-helper');

describe('cron-helper tests', function(){

    describe('#getNextOccurrence', function(){
        it('getNextOccurrence', function(){
            var foo = cronHelper.getNextOccurrence('* */1 * * *', 300);
            assert.isTrue(foo instanceof Date, 'Returned object is a Date');
        });
        it('noNextOccurrence', function(){
            var foo = cronHelper.getNextOccurrence('*/58 */23 */11 * Sat', 60);
            assert.isNull(foo, 'It should be null in 99.999% of executions; you are really lucky, if this test failed')
        });
    });

});
