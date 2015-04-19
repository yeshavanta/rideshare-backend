/**
 * Created by yash on 4/18/2015.
 */

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/ridesharedatabase',function(){
    console.log('Connected to the database');
});

module.exports = mongoose;