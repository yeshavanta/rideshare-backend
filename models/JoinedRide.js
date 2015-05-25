/**
 * Created by yash on 4/30/2015.
 */
/*
The partners is an array of the customers,
it will have customer objects with their profiles
 */
var db = require('../db');

var joinedRide = db.model('joinedRide',{
    ownerCustomerNumber:Object,
    jrId:Number,
    counter:Number,
    partners:Array,
    status:String,
    originalRideId:Number
});


module.exports = joinedRide;
