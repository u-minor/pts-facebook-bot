'use strict';
const express = require('express');
const request = require('request-promise-native');
const AWS = require('aws-sdk');
const Wit = require('node-wit').Wit;

AWS.config.update({region: process.env.AWS_REGION});

const session = {};
const client = new Wit({
  accessToken: process.env.WIT_TOKEN,
  actions: {
    send: (req, res) => {
      console.log('req:', JSON.stringify(req, null, '  '));
      console.log('res:', JSON.stringify(res, null, '  '));
      return sendTextMessage(session[req.sessionId].facebookId, res.text)
        .then(() => {});
    },

    getForecast: req => {
      console.log('getForecast:', JSON.stringify(req, null, '  '));
      req.context.forecast = 'sunny';
      return Promise.resolve(req.context);
    }
  }
});

const app = express();
app.use(require('body-parser').json({limit: '5mb'}));

app.get('/webhook', (req, res) => {
  if (!req.query['hub.verify_token'] || req.query['hub.verify_token'] !== process.env.VERIFY_TOKEN) {
    res.send('Wrong verify token!');
    return
  }
  res.send(req.query['hub.challenge']);
});

app.post('/webhook', (req, res) => {
  const promises = [];
  const messaging_events = req.body.entry[0].messaging;

  messaging_events.forEach(event => {
    const sender = event.sender.id;
    if (event.message && event.message.text) {
      (event => {
        let sessionId;
        const p = getSession(event.sender.id)
          .then(data => {
            sessionId = data.sessionId;
            session[sessionId] = data;
            return client.runActions(sessionId, event.message.text, data.context);
          })
          .then(context => {
            session[sessionId] = context;
          })
          .catch(err => {
            console.log(err);
          })
        promises.push(p);
      })(event);
    }
  })

  Promise.all(promises)
    .then(() => {
      res.json({message: 'OK'});
    })
    .catch(err => {
      console.log(err);
      res.json({message: 'Error'});
    });
});

app.use((req, res, next) => {
  res.status(404).json({error: 'Not Found'});
});

const sendTextMessage = (sender, text) => {
  return request({
    url: 'https://graph.facebook.com/me/messages',
    qs: {
      access_token: process.env.PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: {
      recipient: {
        id: sender
      },
      message: {
        text: text
      }
    }
  });
};

const getSession = sender => {
  return Promise.resolve({
    sessionId: `${sender}_${new Date().toISOString()}`,
    facebookId: sender,
    context: {}
  });
};

module.exports = app;
