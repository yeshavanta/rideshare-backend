/**
 * Created by yash on 4/18/2015.
 */


var mongoose = require('mongoose');

var url = process.env.MONGOLAB_URI || 'mongodb://localhost/ridesharedatabase';
mongoose.connect(url);
module.exports = mongoose;