/**
 * Created by yash on 4/30/2015.
 */

var db = require('../db');

var joinedRide = db.model('joinedRide',{
    owner:Number,
    jrId:Number,
    customers:Array,
    counter:Number,
    partners:Array,
    status:String
});


module.exports = joinedRide;
