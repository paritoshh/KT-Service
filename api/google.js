'use strict';
const { google } = require('googleapis');
const fs = require('fs');
const CREATE_TOKEN_PATH = 'create-token.json';
const DELETE_TOKEN_PATH = 'delete-token.json';
/**
 * Create google events.
 * @param {*} event 
 * @param {*} context 
 * @param {*} callback 
 */
module.exports.consentUrl = (event, context, callback) => {
  console.log("...started...");



  const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];
  const oAuth2Client = new google.auth.OAuth2('343050259111-a2cfprrl5qa3g6mlufnec5fa7r0regfd.apps.googleusercontent.com',
    'y02V-GOQh2EW4Vtjo7A7VnJ0',
    'https://ktportal.link/sessions/own')
  const consentUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log("const URL made:::: " + consentUrl)
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      consentUrl: consentUrl
    }),
  };

  callback(null, response);
};

// module.exports.code = (event, context, callback) => {
//   console.log("... createEvent started...");

//   const code = event.queryStringParameters.code;

//   console.log("... code fetched:: " + code);

//   const TOKEN_PATH = 'token.json';

//   console.log("... TOKEN_PATH:: " + TOKEN_PATH);

//   const response = {
//     statusCode: 200,
//     body: JSON.stringify({
//       code: code,
//       status: 'Success'
//     }),
//   };
//   callback(null, response);

// };


module.exports.createEvent = (event, context, callback) => {
  console.log("... createEvent started...");

  const requestBody = JSON.parse(event.body);
  const summary = requestBody.summary;
  const location = requestBody.location;
  const description = requestBody.description;
  const code = requestBody.code;
  const start = requestBody.start;
  const end = requestBody.end;
  const action = requestBody.action;


  console.log("...  requestBody:: " + requestBody);
  console.log("...  summary:: " + summary);
  console.log("...  location:: " + location);
  console.log("...  description:: " + description);
  console.log("...  code:: " + code);
  console.log("...  start:: " + start);
  console.log("...  end:: " + end);
  console.log("... action:: " + action);

  const oAuth2Client = new google.auth.OAuth2('343050259111-a2cfprrl5qa3g6mlufnec5fa7r0regfd.apps.googleusercontent.com',
    'y02V-GOQh2EW4Vtjo7A7VnJ0',
    'https://ktportal.link/sessions/own')


  fs.readFile(CREATE_TOKEN_PATH, (err, token) => {
    if (err) {
      console.log("Unable to fetch token from token.json file : ", err)
      return getCreateAccessToken(oAuth2Client, summary, location, description, code, start, end, callback);
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    createEvent(oAuth2Client, summary, location, description, start, end, callback);
  });


};

module.exports.deleteEvent = (event, context, callback) => {
  console.log("... deleteEvent started...");

  const requestBody = JSON.parse(event.body);
  const summary = requestBody.summary;
  const location = requestBody.location;
  const description = requestBody.description;
  const code = requestBody.code;
  const start = requestBody.start;
  const end = requestBody.end;
  const action = requestBody.action;


  console.log("...  requestBody:: " + requestBody);
  console.log("...  summary:: " + summary);
  console.log("...  location:: " + location);
  console.log("...  description:: " + description);
  console.log("...  code:: " + code);
  console.log("...  start:: " + start);
  console.log("...  end:: " + end);
  console.log("... action:: " + action);

  const oAuth2Client = new google.auth.OAuth2('343050259111-a2cfprrl5qa3g6mlufnec5fa7r0regfd.apps.googleusercontent.com',
    'y02V-GOQh2EW4Vtjo7A7VnJ0',
    'https://ktportal.link/sessions/own')

  fs.readFile(DELETE_TOKEN_PATH, (err, token) => {
    if (err) {
      console.log("Unable to fetch token from token.json file : ", err)
      return getDeleteAccessToken(oAuth2Client, summary, location, description, code, start, end, callback);
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    deleteGoogleEvent(oAuth2Client, description, start, callback);
  });

};


function getCreateAccessToken(oAuth2Client, summary, location, description, code, start, end, callback) {
  console.log("...getAccessToken started...")
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later program executions
    fs.writeFile(CREATE_TOKEN_PATH, JSON.stringify(token), (err) => {
      if (err) return console.error(err);
      console.log('Token stored to', CREATE_TOKEN_PATH);
    });
    createEvent(oAuth2Client, summary, location, description, start, end, callback);

  });
}

function getDeleteAccessToken(oAuth2Client, summary, location, description, code, start, end, callback) {
  console.log("...getAccessToken started...")
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later program executions
    fs.writeFile(DELETE_TOKEN_PATH, JSON.stringify(token), (err) => {
      if (err) return console.error(err);
      console.log('Token stored to', DELETE_TOKEN_PATH);
    });
    deleteGoogleEvent(oAuth2Client, description, start, callback);
  });
}

function createEvent(oAuth2Client, summary, location, description, start, end, callback) {
  console.log("Create event called");
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  const eventC = {
    summary: summary,
    location: location,
    description: description,
    start: {
      dateTime: start,
      timeZone: 'Asia/Calcutta',
    },
    end: {
      dateTime: end,
      timeZone: 'Asia/Calcutta'
    },
    ColorId: 1,
  }

  return calendar.events.insert({ calendarId: 'primary', resource: eventC },
    err => {
      if (err) {
        console.error('Calendar Event Creation Error: ', err)
        const response = {
          statusCode: 500,
          body: JSON.stringify({
            status: 'Calendar Event Creation Error: ', err
          }),
        };
        callback(null, response);
      }
      console.log('Calendar Event Created.')
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          status: 'Calendar Event Created'
        }),
      };
      callback(null, response);
    }
  )
}

function deleteGoogleEvent(oAuth2Client, description, start, callback) {
  console.log("Create deleteGoogleEvent called");
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  console.log("start toISOString:: " + (new Date(start)).toISOString());
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date(start)).toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: 'Asia/Calcutta'
  },
    (err, res) => {
      if (err) {
        console.error('Calendar Event listing Error: ', err)
        const response = {
          statusCode: 500,
          body: JSON.stringify({
            status: 'Calendar Event Creation Error: ', err
          }),
        };
        callback(null, response);
      }
      let events = res.data.items
      console.log('Calendar Event Listed.')
      console.log('description in input :::.' + description)
      for (let i = 0; i < events.length; i++) {
        console.log('Calendar description.:' + i + ' :: ' + events[i].description)
        if (events[i].description == description) {
          let eventId = events[i].id
          deleteEvent(oAuth2Client, eventId, callback)
        }
      }

      const response = {
        statusCode: 200,
        body: JSON.stringify({
          status: 'Success',
          data: res.data.items
        }),
      };
      callback(null, response);
    }
  )
}


function deleteEvent(oAuth2Client, eventId, callback) {

  console.log("Delete event called");
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });


  calendar.events.delete({ calendarId: 'primary', eventId: eventId },
    (err, res) => {
      if (err) {
        console.error('Calendar Event delete Error: ', err)
        const response = {
          statusCode: 500,
          body: JSON.stringify({
            status: 'Calendar Event delete Error: ', err
          }),
        };
        callback(null, response);
      }
      console.log('Calendar Event Deleted.')
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          status: 'Calendar Event Deleted',
          response: res
        }),
      };
      callback(null, response);
    }
  )
}