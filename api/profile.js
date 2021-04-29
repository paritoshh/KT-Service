'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const PROFILE_TABLE_NAME = 'kt-dev';
const SESSION_TABLE_NAME = 'kt-sessions';

/**
 * Update profile of a user.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.submit = (event, context, callback) => {
  console.log("...started...");
  const requestBody = JSON.parse(event.body);
  const email = event.pathParameters.email;
  const skills = requestBody.skills;
  const interestedSkills = requestBody.interestedSkills;
  const firstName = requestBody.firstName;
  const lastName = requestBody.lastName;
  const location = requestBody.location;
  const dob = requestBody.dob;
  //const learningPoints = requestBody.learingPoints;
  //const registeredSessions = requestBody.registeredSessions;
  //const hostedSessions = requestBody.hostedSessions;
  //const requestedSessions = requestBody.requestedSessions;
  const experience = requestBody.experience;

  submitProfile(profileInfo(email, skills, interestedSkills, firstName, lastName,
       location, dob, experience))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted profile with email ${email}`,
          email: res.email
        }),
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit profile with email ${email}`
        })
      })
    });

};
const submitProfile = profile => {
  console.log('Submitting profile');
  const profileInfo = {
    TableName: PROFILE_TABLE_NAME,
    Item: profile,
  };
  return dynamoDb.put(profileInfo).promise()
    .then(res => profile);
};

const profileInfo = (email, skills, interestedSkills, firstName, lastName,
     location, dob, experience) => {
  const timestamp = new Date().getTime();
  return {
    email: email,
    skills: skills,
    interestedSkills: interestedSkills,
    firstName: firstName,
    lastName: lastName,
    location: location,
    dob: dob,
    // learningPoints: learningPoints,
    // registeredSessions: registeredSessions,
    // hostedSessions: hostedSessions,
    // requestedSessions: requestedSessions,
    experience: experience,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};

 /**
  * Fetch user profile by email.
  * @param {*} event 
  * @param {*} context 
  * @param {*} callback 
  */
module.exports.get = (event, context, callback) => {
  const params = {
    TableName: PROFILE_TABLE_NAME,
    Key: {
      email: event.pathParameters.email,
    },
  };

  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item)//,
        //headers: {"Access-Control-Allow-Origin":"*"}
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch profile.'));
      return;
    });
};

/**
 * Update register / unregistered sessions.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.registerUnregisterSession = (event, context, callback)=>{
  const email = event.pathParameters.email;
  const body = JSON.parse(event.body);
  const paramName = 'registeredSessions';
  var paramValue = body.session;
  var isRegister = body.isRegister;
  var params = "";
  var indexOfSessionWhichNeedsToBeRemoved = body.indexOfSessionWhichNeedsToBeRemoved;
  console.log("Email email: "+event.pathParameters.email);
  console.log("session:: "+ paramValue);

  // //find the index of session.
  // console.log("isRegister in request: "+isRegister);
   if(!isRegister){
  //   console.log("UnRegister flow");
  //   //Fetching index of session
  //   const paramsForProfile = {
  //     TableName: PROFILE_TABLE_NAME,
  //     Key: {
  //       email: event.pathParameters.email,
  //     },
  //   };
  //   dynamoDb.get(paramsForProfile).promise()
  //   .then(result => {
  //     indexOfSessionWhichNeedsToBeRemoved = result
  //     .Item
  //     .registeredSessions.indexOf(paramValue);
  //     callback(null, response);
  //   })
  //   .catch(error => {
  //     console.error(error);
  //     callback(new Error('Couldn\'t fetch profile.'));
  //     return;
  //   });
  
  params = {
    Key: {
      email: email
    },
    TableName: PROFILE_TABLE_NAME,
    //ConditionExpression: 'attribute_exists(email)',
    UpdateExpression: `REMOVE registeredSessions[${indexOfSessionWhichNeedsToBeRemoved}]`
  };
}
else{
  console.log("Register flow");
  params = {
    Key: {
      email: email
    },
    TableName: PROFILE_TABLE_NAME,
    ConditionExpression: 'attribute_exists(email)',
    UpdateExpression: 'set #registeredSessions = list_append(if_not_exists(#registeredSessions, :empty_list), :paramValue)',
    ExpressionAttributeValues : {
      ':paramValue' : [paramValue],
      ':empty_list': []
    },
    ExpressionAttributeNames: {
      '#registeredSessions': 'registeredSessions'
    },
    ReturnValue: 'ALL_NEW'
  };

}
console.log("indexOfSessionWhichNeedsToBeRemoved value: "+indexOfSessionWhichNeedsToBeRemoved);
console.log("params value: "+params);

  return dynamoDb.update(params)
  .promise()
  .then(res=>{
    callback(null, response(200, res))
  })
  .catch(err=>
    callback(null, response(err.statusCode, err))
  );

}
/**
 * Build response.
 * @param {*} statusCode 
 * @param {*} message 
 */
function response(statusCode, message){
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}