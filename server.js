/**
 * Created by yash on 4/18/2015.
 * */

var express = require('express');
var app =  express();
var Customer = require('./models/Customer');
var Ride = require('./models/Ride');
var bcrypt = require('bcrypt');
var jwt = require('jwt-simple');
var secretkey = 'yeshavantagiridhar';
var moment = require('moment');
var mtimezone = require('moment-timezone');
var JoinedRide = require('./models/JoinedRide');
var gcm = require('node-gcm');
var jsonwebtoken = require('jsonwebtoken');
var https = require('https');


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
 token:token from g+ or facebook
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
                res.json({failure:'failure',data:"User has already signed up with this email id using the profile: "+profileFromDB});
            }else{
                if(profile == 'facebook'){
                    https.get('https://graph.facebook.com/app?access_token='+req.body.token,function(response){

                        var body = '';
                        response.on('data',function(d){
                            body =body + d;
                        })
                        response.on('end',function(){
                            console.log('Completely received the data '+body);
                            var json = JSON.parse(body);
                            if(json.error === undefined){
                                if(json.name == 'foodpipe'){
                                    var objectToBeEncoded = {};
                                    objectToBeEncoded.name = customer.name;
                                    objectToBeEncoded.customerNumber = customer.customerNumber;
                                    objectToBeEncoded.email = customer.email;
                                    objectToBeEncoded.iss ='foodpipe.in';
                                    objectToBeEncoded.isMobile=1;
                                    var token = jwt.encode(objectToBeEncoded,secretkey);
                                    res.json({success:'success',token:token,data:customer});
                                }
                            }else{
                                res.json({failure:'failure',data:'Unable to authenticate with the given token provided from you with facebook'})
                            }
                        })
                    }).on('error',function(e){
                        console.log('The shitty problem is: '+e);
                    })

                }else if( profile == 'google'){

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
            }
        }else if(!customer){
            var customerNumber = getUniqueId(32);
            var newCustomer = new Customer({
                name:name,
                customerNumber:customerNumber,
                profile:profile,
                email:email,
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
        date:date,
		jrId:0
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
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var source = req.body.source;
    var dest = req.body.destination;
    var todayOrTomo = req.body.timeChoice;
    var tempmoment = moment().utcOffset("+05:30");
    var dateToday = tempmoment.format('YYYY-MM-DD');
    var nextDay = tempmoment.add(1,'d').format('YYYY-MM-DD');
    console.log('dateToday is: '+dateToday+' nextday is: '+nextDay);
    if(todayOrTomo === 'today'){
        Ride.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T00:00:00.000Z'},customerNumber:{'$ne':customerNumber},jrId:0,source:source,destination:dest},function(err,rides){
            if(err){
                res.json({failure:'Some error while retrieving the rides for today'});
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for today are: '+rides);
                JoinedRide.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T00:00:00.000Z'},source:source,destination:dest},function(err,jRides){
                    if(err){
                        console.log('Error happened when retrieving joined rides from database');
                        res.json({failure:'failure',message:''})
                    }
                    if(jRides.length > 0){
                        res.json({success:'success',rides:rides,jRides:jRides});
                    }else{
                        res.json({success:'success',rides:rides});
                    }
                });
            }
        })
    }else if(todayOrTomo === 'tomorrow'){
        Ride.find({date:{'$gte':nextDay+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'},customerNumber:{'$ne':customerNumber},jrId:0,source:source,destination:dest},function(err,rides){
            if(err){
                res.json({failure:'Some error while retrieving the rides for tomo'});
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for condition when todayOrTomo is equal to tomorrow')
                JoinedRide.find({date:{'$gte':nextDay+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'},source:source,destination:dest},function(err,jRides){
                    if(err){
                        console.log('Error happened when retrieving joined rides from database');
                        res.json({failure:'failure',message:''})
                    } if(jRides.length > 0){
                        res.json({success:'success',rides:rides,jRides:jRides});
                    }else{
                        res.json({success:'success',rides:rides});
                    }
                });
            }
        })
    }else if(todayOrTomo === 'both'){
        Ride.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'},customerNumber:{'$ne':customerNumber},jrId:0,source:source,destination:dest},function(err,rides){
            if(err){
                res.json({failure:'Some error while retrieving the rides for both today and tomo'});
                console.log('Some error while retrieving the rides for this day');
            }else if(rides){
                console.log('Rides are successfully being returned for condition when todayOrTomo is equal to both')
                JoinedRide.find({date:{'$gte':dateToday+'T00:00:00.000Z','$lt':nextDay+'T23:59:59.000Z'},source:source,destination:dest},function(err,jRides){
                    if(err){
                        console.log('Error happened when retrieving joined rides from database');
                        res.json({failure:'failure',message:''})
                    } if(jRides.length > 0){
                        res.json({success:'success',rides:rides,jRides:jRides});
                    }else{
                        res.json({success:'success',rides:rides});
                    }
                });
            }
        })
    }else{
        console.log('todayOrTomo did not match with any of the existing criteria')
        res.json({failure:'todayOrTomo did not match with any of the existing criteria'});
    }
})

