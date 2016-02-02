'use strict';

/**
 * Module dependencies.
 */

exports.index = function(req, res) {
    var local = {}
    try {
        local = require('../../config/env/local');
    } catch (e) {
        console.log("IMPORTANT: You have not set up your local configuration in /config/env/local.js");
    }

        res.render('index', {
            user: req.user || null,
            client_id: local.app.client_id,
            request: req
        });
};
