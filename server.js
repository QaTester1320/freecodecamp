'use strict'
const express = require('express');
const app = express();

const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Only load test runner if not on Vercel (production) and tests folder exists
let runner;
const testsPath = path.join(__dirname, 'tests');
if (!process.env.VERCEL && fs.existsSync(testsPath)) {
  runner = require('./test-runner');
} else {
  console.log('Skipping test-runner in production.');
}

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.use(express.static(__dirname + '/public'));

app.get('/hello', function (req, res) {
  const name = req.query.name || 'Guest';
  res.type('txt').send('hello ' + name);
});

const travellers = function (req, res) {
  let data = {};
  if (req.body && req.body.surname) {
    switch (req.body.surname.toLowerCase()) {
      case 'polo':
        data = {
          name: 'Marco',
          surname: 'Polo',
          dates: '1254 - 1324'
        };
        break;
      case 'colombo':
        data = {
          name: 'Cristoforo',
          surname: 'Colombo',
          dates: '1451 - 1506'
        };
        break;
      case 'vespucci':
        data = {
          name: 'Amerigo',
          surname: 'Vespucci',
          dates: '1454 - 1512'
        };
        break;
      case 'da verrazzano':
      case 'verrazzano':
        data = {
          name: 'Giovanni',
          surname: 'da Verrazzano',
          dates: '1485 - 1528'
        };
        break;
      default:
        data = {
          name: 'unknown'
        }
    }
  }
  res.json(data);
};

app.route('/travellers')
  .put(travellers);

let error;
app.get('/_api/get-tests', cors(), function (req, res, next) {
  if (error) return res.json({ status: 'unavailable' });
  next();
},
  function (req, res, next) {
    if (!runner || !runner.report) return next();
    res.json(testFilter(runner.report, req.query.type, req.query.n));
  },
  function (req, res) {
    if (!runner) return res.json({ status: 'tests not running in production' });
    runner.on('done', function (report) {
      process.nextTick(() => res.json(testFilter(runner.report, req.query.type, req.query.n)));
    });
  });

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Listening on port " + port);

  // Only run tests locally
  if (!process.env.VERCEL && runner) {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        error = e;
        console.log('Tests are not valid:');
        console.log(error);
      }
    }, 1500);
  }
});

module.exports = app; // for testing

function testFilter(tests, type, n) {
  let out;
  switch (type) {
    case 'unit':
      out = tests.filter(t => t.context.match('Unit Tests'));
      break;
    case 'functional':
      out = tests.filter(t => t.context.match('Functional Tests'));
      break;
    default:
      out = tests;
  }
  if (n !== undefined) {
    return out[n] || out;
  }
  return out;
}