/*
Just send the X-Auth header nothing else is required
returns the rides for today and tomo which are yet to happen
*/
app.post('/getMyRides',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    console.log('Received request to return the get Rides');
    var tempmoment = moment().utcOffset("+05:30");
    var currentDate = tempmoment.format('YYYY-MM-DD');
    var currentTime = tempmoment.format('HH:mm:ss');
    var currentDateTimeString = currentDate+'T'+currentTime+'.000Z';
    console.log('CurrentdateTimeString is: '+currentDateTimeString);
    var nextDayDate = tempmoment.add(1,'d').format('YYYY-MM-DD');
    Ride.find({date:{'$gte':currentDateTimeString,'$lt':nextDayDate+'T23:59:59.000Z'},jrId:0,customerNumber:customerNumber},function(err,rides){
       if(err){
           console.log('There was an error while retrieving rides from database');
           res.sendStatus(500);
       } else if(rides.length > 0){
           JoinedRide.find({date:{'$gte':currentDateTimeString,'$lt':nextDayDate+'T23:59:59.000Z'},customerNumber:customerNumber},function(err,jrides){
               if(err){
                   console.log('there was an error while fetching joined rides from database');
                   res.sendStatus(500);
               } else if(jrides.length > 0){
                    res.json({rides:rides,joinedRides:jrides});
               } else if (jrides.length === 0){
                   res.json({rides:rides});
               }
           })
       } else if (rides.length === 0){
           JoinedRide.find({date:{'$gte':currentDateTimeString,'$lt':nextDayDate+'T23:59:59.000Z'},customerNumber:customerNumber},function(err,jrides){
               if(err){
                   console.log('there was an error while fectching joined rides from database');
                   res.sendStatus(500);
               } else if(jrides.length > 0){
                   res.json({joinedRides:jrides});
               } else if (jrides.length === 0){
                   res.json({message:'currently u do not have any rides posted for today or tomo'});
               }
           })
       }
    })
})

app.post('/removeAllCustomers',function(req,res,next){
    Customer.remove({},function(err, numberofdocsremoved){
        if(err){
            console.log('error occured while removing a customer from DB');
            res.sendStatus(500);
        }
        else {
            console.log('Number of customer deleted are '+numberofdocsremoved);
            res.sendStatus(200);
        }
    });
})

