'use strict';

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
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
            // split out the contents from the headers and footers
            var csv_body = body.split("\r\n");
            var csv_contents = csv_body[4];
            res.send(csv_contents);
        });
    }
    else{
        res.render('index', {
            user: req.user || null,
            request: req
        });
    }
};
