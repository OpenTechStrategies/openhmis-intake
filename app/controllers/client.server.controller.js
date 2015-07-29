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
      path: '/openhmis/services/clients/',
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

exports.getClients = function(req, res) {

  // Eventually we need authentication

  // An object of options to indicate where to post to
  var get_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/services/clients/',
      method: 'GET',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
      }
  };

  // Set up the request
  var get_req = http.request(get_options, function(res_get) {
      res_get.setEncoding('utf8');
      var data = []
      res_get.on('data', function (chunk) {
          data.push(chunk);
      });
      res_get.on('end', function() {
        res.send(data.join(''));
      });
  });

  // post the data
  get_req.end()

};

exports.getClient = function(req, res) {

  // Eventually we need authentication

  // An object of options to indicate where to post to
  var get_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/services/clients/' + req.params.id,
      method: 'GET',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
      }
  };

  // Set up the request
  var get_req = http.request(get_options, function(res_get) {
      res_get.setEncoding('utf8');
      var data = []
      res_get.on('data', function (chunk) {
          data.push(chunk);
      });
      res_get.on('end', function() {
        res.send(data.join(''));
      });
  });

  // post the data
  get_req.end()

};

exports.editClient = function(req, res) {

  // Eventually we need authentication

  // Put together the data
  // An object of options to indicate where to put to
  var put_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/services/clients/' + req.body.personalId,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': put_data.length
      }
  };

    
  // Set up the request
  var put_req = http.request(put_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      });
  });

  // put the data
  put_req.write(req.body);
  put_req.end()

};
