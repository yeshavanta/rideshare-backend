/**
 * Created by ykp on 8/18/15.
 */
var db = require('../db.js');

var request = db.model('Request',{
    requestId:Number,
    requesterCustomerNumber:Number,
    ownercustomerNumber:Number,
    rideId:Number,
    rRideId:Number,
    status:String,
    jrId:{type:Number,default:0},
    date:Date,
    requesterSource:String,
    requesterDestination:String,
    requesterDate:Date
});

module.exports = request;

