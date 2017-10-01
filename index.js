const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const MongoClient    = require('mongodb').MongoClient;

const apiaiApp = require('apiai')(process.env.CLIENT_ACCESS_TOKEN);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.get('/', (req, res) => {
  res.send("Deployed");
});
/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
  //console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = apiaiApp.textRequest(text, {
    sessionId: 'tabby_cat' // use any arbitrary id
  });

  apiai.on('response', (response) => {
  let aiText = response.result.fulfillment.speech;

  var duration_t = response.result.parameters['duration'];
  //console.log(duration_t);
  var duration = 0;
  if(duration_t) {
    duration = duration_t['amount'] * 60;
    console.log(duration);
  }
  if(response.result.action === "command") {
    makeCoffee(duration);
  }

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: aiText}
      }
    }, (error, response) => {
      if (error) {
          //console.log('Error sending message: ', error);
      } else if (response.body.error) {
          //console.log('Error: ', response.body.error);
      }
    });
 });
  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}
//for checking
app.get('/action', (req, res) => {

  MongoClient.connect(process.env.MONGODB_URI, function (error, db){
    if(error) res.send(error);

    var item = db.collection('coffeebot').find().limit(1).sort({ $natural : -1});
    item.toArray(function(err, result) {
      if(err) {
        res.send({'error: ' : err});
      }
      else {
        res.send(result[0]);
      }
    });
  });
});

app.get('/done', (req, res) => {
  MongoClient.connect(process.env.MONGODB_URI, function (error, db){
    if(error) res.send(error);

    db.collection('coffeebot').drop();
    db.close();
  });

  res.send("done");
});

function makeCoffee(duration) {
  MongoClient.connect(process.env.MONGODB_URI, function(err, db) {

    if(err) { throw err;  }

    var collection = db.collection('coffeebot');

    var duration_job = { duration: duration};

    collection.insert(duration_job, function(err, result) {

      if(err) { throw err; }
      console.log("Job Saved");
      db.close();
    });
  });
}
