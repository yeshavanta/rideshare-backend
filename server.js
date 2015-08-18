/**
 * Created by yash on 4/18/2015.
 * * */

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
var _ = require('lodash');
var https = require('https');
var Request = require('./models/Request');
var StackTrace = require('./models/StrackTrace');
var geolib = require('geolib');
var CompletedRide = require('./models/CompletedRide');
app.use(require('body-parser').json());
var UberModel = require('./models/UberModel');
var Q = require('q');
//var RouteBoxer = require('geojson.lib.routeboxer');
/*var Location = require('./models/location');*/
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

    Customer.findOne({customerNumber:customerNumber},function(err,customer){
        if(err){
            res.json({failure:'Custmer does not exist please sign up'});
            console.log('Customer with customer number '+customerNumber+' does not exist');
        }else if(customer != null){
            req.customer = customer;
            next();
        }
    })
}

/*function removeFromTheJoinedRide(jrId,customerNumberToBeRemoved,res){
 JoinedRide.findOne({jrId:jrId},function(err,joinedRide){
 if(err){
 console.log('There was an error while retrieving the joined ride from database in removeFromTheJoinedRide');
 res.sendStatus(500);
 }
 else if( joinedRide != null){
 var requestId;
 var partners = joinedRide.partners;
 var requestMatrix = joinedRide.requestMatrix;
 var originalRideId = joinedRide.originalRideId;
 if(partners.length > 2){
 var newPartners = _.remove(partners,function(partner){
 return partner.customerNumber !== parseInt(customerNumberToBeRemoved);
 });
 if(customerNumberToBeRemoved == joinedRide.ownerCustomerNumber){
 var newOwnerPartner = newPartners[0];
 var newOwnerCustomerNumber = newOwnerPartner.customerNumber;
 var newOwnerRideId = requestMatrix[newOwnerCustomerNumber].rRideId;
 Ride.findOne({rideId:newOwnerRideId},function(err,newOwnerRide){
 if(err){
 console.log(err);
 res.sendStatus(500);
 }else if(newOwnerRide != null){
 var newSource = newOwnerRide.source;
 var newDestination = newOwnerRide.destination;
 var newDate = newOwnerRide.date;
 var newOriginalRideId = newOwnerRide.rideId;
 var newRequestsArrayForRide = newOwnerRide.requests.concat(joinedRide.requests);
 Ride.update({rideId:newOwnerRideId},{"$set":{requests:newRequestsArrayForRide}},function(err,numberAffected,raw){
 if(err){
 console.log(err);
 res.sendStatus(500)
 }else if(numberAffected != null){
 JoinedRide.update({jrId:jrId},{"$set":{ownerCustomerNumber:newOwnerCustomerNumber,partners:newPartners,originalRideId:newOriginalRideId,source:newSource,destination:newDestination,date:newDate,requests:newRequestsArrayForRide,requestMatrix:requestMatrix}},function(err,numberAffected,raw){
 if(err){
 console.log(err);
 res.sendStatus(500);
 }else if(numberAffected != null){
 Ride.update({rideId:originalRideId},{"$set":{"status":"exited","jrId":0}},function(err,numberAffected,raw){
 if(err){
 console.log(err);
 res.sendStatus(500);
 }else if(numberAffected != null){
 res.json({success:"Yaay the customer is successfully removed"});
 }
 })

 }
 })
 }
 })
 }
 })
 }else{
 var requestObject = requestMatrix[customerNumberToBeRemoved];
 requestMatrix[customerNumberToBeRemoved] = null;
 requestId = requestObject.requestId;
 var rideToBeUpdated = requestObject.rideId;
 delete requestMatrix[customerNumberToBeRemoved];
 JoinedRide.update({jrId:jrId},{partners:newPartners,requestMatrix:requestMatrix},function(err,numberAffected,raw){
 if(err){
 console.log('There was an error while removing a joined ride from database');
 res.sendStatus(500);
 }else if(numberAffected != null){
 console.log('The number of records affected is '+numberAffected);
 Ride.update({rideId:rideToBeUpdated},{"$set":{jrId:0,"status":"removed"}},function(err,numberAffected,raw){
 if(err){
 console.log('There was an error while updating a ride from database');
 res.sendStatus(500);
 }else if(numberAffected != null) {
 Request.update({requestId:requestId},{"$set":{"status":"removed"}},function(err,numberAffected,raw){
 if(err){
 console.log(err);
 res.sendStatus(500);
 }else if(numberAffected != null){
 res.json({success: 'The customer is successfully removed'});
 console.log('The customer is successfully removed');
 }
 })

 }
 });
 }
 })
 }
 }else if(partners.length <=2){
 var requestMatrix = joinedRide.requestMatrix;
 var requestObject = requestMatrix[customerNumberToBeRemoved];
 var anotherRideId = requestObject.rRideId;
 JoinedRide.remove({jrId:jrId},function(err,numberAffected,raw){
 if(err){
 console.log('There was an error while removing a joined ride from database');
 res.sendStatus(500);
 }else if(numberAffected != null){
 Ride.update({"rideId":{'$in':[anotherRideId,originalRideId]}},{jrId:0},{"multi":true},function(err,numberAffected,raw){
 if(err){
 console.log('There was an error while removing a joined ride from database');
 res.sendStatus(500);
 }else if(numberAffected != null){
 Request.update({requestId:requestId},{"$set":{"status":"removed"}},function(err,numberAffected,raw){
 if(err){
 console.log(err);
 res.sendStatus(500);
 }else if(numberAffected != null){
 res.json({success: 'The partner is successfully removed'});
 console.log('The customer is successfully removed');
 }
 })
 }
 })
 }
 })
 }
 }
 })
 }*/

function sendMessage(message,registrationIds,res,jsonMessage){
    var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
    sender.send(message,registrationIds,2,function(err,result){
        if(err){
            console.error(err);
            res.json({failure:err})
        }
        else{
            console.log(result);
            res.json({success:jsonMessage});
        }
    })
}

function getSourceDestinationAndWaypoints(sourceDestinationObject,completeMatrix){
    var waypoints = [];
    var longestRoute = {};
    for(var index = 0 ;index < sourceDestinationObject.length;index++){
        var currentSourceDestinationObject = sourceDestinationObject[index];
        for(var completeMatrixIndex=0;completeMatrixIndex < completeMatrix.length;completeMatrixIndex++){
            var currentCompleteMatrixObject = completeMatrix[completeMatrixIndex];
            if( currentCompleteMatrixObject.source == currentSourceDestinationObject.source && currentCompleteMatrixObject.destination == currentSourceDestinationObject.destination){
                if(index == 0){
                    currentCompleteMatrixObject.distance =  sourceDestinationObject[index].distance;
                    longestRoute = currentCompleteMatrixObject;
                }else{
                    if( sourceDestinationObject[index].distance > longestRoute.distance){
                        longestRoute = null;
                        longestRoute = currentCompleteMatrixObject;
                        currentCompleteMatrixObject.distance =  sourceDestinationObject[index].distance;
                    }
                }
                waypoints.push(currentCompleteMatrixObject.humanReadableAddressOfPickUpPoint);
                waypoints.push(currentCompleteMatrixObject.humanReadableAddressOfDropPoint);
            }
        }
    }
    var waypoints_unique = _.uniq(waypoints);
    var waypoints_unique_withoutSourceDestination = _.remove(waypoints_unique,function(constituent){
        return (constituent != longestRoute.humanReadableAddressOfPickUpPoint || constituent != longestRoute.humanReadableAddressOfDropPoint);
    });
    return {source:longestRoute.humanReadableAddressOfPickUpPoint,destination:longestRoute.humanReadableAddressOfDropPoint,waypoints:waypoints_unique_withoutSourceDestination};
}

function getSharedPrice(priceCalculationMatrix,targetedCustomerNumber,serviceProvider,city){
    var deferred = Q.defer();
    var priceIncurred = 0;
    var timeSpent = 0;
    var distanceTravelled = 0;
    console.log('inside the getShared price function');
    UberModel.findOne({city:city,carModel:serviceProvider},function(err,uberModel){
        if(err){
            console.log(err);
            return err;
        }else if(uberModel != null){
            var sharedPartners = [];
            var baseFare = uberModel.baseFare;
            var farePerKm = uberModel.farePerKm;
            var farePerMinute = uberModel.farePerMinute;
            for(var index=0;index < priceCalculationMatrix.length;index++){
                console.log('in the price calculation matrix index: '+index);
                var currentLeg = priceCalculationMatrix[index];
                if(currentLeg.sharedPartners.indexOf(targetedCustomerNumber) != -1){
                    console.log('Price Incurred: '+(((currentLeg.distance/1000)*farePerKm)/currentLeg.sharedPartners.length));
                    priceIncurred = priceIncurred + (((currentLeg.distance/1000)*farePerKm)/currentLeg.sharedPartners.length);
                    priceIncurred = priceIncurred + ((currentLeg.time * farePerMinute)/ currentLeg.sharedPartners.length);
                    distanceTravelled = distanceTravelled + (currentLeg.distance/1000) ;
                    console.log('distance travelled: '+(currentLeg.distance/1000));
                    timeSpent = timeSpent + currentLeg.time;
                    console.log('Cumulative price incurred: '+priceIncurred);
                    console.log('Cumulative distance travelled: '+distanceTravelled);
                }
                sharedPartners = sharedPartners.concat(currentLeg.sharedPartners);
            }
            console.log('Final price: '+priceIncurred);
            var sharedPartners_uniq = _.uniq(sharedPartners);
            priceIncurred = priceIncurred + (baseFare/sharedPartners_uniq.length);
            deferred.resolve({price:priceIncurred.toFixed(3),distance:distanceTravelled.toFixed(3),time:timeSpent.toFixed(3)});
        }else{
            console.log('could not find corresponding uber model');
            deferred.reject('error, could not find corresponding uber model');
        }
    })
    return deferred.promise;
}

function getCustomersFromMatrix(completeMatrix,boardingOrAlighting,address){

    var customers = [];


    for(var completeMatrixIndex = 0;completeMatrixIndex < completeMatrix.length ; completeMatrixIndex++){
        var currentCompleteMatrixObject = completeMatrix[completeMatrixIndex];
        if( boardingOrAlighting == 1){
            // boarding
            if(currentCompleteMatrixObject.humanReadableAddressOfPickUpPoint == address){
                customers.push(currentCompleteMatrixObject.customerNumber)
            }
        }else{
            //alighting
            if(currentCompleteMatrixObject.humanReadableAddressOfDropPoint == address){
                customers.push(currentCompleteMatrixObject.customerNumber)
            }
        }

    }
    return _.uniq(customers);
}

function getEstimates(acceptedRideIds,targetedCustomerNumber,res,serviceProvider){
    console.log('entered getEstimates');
    Ride.find({rideId:{"$in":acceptedRideIds}},function(err,rides){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(rides.length > 0){
            var source = rides[0].source;
            var destination = rides[0].destination;
            var sourceCityArray = source.split(',');
            var sourceCity = sourceCityArray[sourceCityArray.length - 3];
            var destinationCityArray = destination.split(',');
            var destinationCity = destinationCityArray[destinationCityArray.length - 3];
            var city;
            if(sourceCity == destinationCity){
                city = sourceCity.toLowerCase().trim();
                var sourceLatitudesForDistanceMatrix = '';
                var destinationLatitudesForDistanceMatrix ='';
                var completeMatrix = [];
                for(var i=0;i < rides.length;i++){
                    var completeObject = {};
                    completeObject.source = rides[i].source;
                    completeObject.destination = rides[i].destination;
                    completeObject.pickUpLat = rides[i].pickUpLat;
                    completeObject.pickUpLng = rides[i].pickUpLng;
                    completeObject.dropLat =  rides[i].dropLat;
                    completeObject.dropLng = rides[i].dropLng;
                    completeObject.sourceFromDistanceMatrix = null;
                    completeObject.destinationFromDistanceMatrix = null;
                    completeObject.duration = null;
                    completeObject.distance = null;
                    completeObject.customerNumber = rides[i].customerNumber;
                    completeObject.humanReadableAddressOfPickUpPoint = rides[i].humanReadableNamesOfPickUpLatLng;
                    completeObject.humanReadableAddressOfDropPoint = rides[i].humanReadableNamesOfDropLatLng;
                    completeMatrix.push(completeObject);
                    if(sourceLatitudesForDistanceMatrix == '') {
                        sourceLatitudesForDistanceMatrix = rides[i].humanReadableNamesOfPickUpLatLng;
                    }else{
                        sourceLatitudesForDistanceMatrix = sourceLatitudesForDistanceMatrix+'|'+rides[i].humanReadableNamesOfPickUpLatLng;
                    }
                    if(destinationLatitudesForDistanceMatrix == ''){
                        destinationLatitudesForDistanceMatrix = rides[i].humanReadableNamesOfDropLatLng;
                    }else{
                        destinationLatitudesForDistanceMatrix = destinationLatitudesForDistanceMatrix+'|'+rides[i].humanReadableNamesOfDropLatLng;
                    }
                }
                var sourceCustomerNumberMatrix = {};
                var destinationCustomerNumberMatrix = {};
                var sources = [];
                var destinations = [];
                var sourceLatLongMatrix = [];
                var destinationLatLongMatrix = [];

                for(var i=0; i< rides.length ;i++){
                    sources.push(rides[i].source);
                    destinations.push(rides[i].destination);

                    var sourceLatLngObject = {};
                    sourceLatLngObject.lat = (rides[i].sourceLat).toFixed(3);
                    sourceLatLngObject.lng = (rides[i].sourceLng).toFixed(3);
                    sourceLatLngObject.text = rides[i].source;
                    sourceLatLongMatrix.push(sourceLatLngObject);
                    var destLatLngObject = {};
                    destLatLngObject.lat = (rides[i].destinationLat).toFixed(3);
                    destLatLngObject.lng = (rides[i].destinationLng).toFixed(3);
                    destLatLngObject.text = rides[i].destination;
                    destinationLatLongMatrix.push(destLatLngObject);
                    if(sourceCustomerNumberMatrix[rides[i].source] == undefined){
                        sourceCustomerNumberMatrix[rides[i].source] = [];
                        sourceCustomerNumberMatrix[rides[i].source].push(rides[i].customerNumber);
                    }else{
                        sourceCustomerNumberMatrix[rides[i].source].push(rides[i].customerNumber);
                    }
                    if(destinationCustomerNumberMatrix[rides[i].destination] == undefined){
                        destinationCustomerNumberMatrix[rides[i].destination] = [];
                        destinationCustomerNumberMatrix[rides[i].destination].push(rides[i].customerNumber);
                    }else{
                        destinationCustomerNumberMatrix[rides[i].destination].push(rides[i].customerNumber)
                    }

                }
                var unique_sources = _.uniq(sources);
                var unique_destinations = _.uniq(destinations);
                var unique_sources_text = unique_sources.join('|');
                var unique_destinations_text = unique_destinations.join('|');
                var sourceDestinationDistance = [];
                https.get('https://maps.googleapis.com/maps/api/distancematrix/json?origins='+sourceLatitudesForDistanceMatrix+'&destinations='+destinationLatitudesForDistanceMatrix+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
                    var body = '';
                    response.on('data',function(d){
                        body =body + d;
                    })
                    response.on('end',function(){
                        console.log('Completely received the data from google distance matrix api, in the estimateride');
                        try{
                            var json = JSON.parse(body);
                            if(json.status === 'OK'){

                                var rows = json.rows;
                                for(var rowsindex=0;rowsindex < rows.length; rowsindex++){
                                    var individualRow = rows[rowsindex];
                                    var elements = individualRow.elements;
                                    for(var elementsindex = 0; elementsindex < elements.length;elementsindex++){
                                        var individualElement = elements[elementsindex];
                                        var sourceDestinationDistanceObject = {};
                                        sourceDestinationDistanceObject.source = unique_sources[rowsindex];
                                        sourceDestinationDistanceObject.humanReadableAddressOfPickUpPoint = json.origin_addresses[rowsindex];
                                        sourceDestinationDistanceObject.destination = unique_destinations[elementsindex];
                                        sourceDestinationDistanceObject.humanReadableAddressOfDropPoint = json.destination_addresses[elementsindex];
                                        sourceDestinationDistanceObject.distance = individualElement.distance.value;
                                        sourceDestinationDistance.push(sourceDestinationDistanceObject);
                                    }
                                }
                                var sourceDestinationWaypointsObject = getSourceDestinationAndWaypoints(sourceDestinationDistance,completeMatrix);
                                console.log('The source destination and waypoints for the ride are: ');
                                console.log('Source: '+sourceDestinationWaypointsObject.source);
                                console.log('Destination: '+sourceDestinationWaypointsObject.destination);
                                console.log('Waypoints: '+sourceDestinationWaypointsObject.waypoints);
                                https.get('https://maps.googleapis.com/maps/api/directions/json?origin='+sourceDestinationWaypointsObject.source+'&destination='+sourceDestinationWaypointsObject.destination+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8&waypoints=optimize:true|'+sourceDestinationWaypointsObject.waypoints.join('|'),function(response){
                                    var body = '';

                                    response.on('data',function(d){
                                        body = body + d;
                                    })

                                    response.on('end',function(){
                                        var json = JSON.parse(body);
                                        if(json.status == 'OK'){
                                            console.log('constructing the price calculation matrix: ');
                                            var routes = json.routes;
                                            var legs = routes[0].legs;
                                            var priceCalculationMatrix = [];
                                            var sharedPartners = [];
                                            for(var legsIndex = 0;legsIndex < legs.length;legsIndex++){
                                                console.log('Currently in the leg: '+legsIndex);
                                                var currentLeg = legs[legsIndex];
                                                console.log('Current leg start address: '+currentLeg.start_address);
                                                console.log('Current leg end address: '+currentLeg.end_address);
                                                if(currentLeg.start_address !== currentLeg.end_address){
                                                    var distance = currentLeg.distance.value;
                                                    var partners = {};
                                                    //var customersBoarding = getCustomersFromMatrix(sourceCustomerNumberMatrix,1,sourceLatLongMatrix,currentLeg.start_location);
                                                    var customersBoarding = getCustomersFromMatrix(completeMatrix,1, currentLeg.start_address);
                                                    console.log('customers boarding: '+customersBoarding)
                                                    sharedPartners = sharedPartners.concat(customersBoarding);
                                                    partners.sharedPartners = [];
                                                    partners.sharedPartners = partners.sharedPartners.concat(sharedPartners);
                                                    partners.distance = distance;
                                                    partners.time = ((currentLeg.duration.value) / 60);
                                                    console.log('partners.time and partners.distance: '+partners.time+' : '+partners.distance);
                                                    priceCalculationMatrix.push(partners);
                                                    //var customersAlighting = getCustomersFromMatrix(destinationCustomerNumberMatrix,0,destinationLatLongMatrix,currentLeg.end_location);
                                                    var customersAlighting = getCustomersFromMatrix(completeMatrix,0,currentLeg.end_address);
                                                    console.log('customers alighting: '+customersAlighting)
                                                    if(customersAlighting.length != 0){
                                                        for(var index=0; index < customersAlighting.length;index++){
                                                            var arrayIndex = sharedPartners.indexOf(customersAlighting[index]);
                                                            sharedPartners.splice(arrayIndex,1);
                                                        }
                                                    }

                                                }
                                            }
                                            console.log('targeted customer number is: '+targetedCustomerNumber);
                                            getSharedPrice(priceCalculationMatrix,targetedCustomerNumber,serviceProvider,city)
                                                .then(function(price){
                                                    res.json(price);
                                                }).fail(function(err){
                                                    console.log(err);
                                                    res.json({failure:'failure',message:'There was an error: '+err})
                                                })
                                        }else{
                                            console.log('InFunction:getEstimates,Causes:json.status for directions api is not equal OK,Error:'+json.error_message);
                                            res.json({failure:'failure',message:'InFunction:getEstimates,Causes:json.status is not equal OK,Error:'+json.error_message});
                                        }
                                    })
                                }).on('error',function(e){
                                    console.log('the problem lies here: '+e);
                                })
                            }
                            else {
                                console.log('InFunction:getEstimates,Causes:json.status is not equal to OK,Error:'+json.error_message);
                                res.json({failure:'failure',message:'InFunction:getEstimates,Causes:json.status is not equal to OK'});
                            }
                        }catch(err){
                            console.log('InFunction:getEstimates,Causes:Error is caught in try catch block,Error:'+err);
                            res.json({failure:'failure',message:'InFunction:getEstimates,Causes:Error is caught in try catch block'});
                        }
                    })
                }).on('error',function(err){
                    console.log('InFunction:getEstimates,Causes:google distance matrix http call resulted in error,Error:'+err);
                    res.json({failure:'failure',message:'InFunction:getEstimates,Causes:google distance matrix http call resulted in error'});
                })
            }else{
                console.log('InFunction:getEstimates,Causes:The rides are of different cities,Error:No Error');
                res.json({failure:'failure',message:'InFunction:getEstimates,Causes:The rides are of different cities,Error:No Error'});
            }
        }
    })
}

function haversineDistance(coords1, coords2) {
    function toRad(x) {
        return x * Math.PI / 180;
    }

    var lon1 = parseFloat(coords1[1]);
    var lat1 = parseFloat(coords1[0]);

    var lon2 = parseFloat(coords2[1]);
    var lat2 = parseFloat(coords2[0]);

    var R = 6371; // km

    var x1 = lat2 - lat1;
    var dLat = toRad(x1);
    var x2 = lon2 - lon1;
    var dLon = toRad(x2)
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    return d;
}


