/**
 * Created by yash on 4/18/2015.
 */


var mongoose = require('mongoose');

//var url = process.env.MONGOLAB_URI || 'mongodb://localhost/ridesharedatabase'; ec2-52-76-63-147.ap-southeast-1.compute.amazonaws.com
var url = 'mongodb://yeshridesharedatabase:rasenganridesharedatabase@ec2-52-76-63-147.ap-southeast-1.compute.amazonaws.com:27017/ridesharedatabase';
mongoose.connect(url,function(err){
    if(err){
        console.log('Error while connecting to MongoDB: '+err);
    }else{
        console.log('Yaay connected to MongoDB: ');
    }
});
module.exports = mongoose;