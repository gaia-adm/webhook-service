'use strict';

// convert provided scheduling to cron expression and vice versa


// every 5 minutes: */5 * * * *
// every 5 hours (at :00) : 0 */5 * * *
// every 5 days (at 00:00): 0 0 */5 * *
// on Sunday and Wednesday (at 00:00): 0 0 * * 0,3
// at 23:30 every day: 29 22 * * *


var parser = require('cron-parser');

/*

Create cron expression from input object
Input object format: {"minute":{"value":30,"every":false},"hour":{"value":2,"every":true}, "day":{"value":4,"every":true}, "month":{"value":4}, "dow":{"value":"Mon"}}
 - all sections (minute, hour, ...) are optional,
 - if section is not provided, it is set to '*' in cron expression
 - "every" is optional (repeat every 30 min - if true, run at xx:30 - if false)
 - if "every" provided, value mast be provided too; otherwise it is set to '*'
 TODO - boris: refining required in the future
*/
function createCronExpression(obj) {
    var cronExpression = '';
    cronExpression += createPartOfCron(obj.minute);
    cronExpression += createPartOfCron(obj.hour);
    cronExpression += createPartOfCron(obj.day);
    cronExpression += createPartOfCron(obj.month);
    cronExpression += createPartOfCron(obj.dow);
    return cronExpression.trim();
}
function createPartOfCron(part) {
    var partOfExpression = '';
    if (part && part.every && part.value) {
        partOfExpression += '*/';
    }
    if (part && part.value) {
        partOfExpression += part.value;
    } else {
        partOfExpression += '*';
    }
    partOfExpression += ' ';
    return partOfExpression;
}

/*
 Get the next occurrence for the given cron expression in the given time range
 Parameters:
 - cronExpr - cron expression
 - secondsBefore - time range start - shift from current time, in seconds.
 Note: time range end is always current time
 Returns: Date object representing the next execution time or null, if nothing found
 */
function getNextOccurrence(cronExpr, secondsBefore) {
    var now = Date.now();
    var options = {
        currentDate: new Date(now - secondsBefore * 1000),
        endDate: new Date(now),
        iterator: true
    };
    try {
        var interval = parser.parseExpression(cronExpr, options);
        return interval.next().value;
    } catch (err) {
        console.log('Error: ' + err.message);
    }
    return null;
}

//test

//var expr = '*/30 */2 * * *';
/*var options = {
 currentDate: new Date(Date.now()-300000),
 endDate: new Date(Date.now()+ 300000),
 iterator: true
 }
 try {
 var interval = parser.parseExpression(expr, options);
 while (true) {
 try {
 var obj = interval.next();
 console.log('value:', obj.value.toString(), 'done:', obj.done);
 } catch (e) {
 break;
 }
 }
 } catch (err){
 console.log('Error: ' + err.message);
 }*/


exports.createCronExpression = createCronExpression;
exports.getNextOccurrence = getNextOccurrence;