function getTheLongestRideFromTheTwoRides(rideA,rideB){
    var rideADistance;
    var rideBDistance;
    var deferred = Q.defer();

    https.get('https://maps.googleapis.com/maps/api/distancematrix/json?origins='+rideA.pickUpLat+','+rideA.pickUpLng+'|'+rideB.pickUpLat+','+rideB.pickUpLng+'&destinations='+rideA.dropLat+','+rideA.dropLng+'|'+rideB.dropLat+','+rideB.dropLng+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
        var body = '';

        response.on('data',function(d){
            body = body+d;
        })

        response.on('end',function(){
            console.log('Completely received the data from google distance matrix api, in the estimateride');
            try{
                var json = JSON.parse(body);
                if(json.status === 'OK'){
                    var rows = json.rows;
                    for(var rowsindex=0; rowsindex < rows.length;rowsindex++){
                        var elements = rows[rowsindex].elements;
                        if(rowsindex == 0){
                            // take the zeroth element
                            var element = elements[0];
                            rideADistance = element.distance;
                        }else{
                            // take the first element
                            var element = elements[1];
                            rideBDistance = element.distance;
                        }
                    }
                    if(rideADistance.value > rideBDistance.value){
                        deferred.resolve([rideA,rideB]);
                    }else{
                        deferred.resolve([rideB,rideA]);
                    }
                }else{
                    console.log('InFunction:getTheLongestRideFromTheTwoRides,Causes:json.status is not equal to OK,Error:No error');
                    deferred.reject('InFunction:getTheLongestRideFromTheTwoRides,Causes:json.status is not equal to OK,Error:No error');
                }
            }
            catch(err){
                console.log('InFunction:getTheLongestRideFromTheTwoRides,Causes:Error was caught in try catch block,Error:'+err);
                deferred.reject('InFunction:getTheLongestRideFromTheTwoRides,Causes:Error was caught in try catch block,Error:'+err);
            }
        })
    })
    return deferred.promise;
}

function calculateDistance(latLngString){
    var source = latLngString;
    var destination = latLngString;
    var splicedSource = source.slice(0, source.length - 1);
    var splicedDestination = destination.slice(0, destination.length - 1);
    var source_array = splicedSource.split('|');
    var destination_array = splicedDestination.split('|');
    var distanceToCalculate = 0;
    try {
        for (var i = 0; i < source_array.length; i++) {
            for (var j = 0; j < destination_array.length; j++) {
                if (j == (i + 1)) {
                    var sourcelatomiclatlong = source_array[i].split(',');
                    var destinationatomiclatlong = destination_array[j].split(',');
                    distanceToCalculate = distanceToCalculate + haversineDistance(sourcelatomiclatlong, destinationatomiclatlong);
                }
            }
        }
        return distanceToCalculate;
    }catch(err) {
        console.log(err);
    }
}

function getHumanReadableAddressFromLatLng(latLngObject){
    var deferred = Q.defer();
    var errorLat = 0;
    var errorLng = 0;

    https.get('https://maps.googleapis.com/maps/api/geocode/json?latlng='+latLngObject.lat+','+latLngObject.lng+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
        var body = '';

        response.on('data',function(d){
            body = body+d;
        })

        response.on('end',function(){
            var json = JSON.parse(body);
            var results = json.results;
            var nameObject = {};
            for(var resultsIndex=0;resultsIndex < results.length;resultsIndex ++){
                var currentElement = results[resultsIndex];
                var currentLat = currentElement.geometry.location.lat;
                var currentLng = currentElement.geometry.location.lng;
                if(resultsIndex == 0){
                    nameObject.address = currentElement.formatted_address;
                    nameObject.lat = currentElement.geometry.location.lat;
                    nameObject.lng = currentElement.geometry.location.lng;
                    errorLat = Math.abs(latLngObject.lat - currentLat);
                    errorLng = Math.abs(latLngObject.lng - currentLng);
                }else{
                    if( Math.abs(latLngObject.lat - currentLat) < errorLat && Math.abs(latLngObject.lng - currentLng) < errorLng){
                        errorLat = Math.abs(latLngObject.lat - currentLat);
                        errorLng = Math.abs(latLngObject.lng - currentLng);
                        nameObject.address = currentElement.formatted_address;
                        nameObject.lat = currentElement.geometry.location.lat;
                        nameObject.lng = currentElement.geometry.location.lng;
                    }
                }
            }
            deferred.resolve(nameObject);
        })

        response.on('error',function(e){
            console.log(e);
            deferred.reject(e);
        })
    })
    return deferred.promise;
}

function getTheNamesOfLatLng(latLngArray){
    var deferred = Q.defer();
    var names =[];
    for(var i=0;i < latLngArray.length;i++){
        getHumanReadableAddressFromLatLng(latLngArray[i])
            .then(function(nameObject){
                names.push(nameObject);
                if(names.length == latLngArray.length){
                    deferred.resolve(names);
                }
            }).fail(function(err){
                console.log(err);
                deferred.reject(err);
            })
    }
    return deferred.promise;
}

function sendGcmMessage(message,registrationIds){
    var deferred = Q.defer();
    var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
    sender.send(message,registrationIds,2,function(err,result){
        if(err){
            console.error('GCM Error: '+err);
            deferred.reject('error');
        }
        else{
            console.log(result);
            deferred.resolve('success')
        }
    })
    return deferred.promise;
}

function removeCustomerFromTheJoinedRide(jrId,ownerCustomerNumber,customerNumberToBeRemoved,res){
    JoinedRide.findOne({jrId:jrId},function(err,jRide){
        if(err){
            console.log(err);
            res.json({failure:failure,message:'There was an error while fetching the joined ride from data base'});
        }else if( jRide!= null){
            var ownerCustomerNumberFromJoinedRide = jRide.ownerCustomerNumber;
            if( ownerCustomerNumberFromJoinedRide != ownerCustomerNumber){
                res.json({failure:'failure',message:'Sorry, you are not the owner, and hence u do not have the power to remove someone from the ride'});
            }else{
                /*
                 update: requestMatrix, statusMatrix, acceptedRideIds, partners, update the Ride of the customer being removed( jrId should be set to zero)
                 */
                var requestMatrix = jRide.requestMatrix;
                var statusMatrix = jRide.statusMatrix;
                var partners = jRide.partners;
                if(partners.length == 3){
                    var rRideId ;
                    var gcmIdOfTheCustomerBeingRemoved;
                    var gcmIdsOfOtherCustomers = [];
                    var requestObject = requestMatrix[customerNumberToBeRemoved];
                    if(requestObject != null || requestObject != undefined){
                        requestObject.status = 'removed';
                        requestMatrix[customerNumberToBeRemoved] = requestObject;
                    }
                    var customerNumberRideIdMap = jRide.customerNumberRideIdMap;
                    rRideId = customerNumberRideIdMap[customerNumberToBeRemoved];
                    delete customerNumberRideIdMap[customerNumberToBeRemoved];
                    statusMatrix[customerNumberToBeRemoved] ='removed';

                    var acceptedRideIds = jRide.acceptedRideIds;
                    acceptedRideIds = _.remove(acceptedRideIds,function(n){
                        return n != rRideId;
                    })
                    for(var partnersIndex=0;partnersIndex < partners.length; partnersIndex++){
                        var currentPartner = partners[partnersIndex];
                        if( currentPartner.customerNumber == customerNumberToBeRemoved){
                            gcmIdOfTheCustomerBeingRemoved = currentPartner.gcmId;
                            partners.splice(partnersIndex,1);
                        }else{
                            if( currentPartner.customerNumber != ownerCustomerNumber){
                                gcmIdsOfOtherCustomers.push(currentPartner.gcmId);
                            }
                        }
                    }
                    JoinedRide.update({jrId:jrId},{customerNumberRideIdMap:customerNumberRideIdMap,partners:partners,acceptedRideIds:acceptedRideIds,requestMatrix:requestMatrix,statusMatrix:statusMatrix},function(err,numberAffected,raw){
                        if(err){
                            console.log(err);
                            res.json({failure:'failure',message:'There was an error while updating the joined ride in the DB'});
                        }else if( numberAffected != null){
                            /*
                             now i have to update the ride
                             */
                            Ride.update({rideId:rRideId},{jrId:0},function(err,numberAffected,raw){
                                if(err){
                                    console.log(err);
                                    res.json({failure:'failure',message:'There was an error while updating the Ride in the DB'});
                                }else if(numberAffected != null){
                                    var registrationIds = [];
                                    registrationIds.push(gcmIdOfTheCustomerBeingRemoved);
                                    var message = new gcm.Message({
                                        collapseKey: 'demo',
                                        delayWhileIdle: true,
                                        timeToLive: 3,
                                        data: {
                                            NotificationType: 'YouAreRemovedFromTheJoinedRide',
                                            jrId: jrId,
                                            rideId:rRideId,
                                            message:'The owner of the Joined Ride has removed you from the joined ride'
                                        }
                                    });
                                    console.log('sending the rider has been removed notification to the gcmId: '+gcmIdOfTheCustomerBeingRemoved);
                                    sendGcmMessage(message,registrationIds)
                                        .then(function(data){
                                            if(data == 'success'){
                                                var message = new gcm.Message({
                                                    collapseKey: 'demo',
                                                    delayWhileIdle: true,
                                                    timeToLive: 3,
                                                    data: {
                                                        NotificationType: 'RiderHasBeenRemoved',
                                                        jrId: jrId,
                                                        rideIdOfTheRemovedRide:rRideId,
                                                        message:'The owner of the Joined Ride has removed a fellow rider from your joined ride'
                                                    }
                                                });
                                                console.log('sending the rider has been removed notification to the gcmId of the others: '+gcmIdsOfOtherCustomers);
                                                sendGcmMessage(message,gcmIdsOfOtherCustomers)
                                                    .then(function(data){
                                                        Request.remove({jrId:jRide.jrId,"$or":[{ownercustomerNumber:customerNumberToBeRemoved},{requesterCustomerNumber:customerNumberToBeRemoved}]},function(err,results){
                                                            if(err){
                                                                console.log('There was an error while removing the request: '+err);
                                                                res.json({failure:'failure',message:'There was an error while removing the request'});
                                                            }else if( result != null){
                                                                console.log('you have successfully removed the fellow rider');
                                                                res.json({success:'success',message:'you have successfully removed the fellow rider'});
                                                            }
                                                        })
                                                    }).fail(function(data){
                                                        console.log('There was some glitch in removing the fellow rider2: '+data)
                                                        res.json({failure:'failure',message:'There was some glitch in removing the fellow rider'});
                                                    })
                                            }
                                        }).fail(function(data){
                                            console.log('There was some glitch in removing the fellow rider1: '+data)
                                            res.json({failure:'failure',message:'There was some glitch in removing the fellow rider'});
                                        })
                                }
                            })
                        }else{
                            console.log('The joined ride was not updated');
                            res.json({failure:'failure',message:'The joined ride updating failed'});
                        }
                    })
                }else if(partners.length ==2){
                    var gcmIdOfTheQuitter;
                    var gcmIdsOfTheOthers = [];
                    var partners = jRide.partners;
                    var acceptedRideIds = jRide.acceptedRideIds;
                    for(var i=0; i < partners.length;i++){
                        var currentPartner = partners[i];
                        if(currentPartner.customerNumber != customerNumberToBeRemoved){
                            gcmIdOfTheQuitter = currentPartner.gcmId;
                        }
                        else{
                            gcmIdsOfTheOthers.push(currentPartner.gcmId);
                        }
                    }
                    Ride.update({"rideId":{"$in":acceptedRideIds}},{jrId:0},{"multi":true},function(err,numberAffected,raw){
                        if(err){
                            console.log('Error happened while updating the rides when one exits from a ride with only 2 customers: '+err);
                            res.json({failure:'failure',message:'Error happened while updating the rides when one exits from a ride with only 2 customers'})
                        }else if(numberAffected != null){
                            Request.remove({jrId:jRide.jrId},function(err,result){
                                if(err){
                                    console.log('There was an error while removing the request');
                                    res.json({failure:'failure',message:'There was an error while removing the request'});
                                }else if( result != null){
                                    JoinedRide.remove({jrId:jRide.jrId},function(err,result){
                                        if(err){
                                            console.log('Error happened while removing joined ride from the database:' +err);
                                            res.json({failure:'failure',message:'Error happened while removing joined ride from the database'});
                                        }else if(result != null){
                                            console.log('inside the joined ride.remove');
                                            // send message to the person who has quit and also to the person remaining
                                            var message = new gcm.Message({
                                                collapseKey: 'demo',
                                                delayWhileIdle: true,
                                                timeToLive: 3,
                                                data: {
                                                    NotificationType: 'fellowRiderHasLeft',
                                                    message:'The fellow rider has left the ride, please search for new partners'
                                                }
                                            });
                                            console.log('Sending the fellowriderhasleft notification to gcmIds: '+gcmIdsOfOtherCustomers);
                                            sendGcmMessage(message,gcmIdsOfTheOthers)
                                                .then(function(data){
                                                    console.log('you have successfully exited the joined ride');
                                                    res.json({success:'success',message:'you have successfully exited the joined ride'});
                                                }).fail(function(data){
                                                    console.log('There was an error while exiting the ride: '+data);
                                                    res.json({success:'success',message:'There was an error while exiting the ride: '});
                                                })
                                        }
                                    })
                                }
                            })
                        }
                    })
                }else{
                    res.json({failure:'failure',message:'you are the only person in the ride, u cannot remove anyone else'});
                }
            }
        }else{
            console.log('A Joined Ride for this JrId does not exist, jrId: '+jrId);
            res.json({failure:'failure',message:'A Joined Ride for this JrId does not exist'})
        }
    })
}