/*
{
	rideId:rideId(This can be a ride ID or a joined Ride id the one that the requester sees in the search results.
	rideFlag: This flag is to tell whether the above ID is a rideId or a jrId (ride/jride)
	ownerCustomerNumber: The customerNumber of the owner of the ride
	requestingCustomerNumber: The requesting customer's customerNUmber
	rRideId:The ride Id of the ride of which the customer is sending the request
}
*/
app.post('/sendRequestToJoinTheRideOrJoinedRide',function(req,res,next){
    var ownerCustomerNumber = req.body.ownerCustomerNumber;
    //Ideally this will come from the token, but for now take it as if its coming from request
    var requestingCustomerNumber = req.body.requestingCustomerNumber;
    // The ride ID can be that of joined ride or normal ride, we shall have a flag
    var rideId = req.body.rideId;
    var rideFlag = req.body.rideFlag;
    var requestersRideId = req.body.rRideId;
    //Send a notification to the owner who has posted the ride
    Customer.find({customerNumber:{'$in':[ownerCustomerNumber,requestingCustomerNumber]}},function(err,customers){
        var requester = {};
        var owner = {};
        var requestersRide = {};
        if(err){
            console.log('Some error happened when the customers were being queried')
            res.sendStatus(500);
        } else if(customers.length > 0){
            if(customers[0].customerNumber == requestingCustomerNumber){
                requester = customers[0];
                owner = customers[1];
            }else if(customers[0].customerNumber == ownerCustomerNumber){
                requester = customers[1];
                owner = customers[0];
            }else{
                console.log('Some shit happened when the customers were being queried')
                res.sendStatus(500);
            }
			console.log('about to make the ride call to db');
            Ride.findOne({rideId:requestersRideId},function(err,rRide){
                if(err){
                    res.sendStatus(500);
                    console.log('Shit happened while retrieving the requesters ride ride from DB');
                }
                if(rRide!==null){
                    requestersRide = rRide;
                    if(rideFlag === 'jride'){
                        JoinedRide.findOne({jrId:rideId},function(err,joinedRide){
                            if(err){
                                res.sendStatus(500);
                            }else if(joinedRide != null){
                                var regId = owner.gcmRegId;
                                requester.id=null;
                                requester.password=null;
                                var message = new gcm.Message({
                                    collapseKey: 'demo',
                                    delayWhileIdle: true,
                                    timeToLive: 3,
                                    data: {
                                        NotificationType: 'request to join the ride',
                                        requestingCustomer: requester,
                                        requestersRide:requestersRide,
                                        ownersrideid:rideId,
                                        rideFlag:rideFlag
                                    }
                                });
                                var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                                var registrationIds = [];
                                registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                                //registrationIds.push(regId);
                                sender.send(message,registrationIds,2,function(err,result){
                                    if(err){
                                        console.error(err);
                                    }
                                    else{
                                        console.log(result);
                                        res.json({message:'Yaay, he should have received a message by now'})
                                    }
                                })
                            }
                        })
                    }else if(rideFlag === 'ride'){
                        Ride.findOne({rideId:rideId},function(err,ride){
                            if(err){
                                res.sendStatus(500);
                            }else if(ride!==null || ride !== undefined){
                                var regId = owner.gcmRegId;
                                requester.id=null;
                                requester.password=null;
                                var message = new gcm.Message({
                                    collapseKey: 'demo',
                                    delayWhileIdle: true,
                                    timeToLive: 3,
                                    data: {
                                        NotificationType: 'request to join the ride',
                                        requestingCustomer: requester,
                                        requestersRide:requestersRide,
                                        ownersrideid:rideId,
                                        rideFlag:rideFlag
                                    }
                                });
                                var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                                var registrationIds = [];
                                registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                                //registrationIds.push(regId);
                                sender.send(message,registrationIds,2,function(err,result){
                                    if(err){
                                        console.error(err);
                                    }
                                    else{
                                        console.log(result);
                                        res.json({message:'Yaay, he should have received a message by now'})
                                    }
                                })
                            }

                        })
                    }
                }else{
                    res.json({failure:'failure',message:'there are multiple rides with same ride ID which is wrong'});
                    console.log('there are multiple rides with same ride ID which is wrong');
                }
            })
        }
    })
})




/*
Here the owner of the ride is accepting the request made by a random requester
Steps involved are
1. If a joined ride already exists, the requester is added to the joined ride
2. If the joined ride does not exist, a new joined Ride is created
3. The requester is updated that the owner has accepted his request to join the ride
{
    rideId:rideId of the owner's ride
    rideFlag:whether this ride is a ride or joinedride
    requestingCustomerNumber: requesting customer number
    status:accept/reject
}
 */
