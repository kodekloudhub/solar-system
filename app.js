const path = require('path');
const fs = require('fs')
const express = require('express');
const OS = require('os');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const app = express();
const cors = require('cors')
const serverless = require('serverless-http')
const fallbackPlanets = require('./planets-data');


app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));
app.use(cors())

const hasMongoConfig = Boolean(process.env.MONGO_URI);

if (hasMongoConfig) {
    mongoose.connect(process.env.MONGO_URI, {
        user: process.env.MONGO_USERNAME,
        pass: process.env.MONGO_PASSWORD,
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function(err) {
        if (err) {
            console.log("error!! " + err)
        } else {
          //  console.log("MongoDB Connection Successful")
        }
    })
} else {
    console.log("MONGO_URI is not set. Using local in-memory planet data.");
}

var Schema = mongoose.Schema;

var dataSchema = new Schema({
    name: String,
    id: Number,
    description: String,
    image: String,
    velocity: String,
    distance: String
});
var planetModel = hasMongoConfig ? mongoose.model('planets', dataSchema) : null;

async function getPlanetById(planetId) {
    if (planetModel) {
        return planetModel.findOne({
            id: planetId
        }).lean().exec();
    }

    return fallbackPlanets.find((planet) => planet.id === Number(planetId)) || null;
}


app.post('/planet',   async function(req, res) {
    try {
        const planetData = await getPlanetById(req.body.id);

        if (!planetData) {
            return res.status(404).send("Planet not found. Select a number from 0 - 8");
        }

        res.send(planetData);
    } catch (err) {
        console.log("error!! " + err)
        res.status(500).send("Error in Planet Data")
    }
})

app.get('/',   async (req, res) => {
    res.sendFile(path.join(__dirname, '/', 'index.html'));
});

app.get('/api-docs', (req, res) => {
    fs.readFile('oas.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        res.status(500).send('Error reading file');
      } else {
        res.json(JSON.parse(data));
      }
    });
  });
  
app.get('/os',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "os": OS.hostname(),
        "env": process.env.NODE_ENV
    });
})

app.get('/live',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "live"
    });
})

app.get('/ready',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "ready"
    });
})

app.listen(3000, () => { console.log("Server successfully running on port - " +3000); })
module.exports = app;

//module.exports.handler = serverless(app)
