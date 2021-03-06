'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const SESSION_TABLE_NAME = 'kt-sessions';
const PROFILE_TABLE_NAME = 'kt-dev';
const { v4: uuidv4 } = require('uuid');
const timestamp = new Date().getTime();
const HOST_SESSION_POINTS = 20;
const CANCEL_HOST_SESSION_POINTS = -20;

//Create session.
module.exports.submit = (event, context, callback) => {
  console.log("...started...");
  const requestBody = JSON.parse(event.body);
  const email = requestBody.email;
  const scheduledDate = requestBody.scheduledDate;
  const fromTime = requestBody.fromTime;
  const toTime = requestBody.toTime;
  const topic = requestBody.topic;
  const description = requestBody.description;
  const tags = requestBody.tags;
  const presenters = requestBody.presenters;
  const inviteLink = requestBody.inviteLink;

  checkPermission(event, callback, email);

  submitSession(sessionInfo("-1", email, scheduledDate, fromTime, toTime, topic, description, tags,
    presenters, "Scheduled", inviteLink, null, null))
    .then(res => {
      //update learning points
      updateLearningPointsOnHostOrAttendSession(email, callback, HOST_SESSION_POINTS);
      callback(null, {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(
          res
        )
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit session for ${email}`
        })
      })
    });
};


const submitSession = session => {
  console.log('Submitting session');
  const sessionInfo = {
    TableName: SESSION_TABLE_NAME,
    Item: session,
  };
  return dynamoDb.put(sessionInfo).promise()
    .then(res => session);
};

const sessionInfo = (id, email, scheduledDate, fromTime, toTime, topic, description, tags,
  presenters, status, inviteLink, recordingLinks, feedback) => {
  var sessionId = id;
  sessionId = sessionId < 0 ? uuidv4() : sessionId;
  return {
    id: sessionId,
    createdBy: email,
    scheduledDate: scheduledDate,
    fromTime: fromTime,
    toTime: toTime,
    topic: topic,
    description: description,
    tags: tags,
    presenters: presenters,
    status: status,
    inviteLink: inviteLink,
    recordingLinks: recordingLinks,
    submittedAt: timestamp,
    updatedAt: timestamp,
    feedback: feedback
  };
};


/**
 * Fetch session by id.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.get = (event, context, callback) => {
  const params = {
    TableName: SESSION_TABLE_NAME,
    Key: {
      id: event.pathParameters.id,
    },
  };

  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch session.'));
      return;
    });
};

/**
 * Fetch all sessions.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.fetchAll = (event, context, callback) => {
  const params = {
    TableName: SESSION_TABLE_NAME
  };

  dynamoDb.scan(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Items),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch sessions.'));
      return;
    });
};

/**
 * Update a session by a user
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.update = (event, context, callback) => {
  console.log("...started...");
  const id = event.pathParameters.id;
  const requestBody = JSON.parse(event.body);
  const email = requestBody.email;
  const scheduledDate = requestBody.scheduledDate;
  const fromTime = requestBody.fromTime;
  const toTime = requestBody.toTime;
  const topic = requestBody.topic;
  const description = requestBody.description;
  const tags = requestBody.tags;
  const presenters = requestBody.presenters;
  const status = requestBody.status;
  const recordingLinks = requestBody.recordingLinks;
  const feedback = requestBody.feedback;
  const inviteLink = requestBody.inviteLink;
  /**
   * other fields.
   * 
  const status = requestBody.status;
  const attendees = requestBody.attendees;
  */

  checkPermission(event, callback, email);

  submitSession(sessionInfo(id, email, scheduledDate, fromTime, toTime, topic, description, tags,
    presenters, status, inviteLink, recordingLinks, feedback))
    .then(res => {
      //Currently a status == 'cancelled' only in one case. When user cancel his session.
      //That's why we can put below condition.
      if (status.toLowerCase() === 'cancelled') {
        console.log("Reducing the hosting session in case of cancellation")
        updateLearningPointsOnHostOrAttendSession(email, callback, CANCEL_HOST_SESSION_POINTS)

      }
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully updated session by ${email}`,
          id: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to update session for ${email}`
        })
      })
    });
};
/**
 * Update feedback in session.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.feedback = (event, context, callback) => {
  const id = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const paramName = 'feedback';
  var paramValue = body.feedback;
  const email = body.email;

  if (paramValue.rating < 0 || paramValue.rating > 5) {
    return callback(null, response(400, { error: 'Invalid rating submitted. It can be from 0 to 5.' }))
  }
  paramValue.id = paramValue.id < 0 ? uuidv4() : paramValue.id;
  paramValue.provider = email;
  paramValue.submittedAt = timestamp;
  paramValue.updatedAt = timestamp;
  paramValue.sessionId = id;

  checkPermission(event, callback, email);

  const params = {
    Key: {
      id: id
    },
    TableName: SESSION_TABLE_NAME,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'set #feedbacks = list_append(if_not_exists(#feedbacks, :empty_list), :paramValue)',
    ExpressionAttributeValues: {
      ':paramValue': [paramValue],
      ':empty_list': []
    },
    ExpressionAttributeNames: {
      '#feedbacks': 'feedbacks'
    },
    ReturnValue: 'ALL_NEW'
  };

  return dynamoDb.update(params)
    .promise()
    .then(res => {
      callback(null, response(200, res))
    })
    .catch(err =>
      callback(null, response(err.statusCode, err))
    );

}

module.exports.recording = (event, context, callback) => {
  const id = event.pathParameters.id;
  const body = JSON.parse(event.body);
  var paramValue = body.recordingLink;
  const email = body.email;

  checkPermission(event, callback, email);

  const params = {
    Key: {
      id: id
    },
    TableName: SESSION_TABLE_NAME,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'set #recordingLinks = :paramValue',
    ExpressionAttributeValues: {
      ':paramValue': paramValue
    },
    ExpressionAttributeNames: {
      '#recordingLinks': 'recordingLinks'
    },
    ReturnValue: 'ALL_NEW'
  };

  return dynamoDb.update(params)
    .promise()
    .then(res => {
      callback(null, response(200, res))
    })
    .catch(err =>
      callback(null, response(err.statusCode, err))
    );

}

/**
 * Build response.
 * @param {*} statusCode 
 * @param {*} message 
 */
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

/**
 * Check the user email in the token and validate against calling email id.
 * @param {*} event 
 * @param {*} callback 
 * @param {*} emailInRequest 
 */
function checkPermission(event, callback, emailInRequest) {
  var base64Url = event.headers.authorization.split('.')[1];
  const header = Buffer.from(base64Url, 'base64').toString();
  var emailInToken = JSON.parse(header).email;
  if (emailInToken != emailInRequest) {
    return callback(null, response(403, { error: 'Action not permitted.' }))
  }
}

function updateLearningPointsOnHostOrAttendSession(email, callback, points) {
  console.log("Update learning points called for: " + email);

  var params = {
    Key: {
      email: email
    },
    TableName: PROFILE_TABLE_NAME,
    ConditionExpression: 'attribute_exists(email)',
    UpdateExpression: "SET #learningPoints = if_not_exists(#learningPoints, :start) + :num",

    ExpressionAttributeValues: {
      ":num": points,
      ":start": 0
    },
    ExpressionAttributeNames: {
      '#learningPoints': 'learningPoints'
    },
    ReturnValue: 'UPDATED_NEW'
  };

  return dynamoDb.update(params)
    .promise()
    .then(res => {
      console.log("RES from update LP: " + res)
      callback(null, response(200, res))
    })
    .catch(err => {
      console.log("err from update LP: " + err)
      callback(null, response(err.statusCode, err))
    }

    );

}