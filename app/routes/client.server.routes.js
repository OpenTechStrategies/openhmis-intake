'use strict';

module.exports = function(app) {
  // Client routing
  var client = require('../../app/controllers/client.server.controller');
  app.route('/clients').post(client.addClient);
  app.route('/clients').get(client.getClients);
};
