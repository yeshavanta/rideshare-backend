/**
 * Created by yash on 4/22/2015.
 */

var db = require('../db');

var ride = db.model('Ride',{
    customerNumber:Number,
    source:String,
    destination:String,
    phoneNumber:String,
    rideId:Number,
    date:Date
});

module.exports = ride;