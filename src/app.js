'use strict';
const express = require('express');
const request = require('request-promise-native');

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
      promises.push(sendTextMessage(sender, `Text received: ${event.message.text}`));
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

module.exports = app;
