'use strict';
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TICKETS_TABLE_NAME = 'tickets';

/**
 * Create ticket.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.submit = (event, context, callback) => {
  console.log("...started...");
  const requestBody = JSON.parse(event.body);
  const email = requestBody.email;
  const name = requestBody.name;
  const message = requestBody.message;


  const ticketInfoToCreate = ticketInfo(email, name, message);
  submitTicket(ticketInfoToCreate)
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Ticket sucessfully submitted with email ${email}, Please note reference id for future reference ${res.id}`,
          ticketId: res.id,
          submitted: email
        }),
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit ticket with email ${email}`
        })
      })
    });

};
const submitTicket = ticket => {
  console.log('Submitting ticket');
  const ticketInfo = {
    TableName: TICKETS_TABLE_NAME,
    Item: ticket,
  };
  return dynamoDb.put(ticketInfo).promise()
    .then(res => ticket);
};

const ticketInfo = (email, name, message) => {
  const timestamp = new Date().getTime();
  var id = name.substring(0, 1) + Math.round(Date.now() / 1000);

  return {
    id: id,
    email: email,
    name: name,
    message: message,
    createdOn: timestamp,
    status: 'open'
  };
};