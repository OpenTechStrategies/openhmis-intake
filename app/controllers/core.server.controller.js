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
            
            // split out the contents from the headers
            var csv_body = body.split("Content-Type: text/csv\r\n\r\n");
            // and from the footers
            var csv_only = csv_body[1].split("\r\n\r\n-----------------------------");
            var csv_contents = csv_only[0];
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
