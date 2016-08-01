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
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    ssn: req.body.ssn,
    dob: req.body.dob,
    gender: req.body.gender,
    ethnicity: req.body.ethnicity,
    asian: req.body.asian,
    amIndAKNative: req.body.amIndAKNative,
    blackAfAmerican: req.body.blackAfAmerican,
    nativeHIOtherPacific: req.body.nativeHIOtherPacific,
    white: req.body.white,
    raceNone: req.body.raceNone
  }

  // Put together the data
  var post_data = JSON.stringify(client);

  // An object of options to indicate where to post to
  var post_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/clients/',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length,
          'Authorization': req.body.id_token
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res_post) {
      res_post.setEncoding('utf8');
      var data = []
      res_post.on('data', function (chunk) {
          console.log('DEBUG: Response: ' + chunk);
          data.push(chunk);
      });
      res_post.on('end', function() {
          if (res_post.statusCode == '500') {
              res.status(res_post.statusCode).send();
          }
          else {
              res.send(res_post.statusCode, data.join(''));
          }
      });
  });
    
  // post the data
  post_req.write(post_data);
  post_req.end()

};

exports.getEnrollments = function(req, res) {

  // TODO: Two things:
  //
  // 1. This function preserves the 2-spaces-per-indentation-level
  //    style that prevailed in this file at the time this function
  //    was added, even though we're planning to re-indent later.
  //
  // 2. At the time it was added, this function was exactly the same
  //    as getClients(), except for using the word "enrollments"
  //    instead of "clients".  This suggests some easy refactoring,
  //    and to look elsewhere in the file for other commonalities.

  // Eventually we need authentication

  // An object of options to indicate where to post to
  var get_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/enrollments/',
      method: 'GET',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': req.query.id_token
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
        res.status(res_get.statusCode).send(data.join(''));
      });
  });

  // post the data
  get_req.end()

};

exports.getClients = function(req, res) {
  // Eventually we need authentication

  // An object of options to indicate where to post to
  var get_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/clients/',
      method: 'GET',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': req.query.id_token
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
        res.status(res_get.statusCode).send(data.join(''));
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
      path: '/openhmis/api/v3/clients/' + req.params.id,
      method: 'GET',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': req.query.id_token
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
        res.status(res_get.statusCode).send(data.join(''));
      });
  });

  // post the data
  get_req.end()

};

exports.editClient = function(req, res) {
  // Eventually we need authentication

    // Build an object that we want to send

    // TODO: we shouldn't need to do this workaround, but for some
    // reason the 'raceNone' value is appearing as the empty string when
    // it should be null.  The API doesn't accept non-null values for
    // 'raceNone' when any other race is set, so it needs to be null,
    // not the empty string, when we send it over.  Thoughts, anyone?
    if (req.body.raceNone == '') {
        req.body.raceNone = null;
    }
    var client = {
        personalId: req.body.personalId,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        ssn: req.body.ssn,
        dob: req.body.dob,
        gender: req.body.gender,
        ethnicity: req.body.ethnicity,
        amIndAKNative: req.body.amIndAKNative,
        asian: req.body.asian,
        blackAfAmerican: req.body.blackAfAmerican,
        nativeHIOtherPacific: req.body.nativeHIOtherPacific,
        white: req.body.white,
        raceNone: req.body.raceNone
    }

    // Put together the data
    var wrap_client = { "data": { "item": client}};
    var client_string = JSON.stringify(client);

    // An object of options to indicate where to put to
  var put_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/clients/' + client.personalId,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': client_string.length,
          'Authorization': req.body.id_token
      }
  };
    
  // Set up the request
  var put_req = http.request(put_options, function(res_put) {
      res_put.setEncoding('utf8');
      var data = []
      res_put.on('data', function (chunk) {
          console.log('DEBUG: Response: ' + chunk);
          data.push(chunk);
      });
      res_put.on('end', function() {
        res.status(res_put.statusCode).send(data.join(''));
      });
  });

    // put the data
    put_req.write(client_string);
    put_req.end()

};



exports.getClientId = function(req, res) {
  var get_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/authenticate/google/client_key/',
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
        res.status(res_get.statusCode).send(data.join(''));
      });
  });

  // post the data
  get_req.end()
};

exports.authenticateUser = function(req, res) {
    var post_data = req.body.code;
  // An object of options to indicate where to post to
  var post_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/authenticate/google/',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res_post) {
      res_post.setEncoding('utf8');
      var data = []
      res_post.on('data', function (chunk) {
          // TBD: I have to send this back instead of just logging it
          console.log('DEBUG: Response: ' + chunk);
          data.push(chunk);
      });
      res_post.on('end', function() {
        res.status(res_post.statusCode).send(data);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end()

};

exports.getIdentity = function (req, res) {
    var post_data = req.body.token;
  // An object of options to indicate where to post to
  var post_options = {
      host: config.api.host,
      port: config.api.port,
      path: '/openhmis/api/v3/authenticate/externalId/',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length,
          'Authorization': req.body.token,
          'Accept': 'application/json'
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res_post) {
      res_post.setEncoding('utf8');
      var data = [];
      res_post.on('data', function (chunk) {
          data.push(chunk);
      });
      res_post.on('end', function() {
          res.status(res_post.statusCode).send(data);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end()
};


