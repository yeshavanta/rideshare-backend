/**
 * Created by yash on 4/18/2015.
 */

var db = require('../db');

var customer = db.model({
    customerNumber:Number,
    email:String,
    profile:String,
    password:String
});

module.exports = customer;