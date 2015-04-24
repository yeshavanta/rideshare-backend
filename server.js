/**
 * Created by yash on 4/18/2015.
 */

var express = require('express');
var app =  express();
var Customer = require('./models/Customer');
var Ride = require('./models/Ride');
var bcrypt = require('bcrypt');
var jwt = require('jwt-simple');
var secretkey = 'yeshavantagiridhar';
var moment = require('moment');

app.use(require('body-parser').json());
app.use(function(req,res,next){
    res.setHeader('Access-Control-Allow-Origin','*');
    //res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Methods','GET','POST');
    res.setHeader('Access-Control-Allow-Headers','X-Requested-With,Content-Type,Authorization,X-Auth');
    next();
});
app.use(express.static(__dirname + '/public'));

app.listen( process.env.PORT || 3000,function(){
   console.log('Listening to server on port 3000');
});

/*
 This function generates unique numbers, and returns 16,32,64,128 bit numbers
 based on the argument passed
 */
function getUniqueId(bits){

    if(bits == 16 || bits == 32 || bits == 64){
        var number = Date.now();
        number = number & 0xffffffff;
        if(number < 0){
            number = number * -1;
        }
        return number;
    }else{
        var number = intformat(flakeidgen.next(),'dec');
        return number;
    }
}
/*
 returns decoded token by extracting the token from header
 */
function getDecodedXAuthTokenFromHeader(req){
    var encodedXAuthToken = req.header('X-Auth');
    var decodedXAuthToken = jwt.decode(encodedXAuthToken,secretkey);
    return decodedXAuthToken;
}

/*
All URLs start from this part of the page
 */

app.get('/',function(req,res,next){
    res.sendfile('index.html')
});

/*
{
 name:name,
 email:email,
 profile:(local/facebook/google),
 password:password
}
 */
app.post('/signuplogin',function(req,res,next){
    var name = req.body.name;
    var email = req.body.email;
    var profile = req.body.profile;

    Customer.findOne({email:email},function(err,customer){
        if(err){
            console.log('Error while retrieving the customer from the DB, in registerCustomer function');
            res.sendStatus(500);
        }else if(customer){
            var profileFromDB = customer.profile;
            if(profileFromDB !== profile){
                res.json({data:"User has already signed up with this email id using the profile: "+profileFromDB});
            }else{
                bcrypt.compare(req.body.password,customer.password,function(err,valid){
                    if(err){
                        res.json({data:'The user does not exist, please signup'});
                    }
                    else if(!valid){
                        res.json({data:'The Username or password is not valid'});
                    }else{
                        console.log('About to send the information back to customer');
                        var objectToBeEncoded = {};
                        objectToBeEncoded.name = customer.name;
                        objectToBeEncoded.customerNumber = customer.customerNumber;
                        objectToBeEncoded.email = customer.email;
                        objectToBeEncoded.iss ='foodpipe.in';
                        objectToBeEncoded.isMobile=1;
                        var token = jwt.encode(objectToBeEncoded,secretkey);
                        res.json({token:token,data:customer});
                    }
                });
            }
        }else if(!customer){
            var customerNumber = getUniqueId(32);
            var newCustomer = new Customer({
                name:name,
                customerNumber:customerNumber,
                profile:profile,
                email:email,
                userid:req.body.userid
            });
            bcrypt.hash(req.body.password,10,function(err,hash){
                newCustomer.password = hash;
                newCustomer.save(function(err,customer){
                    if(err){
                        console.log('Error while saving the new customer to DB');
                        res.sendStatus(500);
                    }else{
                        var objectToBeEncoded = {};
                        objectToBeEncoded.name = name;
                        objectToBeEncoded.customerNumber = customerNumber;
                        objectToBeEncoded.email = email;
                        objectToBeEncoded.iss ='foodpipe.in';
                        objectToBeEncoded.exp =Date.now()+86400000;
                        objectToBeEncoded.isMobile=1;
                        console.log('A Customer has been created with the following customer ID ',customerNumber);
                        var token = jwt.encode(objectToBeEncoded,secretkey);
                        res.json({token:token,data:customer});
                    }
                })
            });
        }else{
            res.json({data:'The email address is already registered'});
        }
    })
});
/*
Format of the date is YYYY-MM-DDTHH:MM:SS.000Z

 db.rides.find({date:{'$gte':ISODate('2015-05-05T16:00:00.000Z'),'$lt':ISODate('2015-05-24T18:00:00.000Z')}})

 {
 source:String,
 destination:String,
 phoneNumber:String,
 date:Date in the format of YYYY-MM-DD
 time: time in the format of HH:MM:SS
 }
 */
app.post('/postRide',function(req,res,next){
    //var decodedToken = getDecodedXAuthTokenFromHeader(req);
    //var customerNumber = decodedToken.customerNumber;
    var customerNumber = 324506059;
    var rideId = getUniqueId(32);
    var dateString = req.body.date;
    dateString = dateString+'T'+req.body.time+'.000Z';
    //var date = new Date('2015-04-22T12:42:00.000Z');
    var date = new Date(dateString);

    var source = req.body.source;
    var destination = req.body.destination;
    var phoneNumber = req.body.phoneNumber;

    var ride = new Ride({
        customerNumber:customerNumber,
        rideId:rideId,
        source:source,
        destination:destination,
        phoneNumber:phoneNumber,
        date:date
    });

    ride.save(function(err,ride){
        if(err){
            res.sendStatus(500);
        }else if(ride){
            console.log('The ride is successfully posted');
            res.sendStatus(200);
        }
    });

})
/*
 {
 "timeChoice":"both/today/tomorrow",
 "source":"kormangala",
 "destination":"hassan"
 }
 */

app.post('/getRides',function(req,res,next){
    var source = req.body.source;
    var dest = req.body.destination;
    var todayOrTomo = req.body.timeChoice;
    var dateToday = moment().format('YYYY-MM-DD');
    var nextDay = moment().add(1,'d').format('YYYY-MM-DD');
    if(todayOrTomo === 'today'){
        Ride.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T00:00:00.000Z'}},function(err,rides){
            if(err){
                res.sendStatus(500);
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned')
                res.json({rides:rides});
            }
        })
    }else if(todayOrTomo === 'tomorrow'){
        Ride.find({date:{'$gte':nextDay+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'}},function(err,rides){
            if(err){
                res.sendStatus(500);
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for condition when todayOrTomo is equal to tomorrow')
                res.json({rides:rides});
            }
        })
    }else if(todayOrTomo === 'both'){
        Ride.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'}},function(err,rides){
            if(err){
                res.sendStatus(500);
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for condition when todayOrTomo is equal to both')
                res.json({rides:rides});
            }
        })
    }else{
        console.log('todayOrTomo did not match with any of the existing criteria')
        res.sendStatus(500);
    }
})