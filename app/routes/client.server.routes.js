'use strict';

module.exports = function(app) {
  // Client routing
  var client = require('../../app/controllers/client.server.controller');
  app.route('/client').post(client.addClient);
};
