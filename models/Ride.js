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
    date:Date,
    status:{type:String,default:'notstarted'},
    jrId:Number,
    latlong:String,
    requestMatrix:{type:Object,default:{}},
    gender:String,
    requests:Array,
    sourceLat:Number,
    sourceLng:Number,
    destinationLat:Number,
    destinationLng:Number,
    pickUpLat:Number,
    pickUpLng:Number,
    dropLat:Number,
    dropLng:Number,
    city:String,
    humanReadableNamesOfPickUpLatLng:String,
    humanReadableNamesOfDropLatLng:String,
    overview_polyline:String
});


module.exports = ride;