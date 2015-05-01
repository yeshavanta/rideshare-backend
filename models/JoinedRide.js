/**
 * Created by yash on 4/30/2015.
 */

var db = require('../db');

var joinedRide = db.model('joinedRide',{
    jrId:Number,
    customers:Array,
    counter:Number
});

module.exports = joinedRide;
