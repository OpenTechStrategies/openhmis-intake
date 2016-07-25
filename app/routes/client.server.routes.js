'use strict';

module.exports = function(app) {
  // Client routing
  var client = require('../../app/controllers/client.server.controller');
  app.route('/clients').post(client.addClient);
  app.route('/clients').get(client.getClients);
  app.route('/enrollments').get(client.getEnrollments);
  app.route('/clients/:id').get(client.getClient);
  app.route('/clients/:id').put(client.editClient);
  app.route('/client_id').get(client.getClientId);
  app.route('/authenticate').post(client.authenticateUser);
  app.route('/identify').post(client.getIdentity);
};
