/**
 * Created by yash on 4/30/2015.
 */
/*
The partners is an array of the customers,
it will have customer objects with their profiles
 */
var db = require('../db');

var joinedRide = db.model('joinedRide',{
    ownerCustomerNumber:Number,
    jrId:Number,
    counter:Number, // change couter only wen someone starts the ride or ends the ride, not when someone joins or exits the ride
    partners:Array,
    status:{type:String,default:'notstarted'},
    originalRideId:Number,
    distanceMatrix:Object,
    source:String,
    destination:String,
    date:Date,
    requestMatrix:{type:Object,default:{}},
    requests:Array,
    acceptedRideIds:Array,
    statusMatrix:Object,
    city:String,
    serviceProvider:{type:String,default:null},
    customersInTheCurrentLeg:{type:Array,default:[]},
    customersInThePreviousLeg:{type:Array,default:[]},
    pickUpLat:Number,
    pickUpLng:Number,
    dropLat:Number,
    dropLng:Number,
    phoneNumber:Number,
    customerNumberRideIdMap:{type:Object,default:null},
    overview_polyline:String
});




module.exports = joinedRide;

