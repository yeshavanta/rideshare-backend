/**
 * Created by yash on 4/18/2015.
 */

var express = require('express');
var app =  express();
var Cusomter = require('./models/Customer');

app.use(require('body-parser').json());
app.use(function(req,res,next){
    res.setHeader('Access-Control-Allow-Origin','*');
    //res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Methods','GET','POST');
    res.setHeader('Access-Control-Allow-Headers','X-Requested-With,Content-Type,Authorization,X-Auth');
    next();
});
app.use(express.static(__dirname + '/public'));

app.listen(3000,function(){
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
                        res.json({token:token,data:'Welcome'});
                    }
                })
            });
        }else{
            res.json({data:'The email address is already registered'});
        }
    })
});

