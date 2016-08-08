    function importLine(line_string, line_counter, ssn_array) {
        var line_object = Papa.parse(line_string);
        // return array holds the duplicate flag and first and last name
        // from this line
        // We assume this line is not a duplicate record, and has no
        // first/last name, for now
        var return_array = [false, null, null];
        if (line_counter == 0) {
            return return_array;
        }
        // check whether ssn exists
        // if it does, put that record in a list of possible duplicates
        var line = line_object['data'][0];
        // test whether the line is defined
        if (line) {
            // check for duplicate SSN
            if (ssn_array.indexOf(line[7]) > 0) {
                return_array[0] = true; //also pass first and last name
                return_array[1] = line[2];
                return_array[2] = line[4];
            }
            // if it isn't a dupe, POST the record to the API
            else {
                // get line into correct format for POSTing
                var new_client = {};
                new_client['firstName'] = line[2];
                return_array[1] = new_client['firstName'];
                new_client['middleName'] = line[3];
                new_client['lastName'] = line[4];
                return_array[2] = new_client['lastName'];
                new_client['nameSuffix'] = line[5];
                new_client['nameDataQuality'] = line[6];
                new_client['ssn'] = line[7];
                new_client['ssnDataQuality'] = line[8];
                // Timesaving device: For now, if the date contains "/", assume
                // that the format is mm/dd/yy (Excel format) and convert
                // accordingly.
                if (quickConvertDate(line[9])) {
                    new_client['dob'] = quickConvertDate(line[9]);
                }
                else {
                    // This will likely catch incorrectly formatted
                    // files before they get to later calls to
                    // quickConvertDate().
                    return_array[3] = true;
                    return return_array;
                }
                new_client['dobDataQuality'] = line[10];
                new_client['amIndAKNative'] = line[11];
                new_client['asian'] = line[12];
                new_client['blackAfAmerican'] = line[13];
                new_client['nativeHIOtherPacific'] = line[14];
                new_client['white'] = line[15];
                new_client['raceNone'] = line[16];
                new_client['ethnicity'] = line[17];
                new_client['gender'] = line[18];
                new_client['otherGender'] = line[19];
                new_client['veteranStatus'] = line[20];
                new_client['dateCreated'] = quickConvertDate(line[21]);
                new_client['dateUpdated'] = quickConvertDate(line[22]);
                // do the POST!
                new_client['id_token'] =  getCookie('id_token=');
                $.ajax("/clients/", {
                    method: "POST",
                    data: new_client,
                    always:  console.log("finished post"),
                    error: function (error) {
                        var result = JSON.parse(error.responseText);
                        if (typeof(result) !== 'undefined') {
                            // TBD: see issue #35's comment about making
                            // these API errors more human-friendly
                            var message = result.error.errors[0]['message'];
                            var problem = result.error.errors[0]['problem'];
                            // add message to the results display
                            var failure_line = "Line " + line_counter + " had an import error: " + message + ": " + problem + "<br/>";
                        }
                        else {
                            var failure_line = "Line " + line_counter + " had an import error.<br/>";
                        }
                        $("#results").append(failure_line);
                    },
                    success: function (response) {
                        // give user feedback about success of import
                        var result = JSON.parse(response);
                        var success_line = "Line " + line_counter + " (" + result.data.item.firstName + " " + result.data.item.lastName + ") imported correctly. <br/>";
                        $("#results").append(success_line);
                    }
                });

            }
        }
        return return_array;
    };



    /*
      * Takes a 
    */
    function detectDateFormat(date){
        // Data arrives in standard format, so
        // we know that these are the relevant
        // array elements:
        var dob = line[9];
        var dateCreated = line[21];
        var dateUpdated = line[22];
        // First, change "/" to "-", then attempt to detect format
        // If we can't detect the format, we assume
        // "mdy" because our primary users are in USA
        dob = dob.split("/").join("-");
        var dob_elements = dob.split("-");
        if (dob_elements[1]){
            //test whether any have 4 digits (assume year)
            // test whether any are >12 (assume day)
            dob_elements.forEach(
                
            )
        }
    };

    /* Takes a date string in mm/dd/yyyy or yyyy-mm-dd format and returns
     * it in YYYY-MM-DD format.  This is a quick function that will go
     * away in later commits.
     */
    
function quickConvertDate(date) {
    if (typeof(date) === 'undefined') {
        return false;
    }
    else {
        var date_components = date.split("/");
        var new_date = ""; //date string to be returned
        if (date_components[1]){
            // then we assume this date is in mm/dd/yyyy format
            new_date = date_components[2] + "-" + date_components[0] + "-" + date_components[1];
        }
        else{
            // then we assume this date is already in yyyy-mm-dd format
            new_date = date;
        }
        return new_date;
    }
};

function importFile(evt) {
        var reader = new FileReader();
        var ssn_array = [];
        // get all existing ssn's
        // full set of data retrieved via API
        // TBD: when does this get refreshed?
        var dataset = $("#index").data("full-data");
        for (var client in dataset){
            ssn_array.push(dataset[client]['ssn']);
        }
        var duplicate_lines = "";
        // assigning handler
        reader.onloadend = function(evt) {
            lines = evt.target.result.split(/\r?\n/);
            var line_counter = 0;
            // Possible values are:
            // "ymd" = year month day
            // "dmy" = day month year
            // "mdy" = month day year
            // ""    = inconsistent/undetectable date format
            //
            // Nobody ever uses other formats, so we don't support them
            var detectedDateFormat = null;
            // Goal: send dates to server in "ymd" format like so: YYYY-MM-DD
            // Lines coming in may have other formats
            // First, change "/" to "-", then attempt to detect format
            // If we can't detect the format, we assume
            // "mdy" because our primary users are in USA
            /*                            lines.forEach(function (line_string) {
                                          var line_object = Papa.parse(line_string);
                                          var line = line_object['data'][0];
                                          var dateFormat = detectDateFormat(line);
                                          });*/
            // Now, import the lines with the corrected
            // dates.
            //
            // Next few lines inspired by:
            // http://stackoverflow.com/questions/2641347/how-to-short-circuit-array-foreach-like-calling-break
            var BreakException = {};
            var invalid_format_text = "Sorry, this file looks like it's in the wrong format.";
            try {
                lines.forEach(function (line) {
                    var returned_array = importLine(line, line_counter, ssn_array);
                    if (typeof(returned_array[3]) !== 'undefined') {
                        throw BreakException;
                    }
                    if (returned_array[0] == true){
                        duplicate_lines += "Line " + line_counter + " (" + returned_array[1] + " " + returned_array[2] + ") may be a duplicate. <br>";
                    }
                    line_counter++;
                });
            }
            catch (e) {
                if (e == BreakException) {
                    $("#results").append(invalid_format_text);
                }
            }
            if (duplicate_lines != ""){
                duplicate_lines += "</div>";
                var warning_header = "<div id='duplicate_box'><b>Warning: possible duplicates detected</b><br>";
                var duplicate_warning = warning_header.concat(duplicate_lines);
                $("#results").html(duplicate_warning);
            }
        };

        // getting File instance
        var file = evt.target.files[0];

        // start reading
        if (file) {
            reader.readAsText(file);
        }
        else {
            // send an error
            var error_div = $("<div id='duplicate_box'>" + invalid_format_text + "</div>");
            $("#results").append(error_div);
        }

};
