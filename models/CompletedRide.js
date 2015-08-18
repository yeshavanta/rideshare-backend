/**
 * Created by ykp on 8/18/15.
 */
var db = require('../db');

var completedRide = db.model('CompletedRide',{
    rideId:Number,
    jrId:Number,
    someMatrix:Array,
    rideStartedAt:String,
    rideEndedAt:String,
    baseFare:Number,
    fareForDistanceTravelled:Number,
    fareForTimeSpent:Number,
    totalFare:Number,
    customerNumber:Number,
    uniqueId:Number,
    endDate:Date
})

module.exports = completedRide;
