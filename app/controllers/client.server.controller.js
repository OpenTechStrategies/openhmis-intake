'use strict';

var http = require('http'),
  querystring = require('querystring'),
  config = require('../../config');

/**
 * Module dependencies.
 */
exports.addClient = function(req, res) {

  // Eventually we need authentication

  // Build an object that we want to send
  var client = {
    first: req.body.firstName,
    last: req.body.lastName,
    ssn: req.body.ssn,
    dob: req.body.dob,
    race: req.body.race,
    ethnicity: req.body.ethnicity,
  }

  // Put together the data
  var post_data = querystring.stringify(client);

  // An object of options to indicate where to post to
  var post_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/clients/addClient',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end()

};
