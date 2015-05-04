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
var JoinedRide = require('./models/JoinedRide');
var gcm = require('node-gcm');
var jsonwebtoken = require('jsonwebtoken');

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

function ensureAuthorized(req,res,next){
    var encodedAuthToken = req.header('X-Auth');
    var decodedToken = jwt.decode(encodedAuthToken,secretkey);
    var customerNumber = decodedToken.customerNumber;

    Customer.findOne(function(err,customer){
        if(err){
            res.json({failure:'Custmer does not exist please sign up'});
            console.log('Customer with customer number '+customerNumber+' does not exist');
        }else if(customer){
            next();
        }
    })
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
 gcmId:send the gcmId once u obtain it from google, this is a one time thing, and
 should send it when u are signing up
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
                        res.json({failure:'The user does not exist, please signup'});
                    }
                    else if(!valid){
                        res.json({failure:'The Username or password is not valid'});
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
                userid:req.body.userid,
                gcmId:req.body.gcmId
            });
            bcrypt.hash(req.body.password,10,function(err,hash){
                newCustomer.password = hash;
                newCustomer.save(function(err,customer){
                    if(err){
                        console.log('Error while saving the new customer to DB');
                        res.json({failure:'Error while saving the new customer to DB'});
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
app.post('/postRide',ensureAuthorized,function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var rideId = getUniqueId(32);
    var dateString = req.body.date;
    dateString = dateString+'T'+req.body.time+'.000Z';
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

    Ride.find({
            customerNumber:customerNumber,
            source:source,
            destination:destination,
            phoneNumber:phoneNumber,
            date:date
        },function(err,rides){
        if(rides.length > 0){
            res.json({failure:'The ride already exists'});
            console.log('The ride already exists');
        }else if(rides.length == 0){
            ride.save(function(err,ride){
                if(err){
                    res.json({failure:'Error while saving the ride to DB'});
                }else if(ride){
                    console.log('The ride is successfully posted');
                    res.json({success:'The ride is successfully posted'});
                }
            });
        }else if (err){
            res.json({failure:'Error while checking if the same ride exists'});
            console.log('There was an error while accessing the Database');
        }
    })
})

/*
 {
 "timeChoice":"both/today/tomorrow",
 "source":"kormangala",
 "destination":"hassan"
 }
*/
app.post('/getRides',ensureAuthorized,function(req,res,next){
    var source = req.body.source;
    var dest = req.body.destination;
    var todayOrTomo = req.body.timeChoice;
    var dateToday = moment().format('YYYY-MM-DD');
    var nextDay = moment().add(1,'d').format('YYYY-MM-DD');
    if(todayOrTomo === 'today'){
        Ride.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T00:00:00.000Z'}},function(err,rides){
            if(err){
                res.json({failure:'Some error while retrieving the rides for today'});
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned')
                res.json({success:'success',rides:rides});
            }
        })
    }else if(todayOrTomo === 'tomorrow'){
        Ride.find({date:{'$gte':nextDay+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'}},function(err,rides){
            if(err){
                res.json({failure:'Some error while retrieving the rides for tomo'});
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for condition when todayOrTomo is equal to tomorrow')
                res.json({success:'success',rides:rides});
            }
        })
    }else if(todayOrTomo === 'both'){
        Ride.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'}},function(err,rides){
            if(err){
                res.json({failure:'Some error while retrieving the rides for both today and tomo'});
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for condition when todayOrTomo is equal to both')
                res.json({success:'success',rides:rides});
            }
        })
    }else{
        console.log('todayOrTomo did not match with any of the existing criteria')
        res.json({failure:'todayOrTomo did not match with any of the existing criteria'});
    }
})

/*
This api must be called when you are creating the ride
customers:Array of customers
 */
app.post('/createJoinedRide',function(req,res,next){
    var jrId = getUniqueId(32);
    var customers = req.body.customers;
    var joinedRide = new JoinedRide({
        jrId:jrId,
        customers:customers,
        counter:0
    });

    joinedRide.save(function(err,joinedride){
        if(err){
            res.sendStatus(500);
            console.log('Error in saving the joined ride, please try again later');
        }else if(joinedride){
            console.log('Successfully saved the joined ride, now returning the id')
            res.json({joinedRideId:jrId});
            /*
            must send the notifications to all the people who are in the customers list,
            that you are invited to join this ride and can press on start when they are
            about to start the journey
             */
        }
    })
})

/*
requestingCustomer:requesting customer id
targetCustomer:target customer ID
jrId:may or may not exist
 */
app.post('/requestCustomerToJoinedRide',function(req,res,next){
    var requestingCustomer = req.body.requestingCustomer;
    var targetCustomer = req.body.targetCustomer;
    if(req.body.jrId === undefined){
        var jrId = getUniqueId(32);
        var customers = [];
        customers.push(requestingCustomer);
        var joinedRide = new JoinedRide({
            jrId:jrId,
            customers:customers,
            counter:0
        });

        joinedRide.save(function(err,joinedride){
            if(err){
                res.sendStatus(500);
                console.log('Error in saving the joined ride, please try again later');
            }else if(joinedride){
                console.log('Successfully saved the joined ride, now returning the id')
                res.json({joinedRideId:jrId});
                /*
                 must send the notifications to all the people who are in the customers list,
                 that you are invited to join this ride and can press on start when they are
                 about to start the journey
                 */
            }
        })
    }
})

/*
jrId:jrId
status:yes/no,
requestingCustomer:customerNumber
 */
app.post('/acceptTheJoinedRide',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    if(status === 'yes'){
        //I have to send notification to the users, and update the ride
        JoinedRide.update({jrId:req.body.jrId},{"$push":{customers:customerNumber}},function(err,numberAffected,raw){
            if(err){
                console.log('Error while updating the main order',err);
                res.sendStatus(500)
            }else if(numberAffected != 0){
                console.log('The number of rows affected are ',numberAffected);
                res.sendStatus(200);
            }
        })
    }
    else if(status === 'No'){
        // I have to send notification to the requesting customer that this person has refused your request
        var regId = req.body.gcmRegId;
        var message = new gcm.Message({
            collapseKey: 'demo',
            delayWhileIdle: true,
            timeToLive: 3,
            data: {
                messageKey: 'Sorry the user has denied your ride'
            }
        });
        var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
        var registrationIds = [];
        registrationIds.push(regId);
        sender.send(message,registrationIds,2,function(err,result){
            if(err) console.error(err);
            else    console.log(result);
        })
    }
})

app.post('/generateToken',function(req,res,next){
    var token = jsonwebtoken.sign({foo:'bar'},'shhhhhh');
    res.json({token:token});
})

app.post('/verify',function(req,res,next){
    console.log('received the request to verify token');
    var token = req.body.token;
    console.log('obtained the token: '+token);
    jsonwebtoken.verify(token,'shhhhhh',function(err,decoded){
        if(err){

        };
        if(decoded){
           res.json({data:decoded});
        }
    });
})