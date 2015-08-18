/**
 * Created by yash on 4/18/2015.
 */


var mongoose = require('mongoose');

//var url = process.env.MONGOLAB_URI || 'mongodb://localhost/ridesharedatabase';
var url = 'mongodb://yeshridesharedatabase:rasenganridesharedatabase@ec2-52-74-203-31.ap-southeast-1.compute.amazonaws.com:27017/ridesharedatabase';
mongoose.connect(url);
module.exports = mongoose;