function exitFromTheJoinedRide(jrId,customerNumberExiting,res){
    /*
     two cases:
     1. one can exit joined ride only before it has started, not after it has started
     2. if the owner is exiting the ride, thw new owner must be found out and assigned accordingly
     */
    JoinedRide.findOne({jrId:jrId},function(err,joinedRide){
        if(err){
            console.log(err);
            res.json({failure:'failure',message:'There was an error while accessing the database'});
        }else if( joinedRide != null){
            if(joinedRide.status == 'started'){
                res.json({failure:'failure',message:'The ride has already started, you cannot exit now'});
            }else{
                if(joinedRide.partners.length >= 2){
                    if( customerNumberExiting == joinedRide.ownerCustomerNumber){
                        var acceptedRideIds = joinedRide.acceptedRideIds;
                        var rideOfTheExitingCustomer;
                        var gcmIdOfTheNewOwner;
                        var gcmIdsOfTheOthers = [];
                        Ride.find({rideId:{"$in":acceptedRideIds}},function(err,rides){
                            if(err){
                                console.log(err);
                                res.json({failure:'failure',message:'There was an error while fetching rides from the database'});
                            }else if(rides.length > 0){
                                var ridesToBeTested = [];
                                for(var i=0;i <rides.length;i++){
                                    var currentRide = rides[i];
                                    if(currentRide.customerNumber != customerNumberExiting){
                                        ridesToBeTested.push(currentRide);
                                    }else{
                                        rideOfTheExitingCustomer = currentRide;
                                    }
                                }
                                var biggerRide;
                                var smallerRide;
                                if(joinedRide.partners.length == 2){
                                    var gcmIdOfTheQuitter;
                                    var partners = joinedRide.partners;
                                    var otherPartnerCustomerNumber;
                                    for(var i=0; i < partners.length;i++){
                                        var currentPartner = partners[i];
                                        if(currentPartner.customerNumber == customerNumberExiting){
                                            gcmIdOfTheQuitter = currentPartner.gcmId;
                                        }
                                        else{
                                            otherPartnerCustomerNumber=currentPartner.customerNumber;
                                            gcmIdsOfTheOthers.push(currentPartner.gcmId);
                                        }
                                    }
                                    var bigSetQuery = {};
                                    bigSetQuery["requestMatrix."+customerNumberExiting] = {};
                                    bigSetQuery["requestMatrix."+otherPartnerCustomerNumber] = {};
                                    Ride.update({"rideId":{"$in":acceptedRideIds}},{jrId:0,"$set":bigSetQuery},{"multi":true},function(err,numberAffected,raw){
                                        if(err){
                                            console.log('Error happened while updating the rides when one exits from a ride with only 2 customers: '+err);
                                            res.json({failure:'failure',message:'Error happened while updating the rides when one exits from a ride with only 2 customers'})
                                        }else if(numberAffected != null){
                                            Request.remove({jrId:joinedRide.jrId},function(err,results){
                                                if(err){
                                                    console.log('There was an error while deleting the requests associated with the customer exiting: '+err);
                                                    res.json({failure:'failure',message:'There was an error while deleting the requests associated with the customer exiting'});
                                                }else if( results != null){
                                                    JoinedRide.remove({jrId:joinedRide.jrId},function(err,result){
                                                        if(err){
                                                            console.log('Error happened while removing joined ride from the database:' +err);
                                                            res.json({failure:'failure',message:'Error happened while removing joined ride from the database'});
                                                        }else if(result != null){
                                                            // send message to the person who has quit and also to the person remaining
                                                            var message = new gcm.Message({
                                                                collapseKey: 'demo',
                                                                delayWhileIdle: true,
                                                                timeToLive: 3,
                                                                data: {
                                                                    NotificationType: 'fellowRiderHasLeftWithJoinedRideRemoved',
                                                                    message:'The fellow rider has left the ride, please search for new partners'
                                                                }
                                                            });
                                                            console.log('sending the fellowriderhasleft notification to gcmIds: '+gcmIdsOfTheOthers);
                                                            sendGcmMessage(message,gcmIdsOfTheOthers)
                                                                .then(function(data){
                                                                    console.log('you have successfully exited the joined ride');
                                                                    res.json({success:'success',message:'you have successfully exited the joined ride'});
                                                                }).fail(function(data){
                                                                    console.log('There was an error while exiting the ride: '+data);
                                                                    res.json({success:'success',message:'There was an error while exiting the ride: '});
                                                                })
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    })
                                }else{
                                    getTheLongestRideFromTheTwoRides(ridesToBeTested[0],ridesToBeTested[1])
                                        .then(function(ride){
                                            biggerRide = ride[0];
                                            smallerRide = ride[1];
                                            var ownerCustomerNumber = biggerRide.customerNumber;
                                            var partners = joinedRide.partners;
                                            for(var i=0; i < partners.length;i++){
                                                var currentPartner = partners[i];
                                                if(currentPartner.customerNumber == customerNumberExiting){
                                                    partners.splice(i,1);
                                                }
                                                if(currentPartner.customerNumber == biggerRide.customerNumber){
                                                    gcmIdOfTheNewOwner =currentPartner.gcmId;
                                                }else{
                                                    if(currentPartner.customerNumber != customerNumberExiting){
                                                        gcmIdsOfTheOthers.push(currentPartner.gcmId);
                                                    }
                                                }
                                            }
                                            acceptedRideIds = _.remove(acceptedRideIds,function(n){
                                                return n != rideOfTheExitingCustomer.rideId;
                                            })
                                            var originalRideId = biggerRide.rideId;
                                            var source = biggerRide.source;
                                            var destination = biggerRide.destination;
                                            var date = biggerRide.date;
                                            var pickUpLat = biggerRide.pickUpLat;
                                            var pickUpLng = biggerRide.pickUpLng;
                                            var dropLat = biggerRide.dropLat;
                                            var dropLng = biggerRide.dropLng;
                                            var requests = joinedRide.requests.concat(biggerRide.requests);
                                            var requestMatrix = joinedRide.requestMatrix;

                                            for( var key in biggerRide.requestMatrix){
                                                requestMatrix[key] = biggerRide.requestMatrix[key];
                                            }
                                            var requestObject = requestMatrix[customerNumberExiting];
                                            if(requestObject != null && requestObject != undefined){
                                                requestObject.status='exited';
                                                requestMatrix[customerNumberExiting] = requestObject;
                                            }
                                            var customerNumberRideIdMap = joinedRide.customerNumberRideIdMap;
                                            delete customerNumberRideIdMap[customerNumberExiting];
                                            var overview = biggerRide.overview_polyline;
                                            var obj = {
                                                originalRideId:originalRideId,
                                                source:source,
                                                destination:destination,
                                                date:date,
                                                pickUpLat:pickUpLat,
                                                pickUpLng:pickUpLng,
                                                dropLat:dropLat,
                                                dropLng:dropLng,
                                                requests:requests,
                                                requestMatrix:requestMatrix,
                                                partners:partners,
                                                acceptedRideIds:acceptedRideIds,
                                                ownerCustomerNumber:ownerCustomerNumber,
                                                phoneNumber:biggerRide.phoneNumber,
                                                customerNumberRideIdMap:customerNumberRideIdMap,
                                                overview_polyline:overview
                                            };
                                            JoinedRide.update({jrId:jrId},obj,function(err,numberAffected,raw){
                                                if(err){
                                                    console.log(err);
                                                    res.json({failure:'failure',message:'Error occured while updating the joinedRide'});
                                                }else if(numberAffected != null){
                                                    Ride.update({rideId:rideOfTheExitingCustomer.rideId},{jrId:0},function(err,ride){
                                                        if(err){
                                                            console.log(err);
                                                            res.json({failure:'failure',message:'Error occured while updating the exiting owners ride'});
                                                        }else if(ride != null){
                                                            var registrationIds = [];
                                                            registrationIds.push(gcmIdOfTheNewOwner);
                                                            var message = new gcm.Message({
                                                                collapseKey: 'demo',
                                                                delayWhileIdle: true,
                                                                timeToLive: 3,
                                                                data: {
                                                                    NotificationType: 'YouAreTheNewOwner',
                                                                    jrId: jrId,
                                                                    message:'The owner of the Joined Ride has left and now you are the new owner'
                                                                }
                                                            });
                                                            console.log('sending the youarethenewowner notification to the gcm id: '+gcmIdOfTheNewOwner);
                                                            sendGcmMessage(message,registrationIds)
                                                                .then(function(data){
                                                                    var message = new gcm.Message({
                                                                        collapseKey: 'demo',
                                                                        delayWhileIdle: true,
                                                                        timeToLive: 3,
                                                                        data: {
                                                                            NotificationType: 'OwnerHasExitedTheRide',
                                                                            jrId: jrId,
                                                                            newOwner:ownerCustomerNumber,
                                                                            message:'The owner of the Joined Ride has left and here is the new owner'
                                                                        }
                                                                    })
                                                                    console.log('sending the OwnerHasExitedTheRide notification to the gcm ids: '+gcmIdsOfTheOthers);
                                                                    sendGcmMessage(message,gcmIdsOfTheOthers)
                                                                        .then(function(data){
                                                                            Request.remove({jrId:joinedRide.jrId,ownercustomerNumber:{"$in":[biggerRide.customerNumber,smallerRide.customerNumber]},requesterCustomerNumber:{"$in":[biggerRide.customerNumber,smallerRide.customerNumber]}},function(err,result){
                                                                                if(err){
                                                                                    console.log('There was an error while removing the request from the DB related to both these rides: '+err);
                                                                                    res.json({failure:'failure',message:'There was an error while removing the request from the DB related to both these rides'});
                                                                                }else if(result != null){
                                                                                    console.log('you have successfully exited the joined ride');
                                                                                    res.json({success:'success',message:'you have successfully exited the joined ride'});
                                                                                }
                                                                            })
                                                                        }).fail(function(data){
                                                                            console.log('There was an error while ');
                                                                            res.json({success:'success',message:'you have successfully exited the joined ride'});
                                                                        })
                                                                }).fail(function(data){
                                                                    console.log('There was an error while sending the message to the new owner');
                                                                    res.json({failure:'failure',message:'There was an error while sending the message to the new owner'})
                                                                })
                                                        }else{
                                                            res.json({failure:'failure',message:'Error occured while updating the exiting owner ride'});
                                                        }
                                                    })
                                                }
                                            })
                                        }).fail(function(data){
                                            console.log('There was an error while finding out the biggest ride: '+data);
                                            res.json({failure:'failure',message:'There was an error while finding out the biggest ride'});
                                        })
                                }

                            }else{
                                console.log('there were no rides in the joined ride that you are exiting');
                                res.json({failure:'failure',message:'there were no rides in the joined ride that you are exiting'});
                            }
                        })
                    }else{
                        var partners = joinedRide.partners;
                        if(partners.length == 2){
                            var requestMatrix = joinedRide.requestMatrix;
                            var statusMatrix = joinedRide.statusMatrix;
                            var gcmIdOfTheQuitter;
                            var partners = joinedRide.partners;
                            var otherPartnerCustomerNumber;
                            var gcmIdsOfTheOthers = [];
                            var acceptedRideIds = joinedRide.acceptedRideIds;
                            for(var i=0; i < partners.length;i++){
                                var currentPartner = partners[i];
                                if(currentPartner.customerNumber == customerNumberExiting){
                                    gcmIdOfTheQuitter = currentPartner.gcmId;
                                }
                                else{
                                    otherPartnerCustomerNumber=currentPartner.customerNumber;
                                    gcmIdsOfTheOthers.push(currentPartner.gcmId);
                                }
                            }
                            var bigSetQuery = {};
                            bigSetQuery["requestMatrix."+customerNumberExiting] = {};
                            bigSetQuery["requestMatrix."+otherPartnerCustomerNumber] = {};
                            Ride.update({"rideId":{"$in":acceptedRideIds}},{jrId:0,"$set":bigSetQuery},{"multi":true},function(err,numberAffected,raw){
                                if(err){
                                    console.log('Error happened while updating the rides when one exits from a ride with only 2 customers: '+err);
                                    res.json({failure:'failure',message:'Error happened while updating the rides when one exits from a ride with only 2 customers'})
                                }else if(numberAffected != null){
                                    Request.remove({jrId:joinedRide.jrId},function(err,results){
                                        if(err){
                                            console.log('There was an error while deleting the requests associated with the customer exiting: '+err);
                                            res.json({failure:'failure',message:'There was an error while deleting the requests associated with the customer exiting'});
                                        }else if( results != null){
                                            JoinedRide.remove({jrId:joinedRide.jrId},function(err,result){
                                                if(err){
                                                    console.log('Error happened while removing joined ride from the database:' +err);
                                                    res.json({failure:'failure',message:'Error happened while removing joined ride from the database'});
                                                }else if(result != null){
                                                    // send message to the person who has quit and also to the person remaining
                                                    var message = new gcm.Message({
                                                        collapseKey: 'demo',
                                                        delayWhileIdle: true,
                                                        timeToLive: 3,
                                                        data: {
                                                            NotificationType: 'fellowRiderHasLeftWithJoinedRideRemoved',
                                                            message:'The fellow rider has left the ride, please search for new partners'
                                                        }
                                                    });
                                                    console.log('sending the fellowriderhasleft notification to gcmIds: '+gcmIdsOfTheOthers);
                                                    sendGcmMessage(message,gcmIdsOfTheOthers)
                                                        .then(function(data){
                                                            console.log('you have successfully exited the joined ride');
                                                            res.json({success:'success',message:'you have successfully exited the joined ride'});
                                                        }).fail(function(data){
                                                            console.log('There was an error while exiting the ride: '+data);
                                                            res.json({success:'success',message:'There was an error while exiting the ride: '});
                                                        })
                                                }
                                            })
                                        }
                                    })

                                }
                            })
                        } else{
                            var requestMatrix = joinedRide.requestMatrix;
                            var statusMatrix = joinedRide.statusMatrix;
                            var rRideId ;
                            var gcmIdOfTheCustomerBeingRemoved;
                            var gcmIdsOfTheOthers = [];
                            var requestObject = requestMatrix[customerNumberExiting];
                            var customerNumberRideIdMap = joinedRide.customerNumberRideIdMap;
                            rRideId = customerNumberRideIdMap[customerNumberExiting];
                            if( requestObject != null || requestObject != undefined){
                                requestObject.status = 'exited';
                                requestMatrix[customerNumberExiting] = requestObject;
                            }
                            statusMatrix[customerNumberExiting] = 'exited';
                            var acceptedRideIdss = joinedRide.acceptedRideIds;
                            acceptedRideIdss = _.remove(acceptedRideIdss,function(n){
                                return n != rRideId;
                            })
                            for(var partnersIndex=0;partnersIndex < partners.length; partnersIndex++){
                                var currentPartner = partners[partnersIndex];
                                if( currentPartner.customerNumber == customerNumberExiting){
                                    gcmIdOfTheCustomerBeingRemoved = currentPartner.gcmId;
                                    partners.splice(partnersIndex,1);
                                }else{
                                    gcmIdsOfTheOthers.push(currentPartner.gcmId);
                                }
                            }

                            delete customerNumberRideIdMap[customerNumberExiting];
                            var obj = {
                                requestMatrix:requestMatrix,
                                acceptedRideIds:acceptedRideIdss,
                                partners:partners,
                                statusMatrix:statusMatrix,
                                customerNumberRideIdMap:customerNumberRideIdMap
                            };
                            JoinedRide.update({jrId:jrId},obj,function(err,numberAffected,raw){
                                if(err){
                                    console.log(err);
                                    res.json({failure:'failure',message:'there was an error when updating the joined ride'})
                                }else if(numberAffected != null){
                                    Ride.update({rideId:rRideId},{jrId:0},function(err,numberAffected,raw){
                                        if(err){
                                            console.log(err);
                                            res.json({failure:'failure',message:'There was an error while updating the ride'});
                                        }else if(numberAffected  != null){
                                            var registrationIds = [];
                                            registrationIds.push(gcmIdsOfTheOthers);
                                            var message = new gcm.Message({
                                                collapseKey: 'demo',
                                                delayWhileIdle: true,
                                                timeToLive: 3,
                                                data: {
                                                    NotificationType: 'fellowRiderHasLeft',
                                                    jrId: jrId,
                                                    exitingCustomerNumber: customerNumberExiting,
                                                    message:'The fellow rider has left the ride, please search for new partners'
                                                }
                                            })
                                            console.log('sending the fellowriderhasexited notification to the gcmids: '+gcmIdsOfTheOthers)
                                            sendGcmMessage(message,registrationIds)
                                                .then(function(data){
                                                    /*"$or":[{ownerCustomerNumber:customerNumber},query1]}*/
                                                    Request.remove({jrId:joinedRide.jrId,"$or":[{ownercustomerNumber:customerNumberExiting},{requesterCustomerNumber:customerNumberExiting}]},function(err,results){
                                                        if(err){
                                                            console.log('There was an error while removing the request: '+err);
                                                            res.json({failure:'failure',message:'There was an error while removing the request'});
                                                        }else if( results != null){
                                                            console.log('Successfully removed the exiting customer');
                                                            res.json({success:'success',message:'you have successfully exited the ride'});
                                                        }
                                                    })

                                                }).fail(function(data){
                                                    console.log('error happened while sending message to the new owner');
                                                    res.json({failure:'failure',message:'error happened while sending message to the new owner'})
                                                })
                                        }
                                    })
                                }
                            })
                        }

                    }
                }else{
                    res.json({message:'you are the only person in the ride'});
                }
            }
        }else{
            console.log('Could not find the joined ride with the specified jrId: '+jrId);
            res.json({failure:'failure',message:'Could not find the joined ride with the specified jrId'});
        }
    })
}


function getOverviewPolyLine(pickUpLat,pickUpLng,dropLat,dropLng){
    var deferred = Q.defer();

    https.get('https://maps.googleapis.com/maps/api/directions/json?origin='+pickUpLat+','+pickUpLng+'&destination='+dropLat+','+dropLng+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
        var body = '';

        response.on('data',function(d){
            body = body+d;
        })

        response.on('end',function(){
            var json = JSON.parse(body);
            var route = json.routes[0];
            var overview_polyline = route.overview_polyline;
            deferred.resolve(overview_polyline);
        })

        response.on('fail',function(e){
            console.log('There was some problem while fetching directions from Google directions matrix: '+e);
            deferred.reject('There was some problem while fetching directions from Google directions matrix');
        })
    })

    return deferred.promise;
}

function getDistanceBetweenTwoPointsGoogleDistanceMatrix(sourceLatLngArray,destLatLngArray){
    var deferred = Q.defer();
    https.get('https://maps.googleapis.com/maps/api/distancematrix/json?origins='+sourceLatLngArray[0]+','+sourceLatLngArray[1]+'&destinations='+destLatLngArray[0]+','+destLatLngArray[1]+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
        var body = '';

        response.on('data',function(d){
            body = body + d;
        })


        response.on('end',function(){
            try{
                var json = JSON.parse(body);
                if(json.status == 'OK'){
                    var rows = json.rows;
                    var elements = rows[0].elements;
                    var element = elements[0];
                    var distance = element.distance.value;
                    deferred.resolve(distance/1000);
                }else{
                    console.log('InFunction:getDistanceBetweenTwoPointsGoogleDistanceMatrix,Causes:json.status for distance matrix is not equal to OK:Error:'+json.error_message);
                    deferred.reject('InFunction:getDistanceBetweenTwoPointsGoogleDistanceMatrix,Causes:json.status for distance matrix is not equal to OK:Error:'+json.error_message);
                }
            }catch(err){
                console.log('InFunction:getDistanceBetweenTwoPointsGoogleDistanceMatrix,Causes:error was caught in the catch block,Error:'+err)
                deferred.reject('InFunction:getDistanceBetweenTwoPointsGoogleDistanceMatrix,Causes:error was caught in the catch block,Error:'+err);
            }
        })

        response.on('error',function(err){
            console.log('There was an error while retrieving results from the google distance matrix api');
            deferred.reject('There was an error while retrieving results from the google distance matrix api')
        })
    })
    return deferred.promise;
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
 profileId:profileId,
 gmcId:gcmId
 }
 */
app.post('/signuplogin',function(req,res,next){
    console.log('Entered the signuplogin function');
    var name = req.body.name;
    var email = req.body.email;
    var profile = req.body.profile;
    var gender = req.body.gender;
    var profileId = req.body.profileId;
    Customer.findOne({email:email},function(err,customer){
        if(err){
            console.log('Error while retrieving the customer from the DB, in registerCustomer function');
            res.sendStatus(500);
        }else if(customer){
            console.log('Found the customer from the DB');
            var profileFromDB = customer.profile;
            if(profileFromDB !== profile){
                res.json({failure:'failure',data:"User has already signed up with this email id using the profile: "+profileFromDB});
            }else{
                if(profile == 'facebook'){
                    try{
                        console.log('Profile is facebook');
                        https.get('https://graph.facebook.com/app?access_token='+req.body.token,function(response){

                            var body = '';
                            response.on('data',function(d){
                                body =body + d;
                            })
                            response.on('end',function(){
                                console.log('Completely received the data from Facebook graph api: '+body);
                                var json = JSON.parse(body);
                                if(json.error === undefined){
                                    if(json.name == 'Splitrides'){
                                        console.log('json.name is Splitrides');
                                        var objectToBeEncoded = {};
                                        objectToBeEncoded.name = customer.name;
                                        objectToBeEncoded.customerNumber = customer.customerNumber;
                                        objectToBeEncoded.email = customer.email;
                                        objectToBeEncoded.iss ='foodpipe.in';
                                        objectToBeEncoded.isMobile=1;
                                        var gcmId = req.body.gcmId;
                                        Customer.update({customerNumber:customer.customerNumber},{gmcId:gcmId},function(err,numberAffected,raw){
                                            if(err){
                                                console.log('Error happened while updating the GCM ID of the customer: '+err);
                                                res.json({failure:'failure',message:'Error happened while updating the GCM ID of the customer'});
                                            }else if(numberAffected != null){
                                                console.log('Updated the customer successfully, about to return the response');
                                                var token = jwt.encode(objectToBeEncoded,secretkey);
                                                res.json({success:'success',token:token,data:customer});
                                            }
                                        })
                                    }else{
                                        console.log('json.name is not foodpipe');
                                        res.json({failure:'failure',message:'json.name is not foodpipe'});
                                    }
                                }else{
                                    console.log('Unable to authenticate with the given token provided from you with facebook');
                                    res.json({failure:'failure',data:'Unable to authenticate with the given token provided from you with facebook'})
                                }
                            })
                        }).on('error',function(e){
                            console.log('The shitty problem is: '+e);
                        })

                    }catch(err){
                        console.log('Error happened in profile is facebook: '+err);
                    }
                }else if( profile == 'google'){
                    try{
                        console.log('Entered the profile google');
                        https.get('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token='+req.body.token,function(response){

                            var body = '';
                            response.on('data',function(d){
                                body =body + d;
                            })
                            response.on('end',function(){
                                console.log('Completely received the data '+body);
                                var json = JSON.parse(body);
                                if(json.error === undefined){
                                    if(json.email == customer.email && json.expires_in > 0){
                                        var objectToBeEncoded = {};
                                        objectToBeEncoded.name = customer.name;
                                        objectToBeEncoded.customerNumber = customer.customerNumber;
                                        objectToBeEncoded.email = customer.email;
                                        objectToBeEncoded.iss ='foodpipe.in';
                                        objectToBeEncoded.isMobile=1;
                                        var gcmId = req.body.gcmId;
                                        Customer.update({customerNumber:customer.customerNumber},{gmcId:gcmId},function(err,numberAffected,raw){
                                            if(err){
                                                console.log('Error happened while updating the GCM ID of the customer: '+err);
                                                res.json({failure:'failure',message:'Error happened while updating the GCM ID of the customer'});
                                            }else if(numberAffected != null){
                                                var token = jwt.encode(objectToBeEncoded,secretkey);
                                                res.json({success:'success',token:token,data:customer});
                                            }
                                        })
                                    }
                                }else{
                                    res.json({failure:'failure',data:'Unable to authenticate with the given token provided from you with google'});
                                    console.log('The error is: '+json.error_description);
                                }
                            })
                        }).on('error',function(e){
                            console.log('The shitty problem is: '+e);
                        })
                    }catch(err){
                        console.log('Error hapened in profile is google: '+err)
                    }
                }else{
                    console.log('Entered the local profile');
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
            try{
                console.log('Entered the else condition, of the customer block');
                var customerNumber = getUniqueId(32);
                var nameFlag = true;
                var profileFlag = true;
                var emailFlag = true;
                var genderFlag = true;

                if(name == null || name == '') {
                    nameFlag = false;
                }
                if(profile == null || profile == ''){
                    profileFlag = false;
                }
                if(gender == null || gender == ''){
                    genderFlag=false;
                }
                if(email == null || email == ''){
                    emailFlag=false;
                }
                if( emailFlag && genderFlag && nameFlag && profileFlag){
                    var newCustomer = new Customer({
                        name:name,
                        customerNumber:customerNumber,
                        profile:profile,
                        email:email,
                        gcmId:req.body.gcmId,
                        gender:gender,
                        profileId:profileId
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
                    console.log('among the four parameters profile,email,name,gender, one or multiple of them is null or empty');
                    res.json({failure:'failure',message:'among the four parameters profile,email,name,gender, one or multiple of them is null or empty'});
                }
            }
            catch(err){
                console.log('There was an error in the entire block: '+err);
            }
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
 latlong: String,
 gender: String (male/female),
 pickUpLatLng: pick up lat lng separated by a comma,
 dropLatLng: drop lat lng separated by a comma
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
    var latlong = req.body.latlong;
    var gender = req.body.gender;
    var sourceLat = req.body.sourceLat;
    var sourceLng = req.body.sourceLng;
    var destinationLat = req.body.destinationLat;
    var destinationLng = req.body.destinationLng;
    var pickUpLatLng = req.body.pickUpLatLng;
    var dropLatLng = req.body.dropLatLng;
    var pickUpLatLngArray = pickUpLatLng.split(',');
    var dropLatLngArray = dropLatLng.split(',');
    var pickUpLat = parseFloat(pickUpLatLngArray[0]);
    var pickUpLng = parseFloat(pickUpLatLngArray[1]);
    var dropLat = parseFloat(dropLatLngArray[0]);
    var dropLng = parseFloat(dropLatLngArray[1]);
    var city;
    var sourceCityArray = source.split(',');
    var sourceCity = sourceCityArray[sourceCityArray.length - 3];
    var destinationCityArray = destination.split(',');
    var destinationCity = destinationCityArray[destinationCityArray.length - 3];
    var humanReadableNamesOfPickUpLatLng;
    var humanReadableNamesOfDropLatLng;
    getTheNamesOfLatLng([{lat:pickUpLat,lng:pickUpLng},{lat:dropLat,lng:dropLng}])
        .then(function(nameObjects){
            var errorPickUpLat=0;
            var errorPickUpLng=0;
            var errorDropLat=0;
            var errorDropLng=0;
            if( ( Math.abs(nameObjects[0].lat - pickUpLat) <  Math.abs(nameObjects[1].lat - pickUpLat) ) && (Math.abs(nameObjects[0].lng - pickUpLng) <  Math.abs(nameObjects[1].lng - pickUpLng)) ){
                humanReadableNamesOfPickUpLatLng = nameObjects[0].address;
                humanReadableNamesOfDropLatLng = nameObjects[1].address;
            }else{
                humanReadableNamesOfPickUpLatLng = nameObjects[1].address;
                humanReadableNamesOfDropLatLng = nameObjects[0].address;
            }

            if( sourceCity === destinationCity){
                city = sourceCity.toLowerCase().trim();
                getOverviewPolyLine(pickUpLat,pickUpLng,dropLat,dropLng)
                    .then(function(polyline){
                        var ride = new Ride({
                            pickUpLat:pickUpLat,
                            pickUpLng:pickUpLng,
                            dropLat:dropLat,
                            dropLng:dropLng,
                            customerNumber:customerNumber,
                            rideId:rideId,
                            source:source,
                            destination:destination,
                            phoneNumber:phoneNumber,
                            date:date,
                            jrId:0,
                            latlong:latlong,
                            gender:gender,
                            sourceLat:sourceLat,
                            destinationLat:destinationLat,
                            sourceLng:sourceLng,
                            destinationLng:destinationLng,
                            city:city,
                            humanReadableNamesOfPickUpLatLng:humanReadableNamesOfPickUpLatLng,
                            humanReadableNamesOfDropLatLng:humanReadableNamesOfDropLatLng,
                            overview_polyline:polyline.points
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
                    }).fail(function(error){
                        console.log('there was an error while fetching the polyline for the source and destination: '+error);
                        res.json({failure:'failure',message:'There was an error while fetching the polyline'});
                    })

            }else{
                res.json({failure:'failure',message:'The source and destination is not of the same city'});
            }
        }).fail(function(err){
            console.log(err);
            res.sendStatus(500)
        })

})

/*
 {
 "timeChoice":"both/today/tomorrow",
 "rideId":ride id from which u are searching,
 }
 */

app.post('/getRides',ensureAuthorized,function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var customer = req.customer;
    var todayOrTomo = req.body.timeChoice;
    var gender = customer.gender;
    var tempmoment = moment().utcOffset("+05:30");
    var dateToday = tempmoment.format('YYYY-MM-DD');
    var nextDay = tempmoment.add(1,'d').format('YYYY-MM-DD');
    //var rideId = req.body.rideId;
    var flag = false;
    console.log('value of todayOrTomo is: '+todayOrTomo);
    console.log('dateToday is: '+dateToday+' nextday is: '+nextDay);
    var completeDateTodayString;
    var completeNextDayString;
    completeDateTodayString = dateToday+'T00:00:00.000Z';
    if(todayOrTomo == 'today'){
        completeNextDayString=dateToday+'T23:59:00.000Z';
    }else if(todayOrTomo == 'tomorrow'){
        completeDateTodayString = nextDay+'T00:00:00.000Z';
        completeNextDayString = nextDay+'T23:59:00.000Z';
    }else if(todayOrTomo == 'both'){
        completeNextDayString = nextDay+'T23:59:00.000Z';
    }else{
        flag = true;
    }

    if(flag){
        res.json({failure:'failure',message:'todayOrTomo did not match with any of the existing criteria'})
    }else{
        Ride.find({date:{'$gte':completeDateTodayString,'$lt':completeNextDayString},jrId:0,gender:gender,customerNumber:{"$ne":customerNumber}},function(err,ridesFromFunction){
            if(err){
                console.log('Error happened while fetching rides from the database: '+err);
                res.json({failure:'failure',message:'Error happened while fetching rides from the database'});
            }else if(ridesFromFunction  != null){
                var query = {};
                var criteria='partners.customerNumber';
                var subQuery = {};
                var subCriteria = '$ne';
                subQuery[subCriteria]=customerNumber;
                query[criteria]=subQuery;

                var bigQuery = {};
                var dateCriteria = 'date';
                var dateCriteriaSub = {};
                dateCriteriaSub['$gte'] = completeDateTodayString;
                dateCriteriaSub['$lt'] = completeNextDayString;
                bigQuery[dateCriteria] = dateCriteriaSub;
                var partnerCountQuery = "$where";
                bigQuery[partnerCountQuery]= 'this.partners.length < 3';
                /*{date:{'$gte':completeDateTodayString,'$lt':completeNextDayString},status:{"$ne":'ended'},ownerCustomerNumber:{"$ne":customerNumber}}*/
                var statusCriteria ='status';
                var statusCriteriaSub = {};
                statusCriteriaSub['$ne'] = 'ended';
                bigQuery[statusCriteria] = statusCriteriaSub;
                var ownerCriteria = 'ownerCustomerNumber';
                var ownerCriteriaSub = {};
                ownerCriteriaSub['$ne'] = customerNumber;
                bigQuery[ownerCriteria] = ownerCriteriaSub;
                bigQuery[criteria] = subQuery;
                JoinedRide.find(bigQuery,function(err,joinedRides){
                    if(err) {
                        console.log('Error happened while fetching joined rides from the database: ' + err);
                        res.json({
                            failure: 'failure',
                            message: 'Error happened while fetching joined rides from the database'
                        });
                    }else if(joinedRides.length > 0){
                        console.log('Successfully sending back the rides and joined rides');
                        res.json({
                            rides:ridesFromFunction,
                            joinedRides:joinedRides
                        })
                    }else{
                        console.log('Could not find any joined rides from the database');
                        if(ridesFromFunction.length > 0){
                            res.json({rides:ridesFromFunction});
                        }else{
                            res.json({failure:'failure',message:'Currently there are no rides or joined rides'});
                        }
                    }
                })
            }else{
                console.log('Could not find any rides from the database');
                res.json({failure:'failure',message:'Could not find any rides from the database'});
            }
        })
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
    /*var currentTime;
     if( tempmoment.format('HH') == "00"){
     currentTime= tempmoment.format('HH:mm:ss');
     }else{
     currentTime= tempmoment.subtract(1,'h').format('HH:mm:ss');
     }*/
    /*
     var currentDateTimeString = currentDate+'T00:00:00.000Z';
     console.log('CurrentdateTimeString is: '+currentDateTimeString);*/
    var query1 = {};
    var criteria = "partners.customerNumber";
    query1[criteria] = customerNumber;
    var nextDayDate = tempmoment.add(1,'d').format('YYYY-MM-DD');
    Ride.find({date:{'$gte':currentDate+'T00:00:00.000Z','$lt':nextDayDate+'T23:59:59.000Z'},jrId:0,customerNumber:customerNumber},function(err,rides){
        if(err){
            console.log('There was an error while retrieving rides from database');
            res.sendStatus(500);
        } else if(rides.length > 0){
            JoinedRide.find({date:{'$gte':currentDate+'T00:00:00.000Z','$lt':nextDayDate+'T23:59:59.000Z'},"$or":[{ownerCustomerNumber:customerNumber},query1]},function(err,jrides){
                if(err){
                    console.log('there was an error while fetching joined rides from database');
                    res.sendStatus(500);
                } else if(jrides.length > 0){
                    res.json({rides:rides,joinedRides:jrides});
                } else if (jrides.length === 0){
                    res.json({rides:rides});
                }
            }).sort({"date":-1});
        } else if (rides.length === 0){
            JoinedRide.find({date:{'$gte':currentDate+'T00:00:00.000Z','$lt':nextDayDate+'T23:59:59.000Z'},"$or":[{ownerCustomerNumber:customerNumber},query1]},function(err,jrides){
                if(err){
                    console.log('there was an error while fetching joined rides from database');
                    res.sendStatus(500);
                } else if(jrides.length > 0){
                    res.json({joinedRides:jrides});
                } else if (jrides.length === 0){
                    res.json({message:'currently u do not have any rides posted for today or tomo'});
                }
            }).sort({"date":-1});
        }
    }).sort({"date":-1});
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
 jrId:joined ride id,
 serviceProvider: serviceProvider
 }
 */
app.post('/startRide',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumberFromToken = decodedToken.customerNumber;
    var serviceProvider = req.body.serviceProvider;
    serviceProvider = serviceProvider.toLowerCase();
    var joinedRideId = req.body.jrId;
    console.log(customerNumberFromToken+':Entered the startRide');
    JoinedRide.findOne({jrId:joinedRideId},function(err,joinedRide){
        if(err){
            console.log('There was an error while retrieving the joined ride from the database');
            res.sendStatus(500);
        }else if(joinedRide!=null){
            var ownerCustomerNumber = joinedRide.ownerCustomerNumber;
            var joinedRideStatus = joinedRide.status;
            if(joinedRideStatus == 'notstarted' && ownerCustomerNumber != customerNumberFromToken){
                res.json({failure:'failure',message:'Sorry, the joined Ride has not yet started, and since you are not the owner, you cannot start the ride'})
            }else{
                var counter = joinedRide.counter;
                counter = counter +1;
                var statusMatrix = joinedRide.statusMatrix;
                statusMatrix[customerNumberFromToken] = 'started';
                var customersInTheCurrentLeg = joinedRide.customersInTheCurrentLeg;
                var customersInThePreviousLeg = joinedRide.customersInThePreviousLeg;
                if(customersInTheCurrentLeg.length == 0){
                    customersInTheCurrentLeg = [];
                    customersInThePreviousLeg = [];
                    customersInTheCurrentLeg.push(customerNumberFromToken);
                }else{
                    customersInThePreviousLeg = []
                    for(var index=0;index < customersInTheCurrentLeg.length;index++){
                        customersInThePreviousLeg.push(customersInTheCurrentLeg[index]);
                    }
                    customersInTheCurrentLeg.push(customerNumberFromToken);
                }
                var distanceMatrix = joinedRide.distanceMatrix;
                if(distanceMatrix == null) {
                    distanceMatrix = {};
                }
                if(distanceMatrix[customerNumberFromToken] == undefined){
                    distanceMatrix[customerNumberFromToken] = [];
                }
                var distanceObject = {};
                var tempmoment = moment().utcOffset("+05:30");
                var timeStamp = tempmoment.format('YYYY-MM-DD HH:mm:ss');
                distanceObject.timeStamp = timeStamp;
                distanceMatrix[customerNumberFromToken].push(distanceObject);
                var obj = {
                    customersInThePreviousLeg:customersInThePreviousLeg,
                    customersInTheCurrentLeg:customersInTheCurrentLeg,
                    counter:counter,
                    status:'started',
                    statusMatrix:statusMatrix,
                    distanceMatrix:distanceMatrix
                };
                //var serviceProviderFromJoinedRide = joinedRide.serviceProvider;
                if(customerNumberFromToken == ownerCustomerNumber){
                    //serviceProviderFromJoinedRide = serviceProvider;
                    obj.serviceProvider = serviceProvider;
                }

                JoinedRide.update({jrId:joinedRideId},obj,function(err,numberAffected){
                    if(err){
                        console.log('Some shit happened while updating the joined ride');
                        res.sendStatus(500);
                    }else if(numberAffected != null){
                        console.log('The number affected while updating the counter for the joined ride is '+numberAffected);
                        var customerNumberRideIdMap = joinedRide.customerNumberRideIdMap;
                        var rideId;
                        if(customerNumberFromToken == ownerCustomerNumber){
                            rideId = joinedRide.originalRideId
                        }else{
                            //var requestObject = requestMatrix[customerNumberFromToken];
                            rideId =  customerNumberRideIdMap[customerNumberFromToken]
                        }
                        console.log(customerNumberFromToken+':About to the update the rideId: '+rideId);
                        Ride.update({rideId:rideId},{status:'started'},function(err,numberAffected,raw){
                            if(err){
                                console.log('There was an error while updating the ride');
                                res.sendStatus(500);
                            }else if(numberAffected != null){
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
                                        if(partner.customerNumber !== customerNumberFromToken){
                                            registrationIds.push(partner.gcmId);
                                            console.log(customerNumberFromToken+':Sending startRideDistanceTravelled notification to: '+partner.gcmId+', and customerNumber: '+partner.customerNumber);
                                        }
                                    }

                                    var message = new gcm.Message({
                                        collapseKey: 'demo',
                                        delayWhileIdle: true,
                                        timeToLive: 3,
                                        data: {
                                            NotificationType: 'StartRideDistanceTravelled',
                                            rideid:joinedRideId
                                        }
                                    });
                                    sendGcmMessage(message, _.uniq(registrationIds))
                                        .then(function(data){
                                            console.log(data);
                                            res.json({success:'success',message:'Yaay, he should have received a message by now'})
                                        }).fail(function(data){
                                            console.error(err);
                                            res.json({failure:'failure',message:'Yaay, he should have received a message by now'})
                                        })
                                }else{
                                    res.json({success:'success',message:'the ride is started'})
                                }
                            }
                        })
                    }
                })
            }
        }else{
            /*Ride.findOne({rideId:joinedRideId},function(err,ride){
             if(err){
             console.log('There was an error while fetching the ride which must be started');
             res.json({failure:'failure',message:'There was an error while fetching the ride which must be started'})
             }else if(ride != null){
             // create a new joined ride, start it and update the ride
             var jrId = getUniqueId(32);
             var ownerCustomerNumber = customerNumberFromToken;
             var counter = 1;
             var status = 'started';
             var originalRideId = joinedRideId;
             var source = ride.source;
             var destination = ride.destination;
             var date = ride.date;
             var requestMatrix = ride.requestMatrix;
             var requests = ride.requests;
             var acceptedRideIds = [joinedRideId];
             var statusMatrix = {};
             statusMatrix[ride.customerNumber] = 'started';
             var city = ride.city;
             var pickUpLat = ride.pickUpLat;
             var pickUpLng = ride.pickUpLng;
             var dropLat = ride.dropLat;
             var dropLng = ride.dropLng;
             var phoneNumber = ride.phoneNumber;
             var overview_polyline = ride.overview_polyline;
             var customerNumberRideIdMap = {};
             customerNumberRideIdMap[ride.customerNumber] = joinedRideId;
             var ownerObject = {};
             ownerObject.customerNumber = ride.customerNumber;
             ownerObject.gcmId = ride.gcmId;
             ownerObject.phoneNumber = ride.phoneNumber;
             ownerObject.pickUpLatLng = ride.latlong;
             ownerObject.name = ride.name;
             var partners = [ownerObject];
             var joinedRideNew = new JoinedRide({
             jrId:jrId,
             counter:counter,
             status:status,
             originalRideId:originalRideId,
             source:source,
             destination:destination,
             date:date,
             requestMatrix:requestMatrix,
             requests:requests,
             acceptedRideIds:acceptedRideIds,
             statusMatrix:statusMatrix,
             city:city,
             pickUpLat:pickUpLat,
             pickUpLng:pickUpLng,
             dropLat:dropLat,
             dropLng:dropLng,
             phoneNumber:phoneNumber,
             overview_polyline:overview_polyline,
             customerNumberRideIdMap:customerNumberRideIdMap,
             partners:partners
             })

             joinedRideNew.save(function(err,jRide){
             if(err){
             console.log('There was an error while creating a joined ride for a started single ride: '+err);
             res.json({failure:'failure',message:'There was an error while creating a joined ride for a started single ride'});
             }else if(jRide != null){
             console.log('you have successfully started the ride');
             res.json({success:'success',message:'you have successfully started the ride'});
             }
             })
             }else
             console.log('There are no joined ride or ride to start the ride');
             res.json({failure:'failure',message:'There are no joined ride or ride to start the ride'})
             }
             })*/
        }
    })
});

/*
 {
 jrId:joined ride id
 distanceTravelled:distance travelled in kilometres. / this must be a float value
 latLngString:
 }
 */
app.post('/startRideDistanceTravelled',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var joinedRideId = req.body.jrId;
    //var distanceTravelled = calculateDistance(req.body.latLngString);
    var latLngString = req.body.latLngString;
    var latLngArray = latLngString.split('|');
    var startLatLng = latLngArray[0];
    var endLatLng = latLngArray[latLngArray.length-2];
    var start_latitude_array = startLatLng.split(',');
    var end_latitude_array = endLatLng.split(',');


    getDistanceBetweenTwoPointsGoogleDistanceMatrix(start_latitude_array,end_latitude_array)
        .then(function(data){
            var distanceTravelled = data;
            console.log('Distance travelled is: '+distanceTravelled);
            JoinedRide.findOne({jrId:joinedRideId},function(err,joinedRide){
                if(err){
                    console.log('There was an error while retrieving the joined ride from the database for updateDistanceTravelled');
                    res.sendStatus(500);
                }else if(joinedRide != null){
                    var distanceMatrix = joinedRide.distanceMatrix;
                    var counter = joinedRide.counter;
                    if(distanceMatrix == null) {
                        distanceMatrix = {};
                    }
                    if(distanceMatrix[customerNumber] == undefined){
                        distanceMatrix[customerNumber] = [];
                    }
                    var distanceObject = {};
                    distanceObject.distance = distanceTravelled;
                    distanceObject.partnerCount = counter-1;
                    var tempmoment = moment().utcOffset("+05:30");
                    var timeStamp = tempmoment.format('YYYY-MM-DD HH:mm:ss');
                    distanceObject.timeStamp = timeStamp;
                    distanceObject.customersInThisLeg = joinedRide.customersInThePreviousLeg;
                    distanceMatrix[customerNumber].push(distanceObject);
                    JoinedRide.update({jrId:joinedRideId},{distanceMatrix:distanceMatrix},function(err,numberAffected,raw){
                        if(err){
                            console.log('There was a problem while updating the distance matrix in a joined ride');
                            res.sendStatus(500);
                        }else if (numberAffected != 0){
                            console.log('The number of rows affected while updating the distanceMatrix: '+numberAffected);
                            console.log(customerNumber+':successfully updated the distanceMatrix');
                            res.json({success:'The joined ride distance matrix is updated'});
                        }
                    })
                }
            })
        }).fail(function(error){
            console.log('Error happened while getting distance ebtween two points using google distance matrix api');
            res.json({failure:'failure',message:'Error happened while getting distance ebtween two points using google distance matrix api'});
        })



})


/*
 jrId:send the joined ride id here
 distanceTravelled: distance travelled in KM.
 latLngString: the distance travelled in the string form
 */
app.post('/endRide',ensureAuthorized,function(req,res,next) {
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var joinedRideId = req.body.jrId;
    //var distanceTravelled = calculateDistance(req.body.latLngString);
    console.log('endRide latlongstring: '+req.body.latLngString);
    //var distanceTravelled = parseInt(req.body.distanceTravelled);

    var latLngString = req.body.latLngString;
    var latLngArray = latLngString.split('|');
    var startLatLng = latLngArray[0];
    var endLatLng = latLngArray[latLngArray.length-2];
    var start_latitude_array = startLatLng.split(',');
    var end_latitude_array = endLatLng.split(',');
    console.log(customerNumber+':Entered the endRide');

    getDistanceBetweenTwoPointsGoogleDistanceMatrix(start_latitude_array,end_latitude_array)
        .then(function(data){
            var distanceTravelled = data;
            console.log('Distance travelled is: '+distanceTravelled);
            JoinedRide.findOne({jrId: joinedRideId}, function (err, joinedRide) {
                if (err) {
                    console.log('There was an error while retrieving the joined ride from the database for updateDistanceTravelled');
                    res.sendStatus(500);
                } else if (joinedRide != null) {
                    var gcmIdsOfPartnersWhoseRidesAreStillNotEnded = [];
                    var gcmIdsOfPartnersWhoseRidesAreStillNotStarted = [];
                    var distanceMatrix = joinedRide.distanceMatrix;
                    var counter = joinedRide.counter;
                    console.log(customerNumber+':Counter value is: '+counter);
                    if (distanceMatrix == null) {
                        distanceMatrix = {};
                    }
                    if (distanceMatrix[customerNumber] == undefined) {
                        distanceMatrix[customerNumber] = [];
                    }
                    var distanceObject = {};
                    distanceObject.distance = distanceTravelled;
                    distanceObject.partnerCount = counter;
                    var customersInTheCurrentLeg = joinedRide.customersInTheCurrentLeg;
                    var customersInThePreviousLeg = []
                    distanceObject.customersInThisLeg = [];
                    for(var index=0;index < customersInTheCurrentLeg.length;index++){
                        customersInThePreviousLeg.push(customersInTheCurrentLeg[index]);
                        distanceObject.customersInThisLeg.push(customersInTheCurrentLeg[index]);
                    }
                    var tempmoment = moment().utcOffset("+05:30");
                    var timeStamp = tempmoment.format('YYYY-MM-DD HH:mm:ss');
                    distanceObject.timeStamp = timeStamp;
                    distanceMatrix[customerNumber].push(distanceObject);
                    var statusMatrix = joinedRide.statusMatrix;
                    var statusOfTheRide = joinedRide.status;
                    if(joinedRide.ownerCustomerNumber !== customerNumber){
                        statusMatrix[customerNumber] = 'ended';
                    }else{
                        statusMatrix[customerNumber] = 'ended';
                        statusOfTheRide = 'ended';
                    }
                    if( joinedRide.ownerCustomerNumber == customerNumber){
                        var partnersArray = joinedRide.partners;
                        for( var status in statusMatrix){
                            if(statusMatrix[status] == 'started' && status != customerNumber){
                                for(var partnersIndex=0;partnersIndex < partnersArray.length;partnersIndex++){
                                    var partnerObject = _.find(partnersArray,function(n){
                                        return n.customerNumber == status;
                                    });
                                    if(partnerObject != undefined){
                                        gcmIdsOfPartnersWhoseRidesAreStillNotEnded.push(partnerObject.gcmId);
                                    }
                                }
                            }
                            if(statusMatrix[status] == 'notstarted' && status != customerNumber){
                                for(var partnersIndex=0;partnersIndex < partnersArray.length;partnersIndex++){
                                    var partnerObject = _.find(partnersArray,function(n){
                                        return n.customerNumber == status;
                                    });
                                    if(partnerObject != undefined){
                                        gcmIdsOfPartnersWhoseRidesAreStillNotStarted.push(partnerObject.gcmId);
                                    }
                                }
                            }
                        }
                    }

                    if(customersInTheCurrentLeg.length != 0){
                        customersInTheCurrentLeg= _.remove(customersInTheCurrentLeg,function(n){
                            return n != customerNumber;
                        })
                    }
                    JoinedRide.update({jrId: joinedRideId}, {
                        customersInThePreviousLeg: customersInThePreviousLeg,
                        customersInTheCurrentLeg:customersInTheCurrentLeg,
                        statusMatrix: statusMatrix,
                        distanceMatrix: distanceMatrix,
                        counter: counter - 1,
                        status: statusOfTheRide
                    }, function (err, numberAffected, raw) {
                        if (err) {
                            console.log('There was a problem while updating the distance matrix in a joined ride');
                            res.sendStatus(500);
                        } else if (numberAffected != 0) {
                            console.log(customerNumber+':Successfully updated the joined ride during end ride');
                            console.log('The number of rows affected while updating the distanceMatrix due to endRide is: ' + numberAffected);
                            var customerNumberRideIdMap = joinedRide.customerNumberRideIdMap;
                            var rideId;
                            if(customerNumber !== joinedRide.ownerCustomerNumber){
                                rideId = customerNumberRideIdMap[customerNumber]; // use map instead of the requestMatrix, coz request matrix may become messed up
                                //rideId = requestObject.rideId;
                            }else{
                                rideId = joinedRide.originalRideId;
                            }
                            Ride.update({rideId: rideId}, {status: 'ended'}, function (err, numberAffected, raw) {
                                if (err) {
                                    console.log('There was a problem while updating the ride to ended');
                                    res.sendStatus(500);
                                } else if (numberAffected != null) {
                                    console.log('City: '+joinedRide.city+' , carModel: '+joinedRide.serviceProvider);
                                    UberModel.findOne({city:joinedRide.city,carModel:joinedRide.serviceProvider},function(err,uberModel){
                                        if (err) {
                                            console.log(err);
                                            res.sendStatus(500);
                                        } else if (uberModel != null) {
                                            var statusMatrix = joinedRide.statusMatrix;
                                            console.log(customerNumber+':Inside the Uber Model');
                                            var totalPartnerCount = 0;
                                            for(var a in statusMatrix){
                                                if(statusMatrix[a] == 'started' || statusMatrix[a] == 'ended'){
                                                    totalPartnerCount = totalPartnerCount + 1;
                                                }
                                            }
                                            var farePerKm = uberModel.farePerKm;
                                            var farePerMintute = uberModel.farePerMinute;
                                            var baseFare = uberModel.baseFare;
                                            var customerDistanceMatrix = distanceMatrix[customerNumber];
                                            var fareForDistanceTravelled = 0;
                                            var fareForTimeSpent = 0;
                                            var totalDistanceTravelled = 0;
                                            //var totalPartnerCount = joinedRide.partners.length;
                                            var previousTimeStamp;
                                            var currentTimeStamp;
                                            var totalTimeSpentInMinutes = 0;
                                            var someMatrix = [];
                                            var firstTimeStamp;
                                            var lastTimeStamp;
                                            for (var index = 0; index < customerDistanceMatrix.length; index++) {
                                                var distanceObject = {};
                                                distanceObject = customerDistanceMatrix[index];
                                                console.log('In Iteration:'+index);
                                                if (index == 0) {
                                                    baseFare = baseFare / totalPartnerCount;
                                                    previousTimeStamp = distanceObject.timeStamp;
                                                    firstTimeStamp = previousTimeStamp;
                                                } else {
                                                    if(index == customerDistanceMatrix.length-1){
                                                        lastTimeStamp = distanceObject.timeStamp;
                                                    }
                                                    var someMatrixObject = {};
                                                    console.log('previousTimeStamp: '+previousTimeStamp);
                                                    totalDistanceTravelled = totalDistanceTravelled + distanceObject.distance;
                                                    currentTimeStamp = distanceObject.timeStamp;
                                                    console.log('currentTimeStamp: '+currentTimeStamp);
                                                    var timeSpent = moment(currentTimeStamp).diff(moment(previousTimeStamp), 'minutes');
                                                    console.log('timeSpent: '+timeSpent);
                                                    totalTimeSpentInMinutes = totalTimeSpentInMinutes + timeSpent;
                                                    console.log('totaltimeSpent: '+totalTimeSpentInMinutes);
                                                    console.log('totalPartnerCount: '+totalPartnerCount);
                                                    var fareForTimeSpentInThisLeg =  ((timeSpent * farePerMintute) / totalPartnerCount);
                                                    fareForTimeSpent = fareForTimeSpent+fareForTimeSpentInThisLeg
                                                    var fareForDistanceTravelledInThisLeg =  (distanceObject.distance / distanceObject.partnerCount) * farePerKm;
                                                    fareForDistanceTravelled  = fareForDistanceTravelled + fareForDistanceTravelledInThisLeg;
                                                    someMatrixObject.fareForThisLeg = +fareForDistanceTravelledInThisLeg.toFixed(2);
                                                    someMatrixObject.fareForTimeSpentInThisLeg = +fareForTimeSpentInThisLeg.toFixed(2);
                                                    someMatrixObject.timeSpendInThisLeg = timeSpent;
                                                    someMatrixObject.distanceTravelledInThisLeg = +distanceObject.distance.toFixed(2);
                                                    var customersInThisLeg = distanceObject.customersInThisLeg;
                                                    var partners = joinedRide.partners;
                                                    someMatrixObject.partners = [];
                                                    for(var customersInThisLegIndex=0;customersInThisLegIndex < customersInThisLeg.length;customersInThisLegIndex++){
                                                        var currentPartner = customersInThisLeg[customersInThisLegIndex]
                                                        var partnerObject = _.find(partners,function(n){
                                                            return n.customerNumber == currentPartner;
                                                        });
                                                        if(partnerObject != undefined){
                                                            someMatrixObject.partners.push(partnerObject);
                                                        }
                                                    }
                                                    someMatrix.push(someMatrixObject);
                                                    console.log('fareForDistanceTravelled: '+fareForDistanceTravelled);
                                                    previousTimeStamp = currentTimeStamp;
                                                }
                                            }
                                            var totalFare = fareForDistanceTravelled+fareForTimeSpent+baseFare;
                                            totalFare = +totalFare.toFixed(2);

                                            fareForDistanceTravelled = +fareForDistanceTravelled.toFixed(2);
                                            fareForTimeSpent = +fareForTimeSpent.toFixed(2);
                                            totalDistanceTravelled = +totalDistanceTravelled.toFixed(2);
                                            var uniqueId = getUniqueId(32);
                                            var tempmoment = moment().utcOffset("+05:30");
                                            var dateNow = tempmoment.format('YYYY-MM-DDTHH:mm:ss');
                                            dateNow = dateNow+'.000Z';
                                            var completedRide = new CompletedRide({
                                                uniqueId:uniqueId,
                                                rideId:rideId,
                                                jrId:joinedRide.jrId,
                                                someMatrix: someMatrix,
                                                rideStartedAt:firstTimeStamp,
                                                rideEndedAt:lastTimeStamp,
                                                totalFare:totalFare,
                                                baseFare:baseFare,
                                                fareForDistanceTravelled:fareForDistanceTravelled,
                                                fareForTimeSpent:fareForTimeSpent,
                                                customerNumber:customerNumber,
                                                endDate:dateNow
                                            })

                                            console.log('Final, fareForDistanceTravelled:'+fareForDistanceTravelled+' ,fareForTimeSpent:'+fareForTimeSpent);
                                            console.log(customerNumber+':Inside the Uber Model');
                                            if (counter > 1) {
                                                console.log(customerNumber+':Inside if condition of counter');
                                                var registrationIds = [];
                                                var partners = joinedRide.partners;
                                                var statusMatrix = joinedRide.statusMatrix;
                                                for (var partnerIndex = 0; partnerIndex < partners.length; partnerIndex++) {
                                                    var partner = partners[partnerIndex];
                                                    if (partner.customerNumber !== customerNumber && statusMatrix[partner.customerNumber] == 'started') {
                                                        registrationIds.push(partner.gcmId);
                                                        console.log(customerNumber+': about to send endRideDistanceTravelled notification to customerNumber: '+partner.customerNumber+' and gmcId:  '+partner.gcmId);
                                                    }
                                                }

                                                var message = new gcm.Message({
                                                    collapseKey: 'demo',
                                                    delayWhileIdle: true,
                                                    timeToLive: 3,
                                                    data: {
                                                        NotificationType: 'EndRideDistanceTravelled',
                                                        rideid: joinedRideId,
                                                        message: 'post the distance travelled so far'
                                                    }
                                                });
                                                //var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                                                //registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                                                //registrationIds.push(regId);
                                                sendGcmMessage(message,registrationIds)
                                                    .then(function(data){
                                                        if(gcmIdsOfPartnersWhoseRidesAreStillNotEnded.length > 0){
                                                            var message = new gcm.Message({
                                                                collapseKey: 'demo',
                                                                delayWhileIdle: true,
                                                                timeToLive: 3,
                                                                data: {
                                                                    NotificationType: 'OwnerHasEndedTheRide',
                                                                    rideid: joinedRideId,
                                                                    message: 'post the distance travelled so far'
                                                                }
                                                            });
                                                            sendGcmMessage(message,_.uniq(gcmIdsOfPartnersWhoseRidesAreStillNotEnded))
                                                                .then(function(data){
                                                                    if(gcmIdsOfPartnersWhoseRidesAreStillNotStarted.length > 0){
                                                                        var message = new gcm.Message({
                                                                            collapseKey: 'demo',
                                                                            delayWhileIdle: true,
                                                                            timeToLive: 3,
                                                                            data: {
                                                                                NotificationType: 'OwnerHasEndedTheRideDontPostEndRide',
                                                                                rideid: joinedRideId,
                                                                                message: 'owner has ended the ride, dont post end ride'
                                                                            }
                                                                        });
                                                                        sendGcmMessage(message, _.uniq(gcmIdsOfPartnersWhoseRidesAreStillNotStarted))
                                                                            .then(function(data){
                                                                                completedRide.save(function(err,completedRide){
                                                                                    if(err){
                                                                                        console.log(err);
                                                                                        res.sendStatus(500)
                                                                                    }else if( completedRide != null){
                                                                                        var customerDetails = req.customer;
                                                                                        res.json({
                                                                                            distanceTravelled: totalDistanceTravelled,
                                                                                            totalSharedFare: totalFare,
                                                                                            totalTimeSpent: totalTimeSpentInMinutes,
                                                                                            completedRide:completedRide
                                                                                        });
                                                                                    }
                                                                                })
                                                                            }).fail(function(data){
                                                                                console.log('Error while sending GCM motification: '+data);
                                                                                res.json({failure:'failure',message:'Error while sending GCM motification'});
                                                                            })
                                                                    }else{
                                                                        completedRide.save(function(err,completedRide){
                                                                            if(err){
                                                                                console.log(err);
                                                                                res.sendStatus(500)
                                                                            }else if( completedRide != null){
                                                                                var customerDetails = req.customer;
                                                                                res.json({
                                                                                    distanceTravelled: totalDistanceTravelled,
                                                                                    totalSharedFare: totalFare,
                                                                                    totalTimeSpent: totalTimeSpentInMinutes,
                                                                                    completedRide:completedRide
                                                                                });
                                                                            }
                                                                        })
                                                                    }
                                                                }).fail(function(data){
                                                                    console.log('Error while sending GCM motification: '+data);
                                                                    res.json({failure:'failure',message:'Error while sending GCM motification'})
                                                                })
                                                        }else{
                                                            if(gcmIdsOfPartnersWhoseRidesAreStillNotStarted.length > 0){
                                                                var message = new gcm.Message({
                                                                    collapseKey: 'demo',
                                                                    delayWhileIdle: true,
                                                                    timeToLive: 3,
                                                                    data: {
                                                                        NotificationType: 'OwnerHasEndedTheRideDontPostEndRide',
                                                                        rideid: joinedRideId,
                                                                        message: 'owner has ended the ride, dont post end ride'
                                                                    }
                                                                });
                                                                sendGcmMessage(message, _.uniq(gcmIdsOfPartnersWhoseRidesAreStillNotStarted))
                                                                    .then(function(data){
                                                                        completedRide.save(function(err,completedRide){
                                                                            if(err){
                                                                                console.log(err);
                                                                                res.sendStatus(500)
                                                                            }else if( completedRide != null){
                                                                                var customerDetails = req.customer;
                                                                                res.json({
                                                                                    distanceTravelled: totalDistanceTravelled,
                                                                                    totalSharedFare: totalFare,
                                                                                    totalTimeSpent: totalTimeSpentInMinutes,
                                                                                    completedRide:completedRide
                                                                                });
                                                                            }
                                                                        })
                                                                    }).fail(function(data){
                                                                        console.log('Error while sending GCM motification: '+data);
                                                                        res.json({failure:'failure',message:'Error while sending GCM motification'});
                                                                    })
                                                            }else{
                                                                completedRide.save(function(err,completedRide){
                                                                    if(err){
                                                                        console.log(err);
                                                                        res.sendStatus(500)
                                                                    }else if( completedRide != null){
                                                                        var customerDetails = req.customer;
                                                                        res.json({
                                                                            distanceTravelled: totalDistanceTravelled,
                                                                            totalSharedFare: totalFare,
                                                                            totalTimeSpent: totalTimeSpentInMinutes,
                                                                            completedRide:completedRide
                                                                        });
                                                                    }
                                                                })
                                                            }
                                                        }
                                                    }).fail(function(data){
                                                        console.log('Error while sending GCM notification: '+data);
                                                    })
                                                /*sender.send(message, registrationIds, 2, function (err, result) {
                                                 if (err) {
                                                 console.error(err);
                                                 }
                                                 else {
                                                 console.log(result);
                                                 if(gcmIdsOfPartnersWhoseRidesAreStillNotEnded.length > 0){
                                                 console.log(customerNumber+':Inside if gcmIdsOfPartners condition');
                                                 var message = new gcm.Message({
                                                 collapseKey: 'demo',
                                                 delayWhileIdle: true,
                                                 timeToLive: 3,
                                                 data: {
                                                 NotificationType: 'OwnerHasEndedTheRide',
                                                 rideid: joinedRideId,
                                                 message: 'post the distance travelled so far'
                                                 }
                                                 });
                                                 var sender = new gcm.Sender('AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8');
                                                 console.log(customerNumber+':sending owner has ended the ride notification to the customer: '+gcmIdsOfPartnersWhoseRidesAreStillNotEnded[0]);
                                                 sender.send(message,_.uniq(gcmIdsOfPartnersWhoseRidesAreStillNotEnded),2,function(err,result){
                                                 if(err){
                                                 console.log(err);
                                                 res.sendStatus(500);
                                                 } else if(result != null){
                                                 completedRide.save(function(err,completedRide){
                                                 if(err){
                                                 console.log(err);
                                                 res.sendStatus(500)
                                                 }else if( completedRide != null){
                                                 var customerDetails = req.customer;
                                                 res.json({
                                                 distanceTravelled: totalDistanceTravelled,
                                                 totalSharedFare: totalFare,
                                                 totalTimeSpent: totalTimeSpentInMinutes,
                                                 completedRide:completedRide
                                                 });
                                                 }
                                                 })
                                                 }
                                                 })
                                                 }else{
                                                 console.log(customerNumber+':Inside else condition of the gcmIdsOf condition');
                                                 completedRide.save(function(err,completedRide){
                                                 if(err){
                                                 console.log(err);
                                                 res.sendStatus(500)
                                                 }else if( completedRide != null){
                                                 var customerDetails = req.customer;
                                                 res.json({
                                                 distanceTravelled: totalDistanceTravelled,
                                                 totalSharedFare: totalFare,
                                                 totalTimeSpent: totalTimeSpentInMinutes,
                                                 completedRide:completedRide
                                                 });
                                                 }
                                                 })
                                                 }

                                                 }
                                                 })*/
                                            }
                                            else{
                                                completedRide.save(function(err,completedRide){
                                                    if(err){
                                                        console.log(err);
                                                        res.sendStatus(500)
                                                    }else if( completedRide != null){
                                                        var customerDetails = req.customer;
                                                        res.json({
                                                            distanceTravelled: totalDistanceTravelled,
                                                            totalSharedFare: totalFare,
                                                            totalTimeSpent: totalTimeSpentInMinutes,
                                                            completedRide:completedRide
                                                        });
                                                    }
                                                })
                                            }
                                        }else{
                                            res.json({failure:'failure',message:'could not find the uber model'});
                                        }
                                    });
                                } else {
                                    console.log('Unable to find the corresponding car model for the service provider in the DB');
                                    res.json({
                                        failure: 'failure',
                                        message: 'Unable to find the corresponding car model for the service provider in the DB'
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }).fail(function(error){
            console.log('Error happened while getting distance ebtween two points using google distance matrix api');
            res.json({failure:'failure',message:'Error happened while getting distance ebtween two points using google distance matrix api'});
        })
})



/*

 {
 jrId:joined ride id
 latLngString: lat long string sent from the mobile app
 }

 */
app.post('/endRideDistanceTravelled',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var joinedRideId = req.body.jrId;
    //var distanceTravelled = calculateDistance(req.body.latLngString);
    //console.log('endRideDistanceTravelled latlongstring: '+req.body.latLngString);
    //var distanceTravelled = parseInt(req.body.distanceTravelled);

    var latLngString = req.body.latLngString;
    var latLngArray = latLngString.split('|');
    var startLatLng = latLngArray[0];
    var endLatLng = latLngArray[latLngArray.length-2];
    var start_latitude_array = startLatLng.split(',');
    var end_latitude_array = endLatLng.split(',');

    getDistanceBetweenTwoPointsGoogleDistanceMatrix(start_latitude_array,end_latitude_array)
        .then(function(data){
            var distanceTravelled = data;
            console.log('Distance travelled is: '+distanceTravelled);
            JoinedRide.findOne({jrId:joinedRideId},function(err,joinedRide){
                if(err){
                    console.log('There was an error while retrieving the joined ride from the database for updateDistanceTravelled');
                    res.sendStatus(500);
                }else if(joinedRide != null){
                    var distanceMatrix = joinedRide.distanceMatrix;
                    var counter = joinedRide.counter;
                    if(distanceMatrix == null) {
                        distanceMatrix = {};
                    }
                    if(distanceMatrix[customerNumber] == undefined){
                        distanceMatrix[customerNumber] = [];
                    }
                    var distanceObject = {};
                    distanceObject.distance = distanceTravelled;
                    distanceObject.partnerCount = counter+1;
                    var tempmoment = moment().utcOffset("+05:30");
                    var timeStamp = tempmoment.format('YYYY-MM-DD HH:mm:ss');
                    console.log('The timeStamp being posted in the endRideWithDistanceTravelled is: '+timeStamp);
                    distanceObject.timeStamp = timeStamp;
                    distanceObject.customersInThisLeg = joinedRide.customersInThePreviousLeg;
                    distanceMatrix[customerNumber].push(distanceObject);
                    JoinedRide.update({jrId:joinedRideId},{distanceMatrix:distanceMatrix},function(err,numberAffected,raw){
                        if(err){
                            console.log('There was a problem while updating the distance matrix in a joined ride');
                            res.sendStatus(500);
                        }else if (numberAffected != 0){
                            console.log('The number of rows affected while updating the distanceMatrix: '+numberAffected);
                            res.json({success:'yaay the end ride distance matrix is updated'});
                        }
                    })
                }
            })
        }).fail(function(error){
            console.log('Error happened while getting distance ebtween two points using google distance matrix api');
            res.json({failure:'failure',message:'Error happened while getting distance ebtween two points using google distance matrix api'});
        })
})

/*
 {
 jrId:joinedride Id ( required )
 customerNumber: customerNumber,
 action : (remove,exit) (required)
 }
 This url must be used both the times when u want to exit a joinedride or u want to remove someone from the
 joined ride. If u send the customerNumber that means u are the owner and u want to remove that person from
 the joined ride, if u dont send the customerNumber, the customer number will be taken from the token and
 u will be removed from the joinedRide.
 */
app.post('/removeFromTheJoinedRide',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumberExiting = decodedToken.customerNumber;
    var customerNumberToBeRemoved = req.body.customerNumber;
    var jrId = req.body.jrId;
    var action = req.body.action;

    if(action == 'remove'){
        removeCustomerFromTheJoinedRide(jrId,customerNumberExiting,customerNumberToBeRemoved,res);
    }else if( action == 'exit'){
        exitFromTheJoinedRide(jrId,customerNumberExiting,res);
    }else{
        console.log('Sorry, the action value did not match with any of the pre existing options. action: '+action);
        res.json({failure:'failure',message:'Sorry, the action value did not match with any of the pre existing options'});
    }
    /*if(customerNumberToBeRemoved == undefined || customerNumberToBeRemoved == null){
     customerNumberToBeRemoved = ownerCustomerNumber;
     }
     removeFromTheJoinedRide(jrId,customerNumberToBeRemoved,res);*/
})


/*

 {
 rideId:ride id
 }

 */
app.post('/getRideDetails',ensureAuthorized,function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var rideId = req.body.rideId;

    JoinedRide.findOne({jrId:rideId},function(err,jride){
        if(err){
            console.log('There was an error while retrieving the details of joined Ride: '+err);
            res.sendStatus(500);
        }
        else if(jride != null){
            console.log('Successfully retrieved the joined ride');
            var partners = jride.partners;
            var customers = [];
            var customerNumbers = [];
            var customersPickUpLatLngMatrix = {};
            var customersPhoneNumberMatrix = {};
            var sourceLatLng = {};
            var destinationLatLng = {};
            var customersDropLatLngMatrix = {};
            var acceptedRideIds = jride.acceptedRideIds;
            acceptedRideIds.push(jride.originalRideId);
            Ride.find({rideId:{"$in":acceptedRideIds}},function(err,rides){
                if(err){
                    console.log(err);
                    res.json({failure:'failure',message:'There was an error while retrieving rides from the database'});
                }else if(rides.length > 0){
                    for(var rideIndex =0; rideIndex < rides.length;rideIndex ++){
                        var currentRide = rides[rideIndex];
                        customerNumbers.push(currentRide.customerNumber);
                        customersPickUpLatLngMatrix[currentRide.customerNumber] = currentRide.pickUpLat+','+currentRide.pickUpLng;
                        customersDropLatLngMatrix[currentRide.customerNumber] = currentRide.dropLat+','+currentRide.dropLng;
                        customersPhoneNumberMatrix[currentRide.customerNumber] = currentRide.phoneNumber;
                        sourceLatLng[currentRide.customerNumber] = currentRide.sourceLat+','+currentRide.sourceLng;
                        destinationLatLng[currentRide.customerNumber] = currentRide.destinationLat+','+currentRide.destinationLng;
                    }
                    Customer.find({customerNumber:{'$in':customerNumbers}},function(err,rideCustomers){
                        if(err){
                            console.log('There was an error while retrieving customers from database during geRideDetails');
                            res.sendStatus(500);
                        }else if(rideCustomers.length > 0){
                            for(var index = 0; index < rideCustomers.length;index++){
                                var cust = rideCustomers[index];
                                var obj = {};
                                obj.customerNumber =cust.customerNumber;
                                obj.pickUplatLng = customersPickUpLatLngMatrix[cust.customerNumber];
                                obj.phoneNumber = customersPhoneNumberMatrix[cust.customerNumber];
                                obj.email = cust.email;
                                obj.name = cust.name;
                                obj.gender = cust.gender;
                                obj.sourceLatLng = sourceLatLng[cust.customerNumber];
                                obj.destinationLatLng = destinationLatLng[cust.customerNumber];
                                obj.profileId = cust.profileId;
                                obj.customersDropLatLngMatrix = customersDropLatLngMatrix[cust.customerNumber];
                                customers.push(obj);
                            }
                            console.log('The joined ride details are being sent back successfully');
                            res.json({jride:jride,builtDetails:customers});
                        }
                        else{
                            console.log('Could not find any customer profiles for the customers specified in the rides');
                            res.json({failure:'failure',message:'Could not find any customer profiles for the customers specified in the rides'});
                        }
                    })
                }else{
                    console.log('Could not find any rides as specified in the acceptedIds');
                    res.json({failure:'failure',message:'Could not find any rides as specified in the acceptedIds'});
                }
            })
        }else{
            Ride.findOne({rideId:rideId},function(err,ride){
                if(err){
                    console.log('There was an error while retrieving the details of Ride: '+err);
                    res.sendStatus(500);
                }
                else if(ride != null){
                    console.log('Successfully retrieved the ride');
                    Customer.findOne({customerNumber:ride.customerNumber},function(err,customer){
                        if(err){
                            console.log('There was an error while retrieving the details of Ride: '+err);
                            res.sendStatus(500);
                        }
                        else if(customer != null){
                            console.log('Successfully retrieved the customer');
                            res.json({ride:ride,owner:customer});
                        }else{
                            console.log('could not find the customer for the corresponding ride');
                            res.json({failure:'failure',message:'could not find the customer for the corresponding ride'});
                        }
                    })
                }else{
                    console.log('Could not find the ride');
                    res.json({failure:'failure',message:'could not find the ride'});
                }
            })
        }
    })
})

/*
 returns all the rides that have a particular status without time limit.
 {
 status:notstarted,started,ended
 }
 */
app.post('/getride_single',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var status = req.body.status;
    if(status == undefined || status == null){
        status = 'notstarted';
    }
    Ride.find({customerNumber:customerNumber,status:status,jrId:0},function(err,rides){
        if(err){
            console.log('There was an error while retrieving the rides from the database');
            res.sendStatus(500);
        }else if(rides != null && rides.length > 0){
            res.json({success:'success',rides:rides});
            console.log('The rides for a particular customer have been successfully retrieved');
        }else{
            res.json({success:'success',rides:[]});
        }
    }).sort({"date":-1});
})

/*
 returns all the joinedrides that have not started and without time limit.
 {
 /*status:notstarted,started,ended only token is enough */
//}
//*/
app.post('/getride_joinedride',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var status = req.body.status;
    if(status == undefined || status == null){
        status = 'notstarted';
    }
    var query = {};
    var criteria = "partners.customerNumber";
    query[criteria] = customerNumber;
    /*var criteria1 = "status";
     query[criteria1] = status;*/
    JoinedRide.find({"$or":[query,{ownerCustomerNumber:customerNumber}]},function(err,joinedRides){
        if(err){
            console.log('There was an error while retrieving joined rides');
            res.sendStatus(500);
        } else if(joinedRides.length > 0){
            res.json({success:'success',jrides:joinedRides});
        }else{
            res.json({success:'success',jrides:[]});
        }
    }).sort({"date":-1});
})

/*
 Returns all the joined rides which are completed without time limit.
 */
app.post('/getride_completedrides',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var query = {};
    var criteria = "requestMatrix."+ customerNumber+".status";
    query[criteria] = "ended";
    CompletedRide.find({customerNumber:customerNumber},function(err,completedrides){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if( completedrides.length > 0){
            var completedRidesArray = [];
            for(var index=0;index < completedrides.length;index++){
                var currentCompletedRide = completedrides[index];
                var summaryOfCompletedRide = {};
                summaryOfCompletedRide.rideStartedAt =currentCompletedRide.rideStartedAt;
                summaryOfCompletedRide.rideEndedAt = currentCompletedRide.rideEndedAt;
                summaryOfCompletedRide.baseFare = currentCompletedRide.baseFare;
                summaryOfCompletedRide.fareForDistanceTravelled = currentCompletedRide.fareForDistanceTravelled;
                summaryOfCompletedRide.fareForTimeSpent = currentCompletedRide.fareForTimeSpent;
                summaryOfCompletedRide.totalFare = currentCompletedRide.totalFare;
                summaryOfCompletedRide.uniqueId = currentCompletedRide.uniqueId;
                completedRidesArray.push(summaryOfCompletedRide);
            }
            res.json({success:'success',completedRides:completedRidesArray});
        }else{
            res.json({message:'sorry you do not have any completed rides so far'});
        }
    }).sort({"endDate":-1});
})


/*{
 rideId:rideId(This can be a ride ID or a joined Ride id the one that the requester sees in the search results.
 ownerCustomerNumber: The customerNumber of the owner of the ride
 requestingCustomerNumber: The requesting customer's customerNUmber
 rRideId:The ride Id of the ride of which the customer is sending the request
 }*/

app.post('/sendRequestToJoinTheRideOrJoinedRide',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var requestId = getUniqueId(32);
    var ownerCustomerNumber = req.body.ownerCustomerNumber;
    // this will come from the token
    var requestingCustomerNumber = decodedToken.customerNumber;
    var rideId = req.body.rideId;
    var rRideId = req.body.rRideId;

    Customer.find({customerNumber:{'$in':[ownerCustomerNumber,requestingCustomerNumber]}},function(err,customers){
        var requester = {};
        var owner = {};
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
                console.log('Here i am after assigning');
            }else{
                console.log('Some shit happened when the customers were being queried')
                res.sendStatus(500);
            }

            Ride.find({rideId:{"$in":[rideId,rRideId]}},function(err,rides){
                if(err){
                    console.log('There was an error while retrieving the ride from database');
                    res.sendStatus(500)
                }else if(rides.length > 0){
                    var ownerride = {};
                    var requesterride = {};
                    if(rides[0].rideId == rRideId){
                        ownerride = rides[1];
                        requesterride = rides[0];
                    }else{
                        ownerride = rides[0];
                        requesterride = rides[1];
                    }
                    if(ownerride != null){
                        Request.findOne({rideId:{"$in":[rideId,rRideId]},rRideId:{"$in":[rideId,rRideId]},ownercustomerNumber:{"$in":[ownerCustomerNumber,requestingCustomerNumber]},requesterCustomerNumber:{"$in":[ownerCustomerNumber,requestingCustomerNumber]},requesterSource:{"$in":[requesterride.source,ownerride.source]},requesterDestination:{"$in":[requesterride.destination,ownerride.destination]},requesterDate:{"$in":[requesterride.date,ownerride.date]}},function(err,request) {
                            if (err) {
                                console.log(err);
                                res.json({
                                    failure: 'failure',
                                    message: 'The request could not be queried due to this error'
                                });
                            }
                            else if (request == null || request == undefined) {
                                var tempmoment = moment().utcOffset("+05:30");
                                var dateNow = tempmoment.format('YYYY-MM-DDTHH:mm:ss');
                                dateNow = dateNow+'.000Z';
                                var request = new Request({
                                    requestId:requestId,
                                    rideId:rideId,
                                    rRideId:rRideId,
                                    ownercustomerNumber:ownerCustomerNumber,
                                    requesterCustomerNumber:requestingCustomerNumber,
                                    status:'requestsent',
                                    date:dateNow,
                                    requesterSource:requesterride.source,
                                    requesterDestination:requesterride.destination,
                                    requesterDate:requesterride.date
                                });

                                request.save(function(err,request){
                                    if(err){
                                        console.log('There was an error while saving the request object');
                                        res.sendStatus(500)
                                    }else if(request != null){
                                        var requestMatrix = ownerride.requestMatrix;
                                        /*if(requestMatrix == null){
                                         requestMatrix = {};
                                         }*/
                                        var requestObject = {};
                                        requestObject.status = 'requestsent';
                                        requestObject.rRideId = rRideId;
                                        requestObject.requestId = requestId;
                                        requestMatrix[requestingCustomerNumber] = requestObject;
                                        Ride.update({rideId:rideId},{"$push":{requests:requestId},"$set":{requestMatrix:requestMatrix}},function(err,numberAffected,raw){
                                            if(err){
                                                console.log('there was an error while updating the requests array in the ride');
                                                res.sendStatus(500);
                                            } else if (numberAffected != null){
                                                // send the message to the owner of the ride that this person is requesting to join your ride
                                                var registrationIds = [];
                                                //registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                                                //registrationIds.push('APA91bHEl3dtjuB13FfNrkXiZ6UlNpCGcfi0_rHEBM89SBnvPsHGO38fZUQb9C3naCrRtSmnvV6r0PdoKjWHKEMg8j88zNmXyFPzHfvX8XLyrDzMJdbGgsiZ-YPdGxzibtQBMBrwY99ynqfISdE3xyz93767qa1_Dg');
                                                console.log('Sending the request to join to gcmId: '+owner.gcmId);
                                                registrationIds.push(owner.gcmId);
                                                var message = new gcm.Message({
                                                    collapseKey: 'demo',
                                                    delayWhileIdle: true,
                                                    timeToLive: 3,
                                                    data: {
                                                        NotificationType: 'requestToJoinTheRide',
                                                        requestId: requestId,
                                                        source:requesterride.source,
                                                        destination:requesterride.destination,
                                                        requesterCustomerName:requester.name,
                                                        requesterCustomerPhoneNumber:requesterride.phoneNumber
                                                    }
                                                });
                                                sendMessage(message,registrationIds,res,'You have successfully sent the request to join');
                                            }
                                        })
                                    }
                                })
                            } else {
                                // there already a request exists
                                res.json({
                                    failure: 'failure',
                                    message: 'There is already a request sent to you by the owner of this ride or you have already sent request to this ride'
                                })
                            }
                        })
                    }else{
                        JoinedRide.findOne({jrId:rideId},function(err,joinedRide){
                            if(err){
                                console.log('There was an error while retrieving the ride from database');
                                res.sendStatus(500)
                            } else if(joinedRide != null){
                                // see if the request exists here between the joined ride and the ride
                                Request.findOne({rideId:{"$in":[rideId,rRideId]},rRideId:{"$in":[rideId,rRideId]},ownercustomerNumber:{"$in":[ownerCustomerNumber,requestingCustomerNumber]},requesterCustomerNumber:{"$in":[ownerCustomerNumber,requestingCustomerNumber]},requesterSource:{"$in":[requesterride.source,joinedRide.source]},requesterDestination:{"$in":[requesterride.destination,joinedRide.destination]},requesterDate:{"$in":[requesterride.date,joinedRide.date]}},function(err,request) {
                                    if(err){
                                        console.log(err);
                                        res.json({
                                            failure: 'failure',
                                            message: 'The request could not be queried due to this error'
                                        });
                                    }else if( request != null){
                                        res.json({
                                            failure: 'failure',
                                            message: 'There is already a request sent to you by the owner of this ride or you have already sent request to this ride'
                                        })
                                    }else{
                                        var tempmoment = moment().utcOffset("+05:30");
                                        var dateNow = tempmoment.format('YYYY-MM-DDTHH:mm:ss');
                                        dateNow = dateNow+'.000Z'
                                        var request = new Request({
                                            requestId:requestId,
                                            rideId:joinedRide.jrId,
                                            rRideId:rRideId,
                                            ownercustomerNumber:ownerCustomerNumber,
                                            requesterCustomerNumber:requestingCustomerNumber,
                                            status:'requestsent',
                                            date:dateNow,
                                            requesterSource:requesterride.source,
                                            requesterDestination:requesterride.destination,
                                            requesterLatLong:requesterride.latlong,
                                            requesterDate:requesterride.date
                                        });

                                        request.save(function(err,request){
                                            if(err){
                                                console.log('There was an error while saving the request object: '+err);
                                                res.sendStatus(500)
                                            }else if(request != null){
                                                var requestMatrix = joinedRide.requestMatrix;
                                                /*if(requestMatrix == null){
                                                 requestMatrix = {};
                                                 }*/
                                                var requestObject = {};
                                                requestObject.status = 'requestsent';
                                                requestObject.rRideId = rRideId;
                                                requestObject.requestId = requestId;
                                                requestMatrix[requestingCustomerNumber] = requestObject;
                                                JoinedRide.update({jrId:rideId},{"$push":{requests:requestId},"$set":{requestMatrix:requestMatrix}},function(err,numberAffected,raw){
                                                    if(err){
                                                        console.log('there was an error while updating the requests array in the ride');
                                                        res.sendStatus(500);
                                                    } else if (numberAffected != null){
                                                        // send the message to the owner of the ride that this person is requesting to join your ride
                                                        var registrationIds = [];
                                                        //registrationIds.push('APA91bEp4ge85-_h79M8Hw0AdcGOQKapuqdTTt9GYEDXm80b2aWaV1PX20iUzEWFJ1ZpQ-Sjiw5mazwv3oEjXjoUtLHKijAP7UCzyuzmFaKSL-lpZz72-gSn5HUO79MkI_GtIzU0jx5V8YwJZ8a4mWg9S-DWdhEOZcvtW4B8jC3x6LmUYYg7Ei0');
                                                        //registrationIds.push('APA91bHEl3dtjuB13FfNrkXiZ6UlNpCGcfi0_rHEBM89SBnvPsHGO38fZUQb9C3naCrRtSmnvV6r0PdoKjWHKEMg8j88zNmXyFPzHfvX8XLyrDzMJdbGgsiZ-YPdGxzibtQBMBrwY99ynqfISdE3xyz93767qa1_Dg');
                                                        console.log('Sending the request to join to gcmId: '+owner.gcmId);
                                                        registrationIds.push(owner.gcmId);
                                                        var message = new gcm.Message({
                                                            collapseKey: 'demo',
                                                            delayWhileIdle: true,
                                                            timeToLive: 3,
                                                            data: {
                                                                NotificationType: 'requestToJoinTheRide',
                                                                requestId: requestId,
                                                                source:requesterride.source,
                                                                destination:requesterride.destination,
                                                                phoneNumber:requesterride.phoneNumber,
                                                                requesterCustomerName:requester.name
                                                            }
                                                        });
                                                        sendMessage(message,registrationIds,res,'You have successfully sent the request to join');
                                                    }
                                                })
                                            }
                                        })
                                    }
                                })


                            }else{
                                console.log('no such ride or joined ride exist');
                                res.sendStatus(404);
                            }
                        })
                    }


                } else {
                    res.json({failure:'failure',message:'The rides do not exist'})
                }
            })
        }else{
            res.json({failure:'failure',message:'The customers do not exist'})
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
 requestId:requestId of the ride
 status:accept/reject
 }
 */
app.post('/acceptOrRejectTheRequestToJoin',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var ownerCustomerNumber = decodedToken.customerNumber;
    var requestId = req.body.requestId;
    var status = req.body.status;
    var owner = {};
    var requester = {};
    var ownerride = {};
    var requesterride = {};
    if(status == "accept"){
        Request.findOne({requestId:requestId},function(err,request){
            if(err){
                console.log('There was an error while retrieving the request from database');
                res.sendStatus(500);
            }else if(request !=null){
                var custs = [];
                custs.push(ownerCustomerNumber);
                custs.push(request.requesterCustomerNumber);
                Customer.find({customerNumber:{"$in":custs}},function(err,customers){
                    if(err){
                        console.log('There was an error while retrievig the owner customer details');
                        res.sendStatus(500);
                    }else if(customers.length > 0){
                        if(customers[0].customerNumber == ownerCustomerNumber){
                            owner = customers[0];
                            requester = customers[1];
                        }else if(customers[1].customerNumber == ownerCustomerNumber){
                            owner = customers[1];
                            requester = customers[0];
                        }
                        Ride.find({rideId:{"$in":[request.rideId,request.rRideId]}},function(err,rides){
                            if(err){
                                console.log('There was an error while retrieving the owner ride details');
                                res.sendStatus(500);
                            } else if(rides.length >0){
                                if( rides[0].rideId == request.rideId){
                                    ownerride = rides[0];
                                    requesterride = rides[1]
                                }else{
                                    ownerride = rides[1];
                                    requesterride = rides[0];
                                }
                                if(ownerride == null || ownerride == undefined){
                                    /*
                                     1. jride exists, so what we need to do is
                                     2. update the request's status
                                     3. send a message to the requester
                                     4. update the request matrix in the joinedride, partners array
                                     5. update the rRide with the jride Id
                                     */
                                    JoinedRide.findOne({jrId:request.rideId},function(err,joinedRide){
                                        if(err){
                                            console.log(err);
                                            res.sendStatus(500);
                                        }else if (joinedRide != null){
                                            getTheLongestRideFromTheTwoRides(joinedRide,requesterride)
                                                .then(function(smallAndBigRide){
                                                    var smallRide = smallAndBigRide[1];
                                                    var bigRide = smallAndBigRide[0];
                                                    var bigRideCustomerNumber = bigRide.customerNumber;
                                                    if( bigRideCustomerNumber == null || bigRideCustomerNumber == undefined){
                                                        bigRideCustomerNumber = bigRide.ownerCustomerNumber;
                                                    }
                                                    if(bigRideCustomerNumber == joinedRide.ownerCustomerNumber){
                                                        var requestMatrix = joinedRide.requestMatrix;
                                                        var requestObject = requestMatrix[requester.customerNumber];
                                                        requestObject.status = "accepted";
                                                        requestMatrix[requester.customerNumber] = requestObject;
                                                        var partners = joinedRide.partners;
                                                        var partner = {};
                                                        partner.customerNumber = requester.customerNumber;
                                                        partner.gcmId = requester.gcmId;
                                                        partner.phoneNumber = requesterride.phoneNumber;
                                                        partner.pickUpLatLng = requesterride.latlong;
                                                        partner.name = requester.name;
                                                        partners.push(partner);
                                                        var statusMatrix = joinedRide.statusMatrix;
                                                        statusMatrix[requesterride.customerNumber] = 'notstarted';
                                                        var acceptedRideIds = joinedRide.acceptedRideIds;
                                                        acceptedRideIds.push(requesterride.rideId);
                                                        var customerNumberRideIdMap = joinedRide.customerNumberRideIdMap;
                                                        customerNumberRideIdMap[requesterride.customerNumber] = requesterride.rideId;
                                                        var obj = {
                                                            statusMatrix:statusMatrix,
                                                            requestMatrix:requestMatrix,
                                                            partners:partners,
                                                            acceptedRideIds:acceptedRideIds,
                                                            customerNumberRideIdMap:customerNumberRideIdMap
                                                        }
                                                    }else{
                                                        var ownerCustomerNumber = bigRide.customerNumber;
                                                        var jrId = joinedRide.jrId;
                                                        var counter = joinedRide.counter;
                                                        var partners = joinedRide.partners;
                                                        var partner = {};
                                                        partner.customerNumber = requester.customerNumber;
                                                        partner.gcmId = requester.gcmId;
                                                        partner.phoneNumber = requesterride.phoneNumber;
                                                        partner.pickUpLatLng = requesterride.latlong;
                                                        partner.name = requester.name;
                                                        partners.push(partner);
                                                        var statusMatrix = joinedRide.statusMatrix;
                                                        statusMatrix[bigRide.customerNumber] = 'notstarted';
                                                        var acceptedRideIds = joinedRide.acceptedRideIds;
                                                        acceptedRideIds.push(requesterride.rideId);
                                                        var originalRideId = bigRide.rideId;
                                                        var source = bigRide.source;
                                                        var destination = bigRide.destination;
                                                        var date = bigRide.date;
                                                        var pickUpLat = bigRide.pickUpLat;
                                                        var pickUpLng = bigRide.pickUpLng;
                                                        var dropLat = bigRide.dropLat;
                                                        var dropLng = bigRide.dropLng;
                                                        var requests = joinedRide.requests.concat(bigRide.requests);
                                                        var requestMatrix = joinedRide.requestMatrix;
                                                        for( var key in bigRide.requestMatrix){
                                                            requestMatrix[key] = bigRide.requestMatrix[key];
                                                        }
                                                        var requesterObject = requestMatrix[requesterride.customerNumber];
                                                        requesterObject.status = 'accepted';
                                                        requestMatrix[requesterride.customerNumber] = requesterObject;
                                                        var customerNumberRideIdMap = joinedRide.customerNumberRideIdMap;
                                                        customerNumberRideIdMap[requesterride.customerNumber] = requesterride.rideId;

                                                        var overview = bigRide.overview_polyline;
                                                        var obj = {
                                                            ownerCustomerNumber:ownerCustomerNumber,
                                                            jrId:jrId,
                                                            partners:partners,
                                                            statusMatrix:statusMatrix,
                                                            acceptedRideIds:acceptedRideIds,
                                                            originalRideId:originalRideId,
                                                            source:source,
                                                            destination:destination,
                                                            date:date,
                                                            pickUpLat:pickUpLat,
                                                            pickUpLng:pickUpLng,
                                                            dropLat:dropLat,
                                                            dropLng:dropLng,
                                                            requests:requests,
                                                            requestMatrix:requestMatrix,
                                                            phoneNumber:bigRide.phoneNumber,
                                                            customerNumberRideIdMap:customerNumberRideIdMap,
                                                            overview_polyline:overview
                                                            //rideRequestMap:rideRequestMap
                                                        }
                                                    }
                                                    JoinedRide.update({jrId:request.rideId},obj,function(err,numberAffected,raw){
                                                        if(err){
                                                            console.log(err);
                                                            res.sendStatus(500);
                                                        }else if (numberAffected != null){
                                                            Request.update({requestId:request.requestId},{jrId:joinedRide.jrId,status:"accepted"},function(err,numberAffected,raw){
                                                                if(err){
                                                                    console.log(err);
                                                                    res.sendStatus(500);
                                                                }else if(numberAffected != null){
                                                                    Ride.update({rideId:requesterride.rideId},{jrId:joinedRide.jrId},function(err,numberAffected,raw){
                                                                        if(err){
                                                                            console.log(err);
                                                                            res.sendStatus(500);
                                                                        }else if(numberAffected != null){
                                                                            var message = new gcm.Message({
                                                                                collapseKey: 'demo',
                                                                                delayWhileIdle: true,
                                                                                timeToLive: 3,
                                                                                data: {
                                                                                    NotificationType: 'acceptedByTheOwner',
                                                                                    ownerrideid:request.rideId,
                                                                                    ownerCustomerName:owner.name,
                                                                                    ownerCustomerEmail: owner.email,
                                                                                    ownerPhoneNumber: bigRide.phoneNumber,
                                                                                    message:'The owner has accepted your request to join'
                                                                                }
                                                                            });
                                                                            console.log('Sending the acceptance of the request to join to gcmId: '+requester.gcmId);
                                                                            sendMessage(message,[requester.gcmId],res,'you have successfully accepted the ride');
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    })

                                                }).fail(function(err){
                                                    console.log(err);
                                                    res.json({failure:'failure',message:'Error happened in the function getTheLongestRides '+err});
                                                })
                                        }
                                    })
                                }else{
                                    /*
                                     steps to do:
                                     1. Jride does not exist, so create a new jride.
                                     2. send message to the requester that ur request is accepted
                                     3. move the request Ids array into jride, update every request with the jride id.
                                     4. create the request matrix, partners array and everything for the
                                     5. update the rRide with the jride Id.
                                     */
                                    var jrId = getUniqueId(32);
                                    getTheLongestRideFromTheTwoRides(ownerride,requesterride)
                                        .then(function(bigAndSmallRide){
                                            var biggerRide = bigAndSmallRide[0];
                                            var smallerRide = bigAndSmallRide[1];
                                            var ownerOfBiggerRide = {};
                                            var ownerOfSmallerRide = {};
                                            if( biggerRide.customerNumber == owner.customerNumber){
                                                ownerOfBiggerRide = owner;
                                                ownerOfSmallerRide = requester
                                            }else{
                                                ownerOfBiggerRide = requester;
                                                ownerOfSmallerRide = owner;
                                            }
                                            var partners = [];
                                            var ownerObject = {};
                                            ownerObject.customerNumber = ownerOfBiggerRide.customerNumber;
                                            ownerObject.gcmId = ownerOfBiggerRide.gcmId;
                                            ownerObject.phoneNumber = biggerRide.phoneNumber;
                                            ownerObject.pickUpLatLng = biggerRide.latlong;
                                            ownerObject.name = ownerOfBiggerRide.name;
                                            partners.push(ownerObject);
                                            var requesterObject = {};
                                            requesterObject.customerNumber = ownerOfSmallerRide.customerNumber;
                                            requesterObject.gcmId = ownerOfSmallerRide.gcmId;
                                            requesterObject.phoneNumber = smallerRide.phoneNumber;
                                            requesterObject.pickUpLatLng = smallerRide.latlong;
                                            requesterObject.name = ownerOfSmallerRide.name;
                                            partners.push(requesterObject);
                                            var requestMatrix = ownerride.requestMatrix;
                                            var requestObject = requestMatrix[requesterride.customerNumber];
                                            requestObject.status = "accepted";
                                            requestMatrix[requesterride.customerNumber] = requestObject;
                                            var acceptedRideIds = [];
                                            acceptedRideIds.push(requesterride.rideId);
                                            acceptedRideIds.push(ownerride.rideId);
                                            var statusMatrix = {};
                                            statusMatrix[biggerRide.customerNumber] = 'notstarted';
                                            statusMatrix[smallerRide.customerNumber] = 'notstarted';
                                            var customerNumberRideIdMap = {};
                                            customerNumberRideIdMap[biggerRide.customerNumber] = biggerRide.rideId;
                                            customerNumberRideIdMap[smallerRide.customerNumber] = smallerRide.rideId;
                                            var overview = biggerRide.overview_polyline;
                                            /*var rideRequestMap = {};
                                             rideRequestMap[biggerRide.customerNumber] = [requestId];
                                             rideRequestMap[smallerRide.customerNumber] = [requestId];*/
                                            var obj ={
                                                ownerCustomerNumber:biggerRide.customerNumber,
                                                jrId:jrId,
                                                counter:0,
                                                partners:partners,
                                                originalRideId:biggerRide.rideId,
                                                distanceMatrix:null,
                                                source:biggerRide.source,
                                                destination:biggerRide.destination,
                                                date:biggerRide.date,
                                                requests:ownerride.requests,
                                                requestMatrix:requestMatrix,
                                                acceptedRideIds:acceptedRideIds,
                                                statusMatrix:statusMatrix,
                                                city:biggerRide.city,
                                                pickUpLat:biggerRide.pickUpLat,
                                                pickUpLng:biggerRide.pickUpLng,
                                                dropLat:biggerRide.dropLat,
                                                dropLng:biggerRide.dropLng,
                                                phoneNumber:biggerRide.phoneNumber,
                                                customerNumberRideIdMap:customerNumberRideIdMap,
                                                overview_polyline:overview
                                            };
                                            var jRide = new JoinedRide(obj);
                                            jRide.save(function(err,joinedRide){
                                                if(err){
                                                    console.log(err);
                                                    res.sendStatus(500);
                                                }else if(joinedRide != null){
                                                    var rides = [];
                                                    rides.push(request.rideId);
                                                    rides.push(request.rRideId);
                                                    Ride.update({rideId:{"$in":rides}},{jrId:jrId},{"multi":true},function(err,numberAffected,raw){
                                                        if(err){
                                                            console.log(err);
                                                            res.sendStatus(500);
                                                        }else if(numberAffected != null){
                                                            var requestIds = [];
                                                            for(var index =0;index < ownerride.requests.length ;index++){
                                                                requestIds.push(ownerride.requests[index]);
                                                            }
                                                            Request.update({requestId:{"$in":requestIds}},{jrId:jrId},{"multi":true},function(err,numberAffected,raw){
                                                                if(err){
                                                                    console.log(err);
                                                                    res.sendStatus(500);
                                                                }else if(numberAffected != null){
                                                                    Request.update({requestId:requestId},{status:"accepted"},function(err,numberAffected,raw){
                                                                        if(err){
                                                                            console.log(err);
                                                                            res.sendStatus(500);
                                                                        }else if(numberAffected != null){
                                                                            var message = new gcm.Message({
                                                                                collapseKey: 'demo',
                                                                                delayWhileIdle: true,
                                                                                timeToLive: 3,
                                                                                data: {
                                                                                    NotificationType: 'acceptedByTheOwner',
                                                                                    ownerrideid:jrId,
                                                                                    ownerCustomerName:owner.name,
                                                                                    ownerCustomerEmail: owner.email,
                                                                                    ownerPhoneNumber: ownerride.phoneNumber,
                                                                                    message:'The owner has accepted your request to join'
                                                                                }
                                                                            });
                                                                            console.log('Sending the acceptance of the request to join to gcmId: '+requester.gcmId);
                                                                            sendMessage(message,[requester.gcmId],res,'you have successfully accepted the ride');
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                            })
                                        }).fail(function(err){
                                            console.log(err);
                                            res.json({failure:'failure',message:'Error happened in the function getTheLongestRides '+err});
                                        })
                                }
                            }
                        })
                    }
                })
            }
        })
    }else{

        Request.findOne({requestId:requestId},function(err,request){
            if(err){
                console.log(err);
                res.sendStatus(500);
            }else if(request != null){
                Customer.find({customerNumber:{"$in":[request.ownercustomerNumber,request.requesterCustomerNumber]}},function(err,customers){
                    if(err){
                        console.log(err);
                        res.sendStatus(500);
                    }else if(customers.length > 0){
                        if(customers[0].customerNumber == request.ownercustomerNumber){
                            owner = customers[0];
                            requester = customers[1];
                        }else{
                            owner = customers[1];
                            requester = customers[0];
                        }
                        Ride.find({rideId:{'$in':[request.rideId,request.rRideId]}},function(err,rides){
                            if(err){
                                console.log(err);
                                res.sendStatus(500)
                            }else if(rides.length > 0){
                                if(rides[0].customerNumber == request.requesterCustomerNumber){
                                    requesterride=rides[0];
                                    ownerride = rides[1];
                                }else{
                                    requesterride=rides[1];
                                    ownerride = rides[0];
                                }
                                if(ownerride != null){
                                    // its not a jride
                                    var message = new gcm.Message({
                                        collapseKey: 'demo',
                                        delayWhileIdle: true,
                                        timeToLive: 3,
                                        data: {
                                            NotificationType: 'rejectedByTheOwner',
                                            ownerrideid:request.rideId,
                                            ownerCustomerName:owner.name,
                                            ownerCustomerEmail: owner.email,
                                            ownerPhoneNumber: ownerride.phoneNumber,
                                            message:'The owner has rejected your request to join'
                                        }
                                    });
                                    var requestMatrix = ownerride.requestMatrix;
                                    var requestObject = requestMatrix[request.requesterCustomerNumber];
                                    requestObject.status = "rejected";
                                    requestMatrix[request.requesterCustomerNumber] = requestObject;
                                    Ride.update({rideId:request.rideId},{"$set":{requestMatrix:requestMatrix}},function(err,numberAffected,raw){
                                        if(err){
                                            console.log(err);
                                            res.sendStatus(500);
                                        }else if(numberAffected != null){
                                            Request.update({requestId:requestId},{status:'rejected'},function(err,numberAffected,raw){
                                                if(err){
                                                    console.log(err);
                                                    res.sendStatus(500);
                                                }else if(numberAffected != null){
                                                    console.log('Sending the rejectance of the request to join to gcmId: '+requester.gcmId);
                                                    sendMessage(message,[requester.gcmId],res,'you have successfully rejected the request');
                                                    console.log('Message is sent successfully');
                                                }
                                            })
                                        }
                                    })

                                }else{
                                    // its a jride
                                    var message = new gcm.Message({
                                        collapseKey: 'demo',
                                        delayWhileIdle: true,
                                        timeToLive: 3,
                                        data: {
                                            NotificationType: 'rejectedByTheOwner',
                                            ownerrideid:request.rideId,
                                            ownerCustomerName:owner.name,
                                            ownerCustomerEmail: owner.email,
                                            message:'The owner has rejected your request to join'
                                        }
                                    });
                                    var query = {};
                                    var criteria = "requestMatrix."+request.requesterCustomerNumber+".status";
                                    query[criteria]= "rejected";
                                    JoinedRide.update({jrId:request.rideId},{"$set":query},function(err,numberAffected,raw){
                                        if(err){
                                            console.log(err);
                                            res.sendStatus(500);
                                        }else if(numberAffected != null){
                                            Request.update({requestId:requestId},{status:'rejected'},function(err,numberAffected,raw){
                                                if(err){
                                                    console.log(err);
                                                    res.sendStatus(500);
                                                }else if(numberAffected != null){
                                                    console.log('Sending the rejectance of the request to join to gcmId: '+requester.gcmId);
                                                    sendMessage(message,[requester.gcmId],res,'you have successfully rejected the request');
                                                    console.log('Message is sent successfully');
                                                }
                                            })
                                        }
                                    })
                                }
                            }else{
                                console.log('The joined ride might exist but the requesters ride does not exist')
                                res.json({failure:'failure',message:'The joined ride might exist but the requesters ride does not exist'});
                            }
                        })
                    }else{
                        console.log('Could not find the requester or owner of the request');
                        res.json({failure:'failure',message:'Could not find the requester or owner of the request'});
                    }
                })
            }else{
                console.log('Could not find the request to be rejected');
                res.json({failure:'failure',message:'Could not find the request to be rejected'});
            }
        })
    }
})

/*
 Just the token is enough
 1. send only the requests which are not accepted and not rejected
 */
app.post('/getRequests',ensureAuthorized,function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var tempmoment = moment().utcOffset("+05:30");
    var dateTwoDaysBefore = tempmoment.subtract(2,'d').format('YYYY-MM-DD');
    Request.find({ownercustomerNumber:customerNumber,status:'requestsent',date:{"$gte":dateTwoDaysBefore+'T00:00:00.000Z'}},function(err,requests){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(requests != null){
            console.log('Successfully retrieved the requests');
            res.send({requests:requests});
        }else{
            res.json({message:'There are no requests for you currently'})
        }
    }).sort({"date":-1});
})

/*
 Just the token is enough
 */
app.post('/getMyRidesUpcoming',function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    console.log('Received request to return the get Rides');
    var tempmoment = moment().utcOffset("+05:30");
    var currentDate = tempmoment.format('YYYY-MM-DD');
    var currentTime ;

    var currentDateTimeString = currentDate+'T00:00:00.000Z';
    console.log('CurrentdateTimeString is: '+currentDateTimeString);
    var nextDayDate = tempmoment.add(1,'d').format('YYYY-MM-DD');
    var query1 = {};
    var criteria = "partners.customerNumber";
    query1[criteria] = customerNumber;


    var bigQuery = {};
    //{date:{'$gte':currentDateTimeString,'$lt':nextDayDate+'T23:59:59.000Z'},"$or":[{ownerCustomerNumber:customerNumber},query1],status:{"$ne":'ended'}}
    var dateCriteria = {};
    dateCriteria['$gte'] = currentDateTimeString;
    dateCriteria['$lt'] = nextDayDate+'T23:59:59.000Z';
    bigQuery['date'] = dateCriteria;

    var arrayOfCriterias = [];
    var ownerCriteria = {};
    ownerCriteria['ownerCustomerNumber'] = customerNumber;
    arrayOfCriterias.push(ownerCriteria);
    arrayOfCriterias.push(query1);
    bigQuery['$or'] = arrayOfCriterias;

    var statusCriteria = {};
    statusCriteria['$ne'] = 'ended';
    bigQuery['status'] = statusCriteria;

    /*var statusMatrixCriteria = 'statusMatrix.'+customerNumber;
     bigQuery[statusMatrixCriteria] = 'notstarted';*/

    var statusMatrixCriteria = 'statusMatrix.'+customerNumber;
    var notEqualCriteria = {};
    notEqualCriteria['$ne'] = 'ended';
    bigQuery[statusMatrixCriteria] = notEqualCriteria;

    Ride.find({date:{'$gte':currentDateTimeString,'$lt':nextDayDate+'T23:59:59.000Z'},jrId:0,customerNumber:customerNumber,status:{"$ne":'ended'}},function(err,rides){
        if(err){
            console.log('There was an error while retrieving rides from database');
            res.sendStatus(500);
        } else if(rides.length > 0){
            JoinedRide.find(bigQuery,function(err,jrides){
                if(err){
                    console.log('there was an error while fetching joined rides from database: '+err);
                    res.sendStatus(500);
                } else if(jrides.length > 0){
                    res.json({rides:rides,joinedRides:jrides});
                } else if (jrides.length === 0){
                    res.json({rides:rides});
                }
            }).sort({"date":-1});
        } else if (rides.length === 0){
            JoinedRide.find(bigQuery,function(err,jrides){
                if(err){
                    console.log('there was an error while fectching joined rides from database');
                    res.sendStatus(500);
                } else if(jrides.length > 0){
                    res.json({joinedRides:jrides});
                } else if (jrides.length === 0){
                    res.json({message:'currently u do not have any rides posted for today or tomo'});
                }
            }).sort({"date":-1});
        }
    }).sort({"date":-1});
})
/*
 {
 "requestId":Number
 }
 */
app.post('/getRequestDetails',ensureAuthorized,function(req,res,next){

    var requestId = req.body.requestId;
    Request.findOne({requestId:requestId},function(err,request){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(request != null){
            var ownerRideId = request.rideId;
            var requesterRideId = request.rRideId;
            var requesterCustomerNumber = request.requesterCustomerNumber;
            var ownerRide = {};
            var requesterRide = {};
            var requesterCustomerProfile = {};
            Ride.find({rideId:{"$in":[ownerRideId,requesterRideId]}},function(err,rides){
                if(err){
                    console.log(err);
                    res.sendStatus(500);
                }else if(rides.length > 0){
                    if(rides[0].rideId == ownerRideId){
                        ownerRide = rides[0];
                        requesterRide = rides[1];
                    }else if(rides[0].rideId == requesterRideId) {
                        ownerRide = rides[1];
                        requesterRide = rides[0];
                    }
                    Customer.findOne({customerNumber:requesterCustomerNumber},function(err,requester){
                        if(err){
                            console.log(err);
                            res.sendStatus(500);
                        }else if(requester != null){
                            console.log('returning the built json');
                            requesterCustomerProfile = requester;
                            requesterCustomerProfile.password = null;
                            requesterCustomerProfile.gcmId = null;
                            res.json({ownerRide:ownerRideId,requesterRide:requesterRide,requesterCustomerProfile:requesterCustomerProfile});
                        }else{
                            console.log('returning the built json but without the requester profile as it could not be found');
                            res.json({ownerRide:ownerRide,requesterRide:requesterRide,requesterCustomerProfile:'unable to find such customer'});
                        }
                    })
                }else{
                    res.json({failure:'failure',message:'We could not find the rides as specified in the request'});
                }
            })
        }
    })
})

/*
 jrId:jrId,( required)
 estimateBeforeJoining:1/0 - (1 for yes, estimate it before joining, and 0 for i am already in the joined ride, now give me the estimate)
 rRideId:rRideId,
 serviceProvider: uber (required),
 city:city ( required)
 */
app.post('/estimateRide',ensureAuthorized,function(req,res,next){
    console.log('Entered the estimateRide');
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var targetedCustomerNumber = decodedToken.customerNumber;
    var jrId = req.body.jrId;
    var rRideId = req.body.rRideId;
    var estimateBeforeJoining = req.body.estimateBeforeJoining;
    var serviceProvider = req.body.serviceProvider;

    console.log('params for estimateRide: ');
    console.log('jrId: '+jrId);
    console.log('rRideId: '+rRideId);
    console.log('estimateBeforeJoining: '+estimateBeforeJoining);
    console.log('serviceProvider: '+serviceProvider);

    JoinedRide.findOne({jrId:jrId},function(err,joinedRide){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(joinedRide != null){
            var acceptedRideIds = joinedRide.acceptedRideIds;
            if(estimateBeforeJoining == 1){
                acceptedRideIds.push(rRideId);
            }
            getEstimates(_.uniq(acceptedRideIds),targetedCustomerNumber,res,serviceProvider);
        }else{
            Ride.findOne({rideId:jrId},function(err,ride){
                if(err){
                    console.log(err);
                    res.sendStatus(500);
                }else if(ride != null){
                    var acceptedRideIds = [];
                    acceptedRideIds.push(ride.rideId);
                    acceptedRideIds.push(rRideId);
                    getEstimates(_.uniq(acceptedRideIds),targetedCustomerNumber,res,serviceProvider);
                }else{
                    res.json({failure:'There is no joined ride or ride existing with the supplied id'});
                    console.log('There is no joined ride or ride existing');
                }
            })
        }
    })
})

/*
 {
 customerNumber:customerNumber
 }
 */
app.post('/getCustomerProfile',ensureAuthorized,function(req,res,next){
    var customerNumber = req.body.customerNumber;
    Customer.findOne({customerNumber:customerNumber},function(err,customer){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(customer != null){
            res.json({success:'retrieved the customer profile',customer:customer});
        }
    })
});

/*
 {
 "stacktrace":stack trace,
 "package_version":package version,
 "package_name":package name
 }
 */
app.post('/remoteStackTrace',function(req,res,next){
    var stackTrace = req.body.STACK_TRACE;
    var app_start_date = req.body.USER_APP_START_DATE;
    var app_crash_date = req.body.USER_APP_CRASH_DATE;
    var tempmoment = moment().utcOffset("+05:30");
    var day = tempmoment.format('YYYY-MM-DD');
    var time = tempmoment.format('HH:mm:ss');

    var object = {};
    object.day = day;
    object.time = time;
    object.stackTrace = stackTrace;
    object.app_start_date = app_start_date;
    object.app_crash_date = app_crash_date;

    var newStackTrace = new StackTrace({
        stackTrace:object
    });

    newStackTrace.save(function(err,stackTrace){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(stackTrace != null){
            res.json({success:'your stacktrace is successfully saved'});
            console.log('your stacktrace is successfully saved');
        }
    })
})

/*
 {
 serviceProvider: ola, uberX, uberXL, UberBLACK, UberSUV, uberTAXI,  etc
 sourceLat: source latitude
 sourceLng: source longitude
 destinationLat: destination latitude
 destinationLng: destination longitude
 city: city name (Bengaluru, mumbai, chennai etc)
 // older key:
 }
 */
app.post('/rateCardEstimationWithServiceProviders',function(req,res,next){
    var serviceProvider = req.body.serviceProvider;
    var start_latitude = req.body.sourceLat;
    var start_longitude = req.body.sourceLng;
    var end_latitude = req.body.destinationLat;
    var end_longitude = req.body.destinationLng;
    var bool = false;
    var priceIndex = 0;
    var city = req.body.city;
    var estimateObject = {};
    var estimateFound = false;

    https.get('https://api.uber.com/v1/estimates/price?server_token=-dzxW_sukXTE9VTM7w4Mfewsud7j5yaRnOZjXBXK&start_latitude='+start_latitude+'&start_longitude='+start_longitude+'&end_latitude='+end_latitude +'&end_longitude='+end_longitude,function(response){
        var body='';
        response.on('data',function(d){
            body = body+d;
        })

        response.on('end',function(){
            try{
                var json = JSON.parse(body);
                var prices = json.prices;
                if(prices.length == 0){
                    res.json({message:'Uber estimation is not available'});
                }else{
                    if(serviceProvider.toLowerCase() == 'ubergo'){
                        //AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8
                        https.get('https://maps.googleapis.com/maps/api/distancematrix/json?origins='+start_latitude+','+start_longitude+'&destinations='+end_latitude+','+end_longitude+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
                            var body = '';
                            response.on('data',function(d){
                                body = body + d;
                            })

                            response.on('end',function(){
                                try{
                                    var json = JSON.parse(body);
                                    if(json.status == 'OK'){
                                        var rows = json.rows;
                                        var object = rows[0];
                                        var array = object.elements;
                                        var element = array[0];
                                        var distance = element.distance.value / 1000;
                                        var time = element.duration.value / 60;
                                        UberModel.findOne({city:city,carModel:'ubergo'},function(err,uberModel){
                                            if(err){
                                                console.log(err);
                                                res.sendStatus(500);
                                            }else if(uberModel != null){
                                                var item = prices[0];
                                                var baseFare = uberModel.baseFare;
                                                var farePerKm = uberModel.farePerKm;
                                                var farePerMinute = uberModel.farePerMinute;
                                                var surgePrice = item.surge_multiplier;
                                                var estimate = baseFare + (distance  * farePerKm) + (time * farePerMinute);
                                                estimate = estimate * surgePrice;
                                                estimateObject.durationInMinutes = time.toFixed(3);
                                                estimateObject.distance = distance.toFixed(3);
                                                estimateObject.estimate = estimate.toFixed(3);
                                                res.json({success:'Found the service provider as specified in your request',estimate:estimateObject});
                                            }else{
                                                res.json({message:'Uber model is null LoL'});
                                            }
                                        })
                                    }else{
                                        console.log('InFunction:rateCardEstimationWithServiceProviders,Causes:json.status is not equal to OK in the distance matrix response,Error:'+json.error_message);
                                        res.json({failure:'failure',message:'InFunction:rateCardEstimationWithServiceProviders,Causes:json.status is not equal to OK in the distance matrix response,Error:'+json.error_message});
                                    }
                                }catch(err){
                                    console.log('InFunction:rateCardEstimationWithServiceProviders,Causes:Error was caught in the catch block,Error:'+err);
                                    res.json({failure:'failure',message:'InFunction:rateCardEstimationWithServiceProviders,Causes:Error was caught in the catch block'});
                                }
                            })
                        })
                    }else{
                        for(var index = 0;index<prices.length;index++){
                            if(prices[index].localized_display_name.toLowerCase() == serviceProvider.toLowerCase()){
                                var item = prices[index];
                                estimateObject.durationInMinutes = ((item.duration)/60);
                                estimateObject.estimate = item.high_estimate;
                                estimateObject.distance = item.distance * 1.60934;
                                estimateFound = true;
                                break;
                            }
                        }
                        if(estimateFound){
                            res.json({success:'Found the service provider as specified in your request',estimate:estimateObject});
                        }else{
                            res.json({failure:'could not find the service provider as specified in your request'});
                        }
                    }
                }
            }catch(err){
                console.log('Error Happened while parsing response from Uber: '+err);
                res.json({failure:'failure',message:'Error while parsing response from Uber'});
            }
        })
    })
})

/*
 {
 "city":city name,
 "baseFare": base fare in rs
 "farePerKm": fare per km,
 "farePerMinute": fare per minute,
 "carModel": UBERGO(only ubergo in capitals) or uberx or uberBlack
 }
 */
app.post('/addUberModel',function(req,res,next){
    var city = req.body.city;
    var baseFare = req.body.baseFare;
    var farePerKm = req.body.farePerKm;
    var farePerMinute = req.body.farePerMinute;
    var carModel = req.body.carModel;

    var uberModel = new UberModel({
        city:city,
        baseFare:baseFare,
        farePerKm:farePerKm,
        farePerMinute:farePerMinute,
        carModel:carModel
    });

    uberModel.save(function(err,uberModel){
        if(err){
            console.log(err);
            res.sendStatus(500)
        }else if(uberModel != null){
            console.log('uber model successfully saved');
            res.json({success:'success',message:"Uber model is successfully saved"});
        }
    })
})

app.post('/googledistancematrixapicalculation',function(req,res,next){
    var source = req.body.sourcelatlong;
    source = source+'';
    var destination = req.body.destinationlatlong;
    destination = destination+'';
    var splicedSource = source.slice(0,source.length-1);
    var splicedDestination = destination.slice(0,destination.length-1);
    var useHaversineFormula = true;

    if(useHaversineFormula){
        var source_array = splicedSource.split('|');
        var destination_array = splicedDestination.split('|');
        var distanceToCalculate = 0;
        try {
            for (i = 0; i < source_array.length; i++) {
                for (j = 0; j < destination_array.length; j++) {
                    if (j == (i + 1)) {
                        var sourcelatomiclatlong = source_array[i].split(',');
                        var destinationatomiclatlong = destination_array[j].split(',');
                        distanceToCalculate = distanceToCalculate + haversineDistance(sourcelatomiclatlong, destinationatomiclatlong);
                    }
                }
            }
            res.json({success: 'success', totaldistance: distanceToCalculate});
        } catch (err) {
            console.log(err);
            res.json({failure: 'failure', errorMessage: err});
        }
    }else{
        https.get('https://maps.googleapis.com/maps/api/distancematrix/json?origins='+splicedSource+'&destinations='+splicedDestination+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
            var body = '';
            response.on('data',function(d){
                body =body + d;
            })
            response.on('end',function(){
                console.log('Completely received the data from the google matrix api');
                var json = JSON.parse(body);
                if(json.status === 'OK'){
                    try{
                        var origins = json.origin_addresses;
                        var destinations = json.destination_addresses;
                        var totaldistance=0;
                        for (var i = 0; i < origins.length; i++) {
                            var results = json.rows[i].elements;
                            for (var j = 0; j < results.length; j++) {
                                var element = results[j];
                                if(element.status=="OK" && j==i+1)
                                {
                                    totaldistance = totaldistance + element.distance.value;
                                }
                            }
                        }
                        res.json({success:'success',totaldistance:totaldistance});
                    }catch(err){
                        console.log('InFunction:googledistancematrixapicalculation,Causes:Error was caught in the catch block,Error:'+err);
                        res.json({failure:'failure',message:'InFunction:googledistancematrixapicalculation,Causes:Error was caught in the catch block'});
                    }
                }
                else {
                    console.log('InFunction:googledistancematrixapicalculation,Causes:json.status is not equal to OK,Error:'+json.error_message);
                    res.json({failure:'failure',message:'InFunction:googledistancematrixapicalculation,Causes:json.status is not equal to OK'});
                }
            })
        }).on('error',function(e){
            console.log('The shitty problem is: '+e);
        })
    }

})

/*
 {
 "rideId": ride Id of the ride, ( compulsory variable)
 "source": new source,
 "destination": new destination,
 "phoneNumber": new,
 "date": new,
 "gender": new,
 "pickUpLatLng": pick up lat lng separated by a comma,
 "dropLatLng": drop lat lng separated by a comma,
 "date":Date in the format of YYYY-MM-DD ( compulsory with time)
 "time": time in the format of HH:MM:SS (compulsory with date)
 }
 */
app.post('/updateRide',function(req,res,next){
    var rideId = req.body.rideId;
    var source = req.body.source;
    var destination = req.body.destination;
    var phoneNumber = req.body.phoneNumber;
    var gender = req.body.gender;
    var pickUpLatLng = req.body.pickUpLatLng;
    var dropLatLng = req.body.dropLatLng;
    var date = req.body.date;
    var time = req.body.time;
    var sourceLat = req.body.sourceLat;
    var sourceLng = req.body.sourceLng;
    var destinationLat = req.body.destinationLat;
    var destinationLng = req.body.destinationLng;
    var isPickUpChanged = false;
    var isDropChanged = false;
    var isSourceChanged = false;
    var isDestinationChanged = false;
    var isDateChanged = false;
    var isTimeChange = false;
    var pickUpLat;
    var pickUpLng;
    var dropLat;
    var dropLng;
    var humanReadableNamesOfPickUpLatLng;
    var humanReadableNamesOfDropLatLng;
    Ride.findOne({rideId:rideId,jrId:0},function(err,ride){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if (ride != null){
            var rideDetailsToBeUpdated = {};
            pickUpLat = ride.pickUpLat;
            pickUpLng = ride.pickUpLng;
            dropLat = ride.dropLat;
            dropLng = ride.dropLng;

            if(sourceLat != undefined || sourceLat != null){
                rideDetailsToBeUpdated.sourceLat = sourceLat;
            }

            if(sourceLng != undefined || sourceLng != null){
                rideDetailsToBeUpdated.sourceLng = sourceLng;
            }

            if(destinationLng != null || destinationLng != undefined){
                rideDetailsToBeUpdated.destinationLng = destinationLng;
            }

            if(destinationLat != null || destinationLat != undefined){
                rideDetailsToBeUpdated.destinationLat = destinationLat;
            }
            if(source != undefined || source != null){
                rideDetailsToBeUpdated.source = source;
                isSourceChanged = true;
            }
            if(destination != undefined || destination != null){
                rideDetailsToBeUpdated.destination = destination;
                isDestinationChanged = true;
            }
            if(phoneNumber != undefined || phoneNumber != null){
                rideDetailsToBeUpdated.phoneNumber = phoneNumber;
            }
            if(gender != undefined || gender != null){
                rideDetailsToBeUpdated.gender = gender;
            }
            if(pickUpLatLng != undefined || pickUpLatLng != null){
                var latLngArray = pickUpLatLng.split(',');
                rideDetailsToBeUpdated.pickUpLat = parseFloat(latLngArray[0]);
                rideDetailsToBeUpdated.pickUpLng = parseFloat(latLngArray[1]);
                isPickUpChanged = true;
                pickUpLat = parseFloat(latLngArray[0]);
                pickUpLng = parseFloat(latLngArray[1]);
            }
            if(dropLatLng != undefined || dropLatLng != null){
                var latLngArray = dropLatLng.split(',');
                rideDetailsToBeUpdated.dropLat = parseFloat(latLngArray[0]);
                rideDetailsToBeUpdated.dropLng = parseFloat(latLngArray[1]);
                isDropChanged = true;
                dropLat = parseFloat(latLngArray[0]);
                dropLng = parseFloat(latLngArray[1]);
            }
            /*if((date != undefined || date != null) && (time != undefined || time != null)){
             var dateString = date+'T'+time+'.000Z';
             rideDetailsToBeUpdated.date = dateString;
             }else{
             res.json({failure:'failure',message:'Either time or date is not set, cannot set only one, send both the values'});
             next();
             }*/
            if( date != undefined || date != null){
                if(time == undefined || time == null){
                    res.json({failure:'failure',message:'Time is not set, cannot set only one, send both the values'});
                    next();
                }
                else{
                    var dateString = date+'T'+time+'.000Z';
                    rideDetailsToBeUpdated.date = dateString;
                }
            }
            if( time != undefined || time != null){
                if(date == undefined || date == null){
                    res.json({failure:'failure',message:'Date is not set, cannot set only one, send both the values'});
                    next();
                }
                else{
                    var dateString = date+'T'+time+'.000Z';
                    rideDetailsToBeUpdated.date = dateString;
                }
            }
            if( (isSourceChanged== true && isPickUpChanged==true) || (isDestinationChanged == true && isDropChanged==true)){
                getTheNamesOfLatLng([{lat:pickUpLat,lng:pickUpLng},{lat:dropLat,lng:dropLng}])
                    .then(function(nameObjects){
                        if( ( Math.abs(nameObjects[0].lat - pickUpLat) <  Math.abs(nameObjects[1].lat - pickUpLat) ) && (Math.abs(nameObjects[0].lng - pickUpLng) <  Math.abs(nameObjects[1].lng - pickUpLng)) ){
                            humanReadableNamesOfPickUpLatLng = nameObjects[0].address;
                            humanReadableNamesOfDropLatLng = nameObjects[1].address;
                        }else{
                            humanReadableNamesOfPickUpLatLng = nameObjects[1].address;
                            humanReadableNamesOfDropLatLng = nameObjects[0].address;
                        }
                        rideDetailsToBeUpdated.humanReadableNamesOfDropLatLng=humanReadableNamesOfDropLatLng;
                        rideDetailsToBeUpdated.humanReadableNamesOfPickUpLatLng=humanReadableNamesOfPickUpLatLng;
                        getOverviewPolyLine(pickUpLat,pickUpLng,dropLat,dropLng)
                            .then(function(newPolyLine){
                                if(ride.status == 'started'){
                                    res.json({failure:'failure',message:'the ride is already started, you cannot change it now'})
                                }else{
                                    rideDetailsToBeUpdated.overview_polyline = newPolyLine.points;
                                    Ride.update({rideId:rideId},rideDetailsToBeUpdated,function(err,numberAffected,raw){
                                        if(err){
                                            console.log(err);
                                            res.json({failure:'failure',message:'some error happened while updating the ride'});
                                        }else if(numberAffected != null){
                                            console.log('Ride Successfully updated');
                                            res.json({success:'success',message:'Ride was successfully updated'});
                                            next();
                                        }
                                    })
                                }
                            }).fail(function(error){
                                console.log('There was an error while fetching over view polyline: '+error);
                                res.json({failure:'failure',message:'There was an error while fetching over view polyline'});
                                next();
                            })
                    }).fail(function(error){
                        console.log('There was an error while fetching human readable addresses: '+error);
                        res.json({failure:'failure',message:'There was an error while fetching human readable addresses'});
                        next();
                    })
            }else{
                if(ride.status == 'started'){
                    res.json({failure:'failure',message:'the ride is already started, you cannot change it now'})
                }else{

                    Ride.update({rideId:rideId},rideDetailsToBeUpdated,function(err,numberAffected,raw){
                        if(err){
                            console.log(err);
                            res.json({failure:'failure',message:'some error happened while updating the ride'});
                        }else if(numberAffected != null){
                            console.log('Ride Successfully updated');
                            res.json({success:'success',message:'Ride was successfully updated'});
                            next();
                        }else{
                            res.json({message:'could not update the joined ride'});
                            next();
                        }
                    })
                }
            }
        }else{
            res.json({failure:'failure',message:'Could not find the ride for the rideId that you have sent or the joined ride has already been formed'});
        }
    })
})

/*function getBoxes(geoJsonObject,range){
 var deferred = Q.defer();
 var boxer = new RouteBoxer();
 var boxes = boxer.box(geoJsonObject,range);

 }
 function getRouteBoxer(geoJsonObject,range){
 var deferred = Q.defer();

 var boxer = new RouteBoxer();
 try{
 var boxes = boxer.box(geoJsonObject,range);
 deferred.resolve({boxes:boxes,range:range});
 }catch(err){
 range = range +0.1;
 getRouteBoxer(geoJsonObject,range)
 .then(function(data){
 deferred.resolve(data);
 }).fail(function(data){
 deferred.reject({message:'The range limit has been breached'});
 })
 }
 return deferred.promise;

 }

 function constructGeoJsonObjectForARoute(sourceAndDestinationLatLngObject){
 var deferred = Q.defer();
 var geoJsonObject = {};
 geoJsonObject.type = 'MultiPoint';
 geoJsonObject.coordinates = [];

 https.get('https://maps.googleapis.com/maps/api/directions/json?origin='+sourceAndDestinationLatLngObject.source.lat+','+sourceAndDestinationLatLngObject.source.lng+'&destination='+sourceAndDestinationLatLngObject.destination.lat+','+sourceAndDestinationLatLngObject.destination.lng+'&key=AIzaSyByCmHXrGS53IMCQpY6Vv_Csl0Yu7vb-P8',function(response){
 var body = '';

 response.on('data',function(d){
 body = body + d;
 })

 response.on('end',function(){
 var json = JSON.parse(body);
 var routes = json.routes;
 var route = routes[0];
 var legs = route.legs;
 var steps = legs[0].steps;
 for(var stepsIndex = 0; stepsIndex < steps.length; stepsIndex++){
 var currentStep = steps[stepsIndex];
 if(stepsIndex == 0){
 var source = [];
 source.push(currentStep.start_location.lat);
 source.push(currentStep.start_location.lng);
 geoJsonObject.coordinates.push(source);
 var destination = [];
 destination.push(currentStep.end_location.lat);
 destination.push(currentStep.end_location.lng);
 geoJsonObject.coordinates.push(destination);
 }else{
 var destination = [];
 destination.push(currentStep.end_location.lat);
 destination.push(currentStep.end_location.lng);
 geoJsonObject.coordinates.push(destination);
 }
 }
 deferred.resolve(geoJsonObject);
 })

 response.on('fail',function(e){
 console.log('There was some problem while fetching directions from Google directions matrix: '+e);
 deferred.reject('There was some problem while fetching directions from Google directions matrix');
 })
 })
 return deferred.promise;
 }
 app.post('/routeBoxer',function(req,res,next){
 /!*var geoJsonObject = {
 "type": "MultiPoint",
 "coordinates": [
 [12.928023, 77.62678830000002],
 [12.9270345, 77.6264633],
 [12.9261328, 77.62869390000002],
 [12.9244796, 77.6282957],
 [12.9238743, 77.63998649999999],
 [12.9144358, 77.6382225],
 [12.9136184, 77.64463839999999],
 [12.9091046, 77.6444896],
 [12.9088573, 77.6475437],
 [12.90811, 77.647437],
 [12.9080969, 77.6476048]
 ]
 };*!/

 /!*var geoJsonObject = {
 "type":"MultiPoint",
 "coordinates":[
 [12.9773773, 77.5723917],
 [12.9773672, 77.5709748],
 [12.9752183, 77.57094289999999],
 [12.9747299, 77.5707205],
 [12.9797622, 77.5709097],
 [12.979885, 77.5710221],
 [12.9806535, 77.5744266],
 [12.9831664, 77.57687279999999],
 [12.9848113, 77.5881747],
 [12.9861538, 77.5887662],
 [12.9830999, 77.592212],
 [12.9842029, 77.5926705],
 [12.9826947, 77.5970645],
 [12.9818435, 77.596974],
 [12.9766933, 77.5993879],
 [12.974383, 77.6111938],
 [12.9704346, 77.6102677],
 [12.9684683, 77.6142354],
 [12.9653749, 77.61762569999999],
 [12.9523105, 77.6203429],
 [12.9516902, 77.62140149999999],
 [12.9461995, 77.6223653],
 [12.9465027, 77.6229127]
 ]
 };*!/

 /!*var geoJsonObject = {
 "type": "MultiPoint",
 "coordinates": [
 [12.9465027, 77.6229127],
 [12.9456813, 77.62145629999999],
 [12.9435933, 77.62372359999999],
 [12.9425032, 77.6229025],
 [12.9298242, 77.6331986],
 [12.9251739, 77.637365],
 [12.9246169, 77.6499138],
 [12.9242181, 77.6502467999999977],
 [12.9240188, 77.6497819],
 [12.9236795, 77.64982309999999]
 ]
 };


 var boxer = new RouteBoxer();*!/
 var sourceLat = req.body.sourceLat;
 var sourceLng = req.body.sourceLng;
 var destinationLat = req.body.destinationLat;
 var destinationLng = req.body.destinationLng;
 var sourceAndDestinationLatLngObject = {};
 sourceAndDestinationLatLngObject.source = {};
 sourceAndDestinationLatLngObject.source.lat = sourceLat;
 sourceAndDestinationLatLngObject.source.lng = sourceLng;
 sourceAndDestinationLatLngObject.destination = {};
 sourceAndDestinationLatLngObject.destination.lat = destinationLat;
 sourceAndDestinationLatLngObject.destination.lng = destinationLng;
 constructGeoJsonObjectForARoute(sourceAndDestinationLatLngObject)
 .then(function(geoJsonObject){
 getRouteBoxer(geoJsonObject,0.1)
 .then(function(boxes){
 Location.find({location:{"$within":{"$polygon":[[12.4981,77.592],[12.7081, 77.7269],[12.7081,77.5471],[13.3381,77.7269]]}}},function(err,locations){
 if(err){
 console.log(err);

 /!*res.sendStatus(500);*!/
 }else if(locations != null){
 /!*res.json({locations:locations})*!/
 res.json(boxes);
 }
 })
 /!**!/
 }).fail(function(data){
 res.json(data)
 })
 }).fail(function(message){
 console.log(message);
 res.json({failure:'failure',message:message});
 })


 })*/

/*
 {
 "name":"",
 "lat":"",
 "lng":""
 }
 */
/*app.post('/addLocation',function(req,res,next){
 var name = req.body.name;
 var lat = req.body.lat;
 var lng = req.body.lng;

 var latitude = parseFloat(lat);
 var longitude = parseFloat(lng);
 var array = [];
 array.push(latitude);
 array.push(longitude);
 var location = new Location({
 name:name,
 location:array
 });

 location.save(function(err,location){
 if(err){
 console.log(err);
 json.sendStatus(500);
 }else{
 console.log('yo, the location is saved');
 res.json({message:'location successfully saved'});
 }
 })

 })*/

app.post('/timeDifference',function(req,res,next){
    var tempmoment = moment().utcOffset("+05:30");
    var currentTimeStamp = tempmoment.format('YYYY-MM-DD HH:mm:ss');
    var newTimeStamp = tempmoment.subtract(1,'h').format('YYYY-MM-DD HH:mm:ss');
    //res.json({timedifference:moment(currentTimeStamp).diff(moment(newTimeStamp),'minutes')});
    /*var currentTime;
     if( tempmoment.format('HH') == "00"){
     currentTime= tempmoment.format('HH:mm:ss');
     }else{
     currentTime= tempmoment.subtract(1,'h').format('HH:mm:ss');
     }*/
    var map = {};
    var key = {};
    key.name = 'yesh';
    key.age=25;

    var newKey = {};
    newKey.age = 28;
    newKey.name = 'ola';

    var anotherKey = {};
    map['ola'] = 'newFullName';
    map['olu'] = 'fullname';

    var key1 = {};
    res.json({map:map[key1]});
})

app.post('/getUberModel',function(req,res,next){
    var carModel = req.body.carModel;
    var city = req.body.city;
    UberModel.findOne({city:city,carModel:'ubergo'},function(err,uberModel){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(uberModel != null){
            res.json({uberModel:uberModel})
        }else{
            res.json({message:'could not find uber model'});
        }
    })
})
/*
 {
 uniqueId: Number
 }
 */

app.post('/getCompletedRideDetails',ensureAuthorized,function(req,res,next){
    var decodedToken = getDecodedXAuthTokenFromHeader(req);
    var customerNumber = decodedToken.customerNumber;
    var uniqueId = req.body.uniqueId;
    CompletedRide.findOne({customerNumber:customerNumber,uniqueId:uniqueId},function(err,completedRide){
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else if(completedRide!= null){
            console.log('successfully retrieved the completed rides');
            res.json({completedRides:completedRide})
        }else{
            res.json({failure:'failure',message:'There are no completed rides for this customer number'})
        }
    })
})


app.post('/calculateDistance',function(req,res,next){
    res.json({distanceTravelled:calculateDistance(req.body.latLngString)});
})





