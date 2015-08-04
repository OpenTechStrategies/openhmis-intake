'use strict';

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
    var qs = require('querystring');
    if (req.method == "POST"){
        var body = '';
        req.on('data', function (data) {
            body += data;
            if (body.length > 1e6) { 
                req.connection.destroy();
            }
        });
        req.on('end', function () {
            // naming this "file_data" because I assume that we will
            // only be POST-ing imported files.  This may change in the
            // future.
            var file_data = qs.parse(body);
            res.send(file_data);
        });
    }
    else{
        res.render('index', {
            user: req.user || null,
            request: req
        });
    }
};
