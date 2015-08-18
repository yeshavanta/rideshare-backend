/**
 * Created by ykp on 8/18/15.
 */
var db = require('../db.js');

var uberModel = db.model('UberModel',{
    city:String,
    baseFare:Number,
    farePerKm:Number,
    farePerMinute:Number,
    carModel:String
});

module.exports = uberModel;
