/**
 * Created by yash on 4/18/2015.
 */

var db = require('../db');

var customer = db.model('Customer',{
    customerNumber:Number,
    email:String,
    profile:String,
    password:String,
    gcmId:String,
    name:String
});

module.exports = customer;