'use strict';

var express = require('express');
var router = express.Router();

//router.use('/config/task', require('./tasks-config'));
router.use('/wh', require('./webhook-controller'));

//playground

module.exports = router;