app.post('/acceptOrRejectTheRequestToJoin',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var ownerCustomerNumber = decodedToken.customerNumber;
    var rideId = req.body.rideId;
    var rideFlag = req.body.rideFlag;
    var requesterCustomerNumber = req.body.requestingCustomerNumber;
    var status = req.body.status;
    var owner = {};
    var requester = {};
    if(status === 'accept'){
        Customer.find({customerNumber:{'$in':[ownerCustomerNumber,requesterCustomerNumber]}},function(err,customers){
            if(err){
                console.log('Some shit happened while retrieving the customers from the database');
                res.sendStatus(500);
            }else if(customers.length > 0){
                if(customers[0].customerNumber == ownerCustomerNumber){
                    owner = customers[0];
                    requester = customers[1];
                }else if(customers[1].customerNumber == ownerCustomerNumber){
                    owner = customers[1];
                    requester = customers[0];
                }

                if(rideFlag == 'ride'){
                    // create a new jride with necessary details
                    var jrId = getUniqueId(32);
                    var partners = [];
                    var partner = {};
                    partner.customerNumber = requester.customerNumber;
                    partner.gcmId = requester.gcmId;
                    partners.push(partner);
                    var ownerDetails = {};
                    ownerDetails.customerNumber = owner.customerNumber;
                    ownerDetails.gcmId = owner.gcmId;
                    partners.push(ownerDetails);
                    var joinedRide = new JoinedRide({
                        ownerCustomerNumber:ownerDetails,
                        jrId:jrId,
                        counter:0,
                        status:'NotStarted',
                        partners:partners,
                        originalRideId:rideId,
                        distanceMatrix:null
                    });

                    joinedRide.save(function(err,jride){
                        if(err){
                            res.sendStatus(500);
                            console.log('Some error while saving the jride')
                        }else if(jride !== null || jride !==undefined){
                            // jrideId in the field of the ride must be updated
                            var regId = requester.gcmRegId;
                            var message = new gcm.Message({
                                collapseKey: 'demo',
                                delayWhileIdle: true,
                                timeToLive: 3,
                                data: {
                                    NotificationType: 'request to join the ride is accepted by owner',
                                    message:'The owner has accepted your request to join'
                                }
                            });

                            Ride.update({rideId:rideId},{jrId:jrId},function(err,numberOfAffected,raw){
                                if(err){
                                    console.log('error while updating the ride with a new jrId');
                                    res.json(500);
                                }else if(numberOfAffected != 0){
                                    var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                                    var registrationIds = [];
                                    registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                                    //registrationIds.push(regId);
                                    sender.send(message,registrationIds,2,function(err,result){
                                        if(err){
                                            console.error(err);
                                        }
                                        else{
                                            console.log(result);
                                            res.json({message:'Yaay, he should have received a message by now'})
                                        }
                                    })
                                }
                            });
                        }
                    })
                }else if(rideFlag == 'jride'){
                    // use the ride id to open a jride and just update the contents
                    var partner = {};
                    partner.customerNumber = requester.customerNumber;
                    partner.gcmId = requester.gcmId;
                    JoinedRide.update({jrId:rideId},{"$push":{partners:partner}},function(err,numberAffected,raw){
                        if(err){
                            console.log('There was a shit error while updating the jride from the database');
                            res.json(500);
                        } else if(numberAffected != 0){
                            res.json({success:'The joined Ride is updated successfully'});
                        }
                    });
                }else{
                    res.json({message:'you have sent the rideFlad wrong, the value u sent does not match with any of the existing values'});
                    console.log('you have sent the rideFlad wrong, the value u sent does not match with any of the existing values')
                }
            }
        })
    }else{
            Customer.findOne({customerNumber:requesterCustomerNumber},function(err, customer){
                if(err){
                    console.log('There was an error while retrieving the customer from Db: '+err);
                    res.sendStatus(500);
                }else if (customer.lenth > 0){
                    var message = new gcm.Message({
                        collapseKey: 'demo',
                        delayWhileIdle: true,
                        timeToLive: 3,
                        data: {
                            NotificationType: 'reject the request to join the ride',
                            rideid:rideId,
                            rideFlag:rideFlag,
                            message:'The owner of this ride has rejected your request to join the ride'
                        }
                    });
                    var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                    var registrationIds = [];
                    registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                    //registrationIds.push(regId);
                    sender.send(message,registrationIds,2,function(err,result){
                        if(err){
                            console.error(err);
                        }
                        else{
                            console.log(result);
                            res.json({message:'Yaay, he should have received a message by now'})
                        }
                    })
                }
            })
    }

})

/*
{
 jrId:joined ride id
}

 */
app.post('/startRide',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumberFromToken = decodedToken.customerNumber;

    var joinedRideId = req.body.jrId;
    JoinedRide.findOne({jrId:joinedRideId},function(err,joinedRide){
        if(err){
            console.log('There was an error while retrieving the joined ride from the database');
            res.sendStatus(500);
        }else if(joinedRide!=null){
            var counter = joinedRide.counter;
            counter = counter +1;
            JoinedRide.update({jrId:joinedRideId},{counter:counter,status:'started'},function(err,numberAffected){
                if(err){
                    console.log('Some shit happened while updating the joined ride');
                    res.sendStatus(500);
                }else if(numberAffected > 0){
                    console.log('The number affected while updating the counter for the joined ride is '+numberAffected);
                    if(counter > 1){
                        /*
                            I have to send notifications to all the members to send the distances travelled so far,
                            so that i can add it to my measuring algorithm.
                            if counter >1, it means that this request to start ride is being sent by person who is
                            not the not the first one, so in this case, we have measure the distance travelled so far
                            and update the hashmap called DistanceMatrix, so that we can keep track of commonly travelled
                            kms.
                         */
                        //var partners = [];
                        var registrationIds = [];
                        var partners = joinedRide.partners;
                        for(var index=0;index<partners.length;index++){
                            var partner = partners[index];
                            registrationIds.push(partner.gcmId);
                        }

                        var message = new gcm.Message({
                            collapseKey: 'demo',
                            delayWhileIdle: true,
                            timeToLive: 3,
                            data: {
                                NotificationType: 'DistanceTravelled',
                                rideid:joinedRideId,
                                message:'post the distance travelled so far'
                            }
                        });
                        var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                        //registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                        //registrationIds.push(regId);
                        sender.send(message,registrationIds,2,function(err,result){
                            if(err){
                                console.error(err);
                            }
                            else{
                                console.log(result);
                                res.json({message:'Yaay, he should have received a message by now'})
                            }
                        })
                    }else{
                        res.json({message:'the ride is started'})
                    }
                }
            })
        }
    })
});

/*
{
 jrId:joined ride id
 distanceTravelled:distance travelled in kilometres.
}
 */
app.post('/updateDistanceTravelled',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var joinedRideId = req.body.jrId;
    var distanceTravelled = req.body.distanceTravelled;
    JoinedRide.findOne({jrId:joinedRideId},function(err,joinedRide){
        if(err){
            console.log('There was an error while retrieving the joined ride from the database for updateDistanceTravelled');
            res.sendStatus(500);
        }else if(joinedRide != null){
            var distanceMatrix = joinedRide.distanceMatrix;
            var counter = joinedRide.counter - 1;
            if(distanceMatrix == null) {
                distanceMatrix = {};
            }
            if(distanceMatrix[customerNumber] == undefined){
                distanceMatrix[customerNumber] = [];
            }
            var distanceObject = {};
            distanceObject.distance = distanceTravelled;
            distanceObject.partnerCount = counter;
            distanceMatrix[customerNumber].push(distanceObject);
            JoinedRide.update({jrId:joinedRideId},{distanceMatrix:distanceMatrix},function(err,numberAffected,raw){
                if(err){
                    console.log('There was a problem while updating the distance matrix in a joined ride');
                    res.sendStatus(500);
                }else if (numberAffected != 0){
                    console.log('The number of rows affected while updating the distanceMatrix: '+numberAffected);
                    res.json({message:'The data matrix is successfully updated'});
                }
            })
        }
    })
})

app.post('/endRide',function(req,res,next){

})
