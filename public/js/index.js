$(function() {
    $(document).ready(function() {
        // minimum search length needed to start looking for matches.
        var minSearchLength = 1;
        var rightNow = moment();  // Used for calculating ages
        var thisYear = rightNow.format('YYYY');
        var picker = new Pikaday({
            field: $('#datepicker')[0],
            yearRange: [1900, thisYear],
            maxDate: rightNow.toDate(),
            onSelect: assignDOB,
            onOpen: function() {
                // Remove the style showing the previously selected date and
                // move the view to today.
                $(this.el).find(".is-selected").removeClass("is-selected");
                this.gotoToday();
            }
        });

        // event handlers
            $.ajax("/clients", {
                method: "GET",
                dataType: "json"
            }).done(function(data) {
                $("#index").data("full-data", data);
                $("#searchForm #searchField").keyup(function() {
                    var userString = $("#searchForm #searchField").val();
                    if (userString.length >= minSearchLength) {
                        var dataLength = data.length;
                        //this calls search() inside itself
                        var numResults = populateResults(userString, dataLength, data);
                        // If "results" is empty, activate the "add new client" button.
                        if (numResults > 0) {
                            // We've found some results, but we may still have to add a
                            // new client (maybe a person with the same name as an
                            // existing client). The "add new client" button will be
                            // activated, but with a caveat.
                            $("#addNewClient").text(caveatText);
                        }
                        else {
                            // No need for the caveat.
                            $("#addNewClient").text(noCaveatText);
                        }
                        // If we're over the minimum length, we may add a new client.
                        $("#searchForm #addNewClient").prop("disabled", false);
                    }
                    else if (userString.length == 0) {
                        $("#searchForm #results").empty();
                        $("#addNewClient").text(noCaveatText);
                        $("#searchForm #addNewClient").prop("disabled", true);
                    }
                });
                $("#searchForm #results").on("click", ".hit", function(e) {
                    switchToIntake($(e.currentTarget).data("entity-index"), data.length, data);
                });
                $("#searchForm #addNewClient").click(function() {
                    switchToIntake(-1, data.length, data);
                });
                $("#searchForm #exportAll").click(function() {
                    exportAll();
                });
                $("#intakeForm input").keyup(function(e) {
                    checkForChanges(data);
                });
                $("#intakeForm #backToResults").click(function() {
                    switchToSearch(true);
                });
                $("#intakeForm #revertChanges").click(function(e) {
                    revertChanges(data);
                });
                $("#intakeForm #cancel").click(function() {
                    cancel();
                });
                $("#intakeForm #saveChanges").click(function() {
                    saveChanges();
                });
                switchToSearch(false);
            });

        switchToSearch(false);
    });

    // This is the list of all the properties that define an entity.
    var propertyList = ["firstName", "lastName", "ssn", "DOB", "gender", "ethnicity", "race"];
    var propertyListLength = propertyList.length;

    // These are the properties we will try to match to user input.
    var matchingTerms = ["firstName", "lastName"];

    var caveatText = "None Of The Above -- Add New Client";
    var noCaveatText = "Add New Client";
    var revertText = "Revert Changes";
    var backText = "Back to Results";
    var exportAllText = "Example Export -- All Clients and Enrollments";

    /*
     * Takes a user-entered string and returns the number of matching
     * entries.  Along the way it fills in the result divs.
    */
    
    function populateResults(userString, data_length, dataset) {
        var newHits = search(userString, data_length, dataset);
        // Create an array to hold indices of all the latest hits. If an
        // old hit isn't found in here, it gets removed.
        var newHitIndices = [];
        for (var i=0; i<newHits.length; i++) {
            newHitIndices.push(newHits[i].index);
        }
        var oldHits = $("#searchForm #results .hit");
        oldHits.each(function() {
            // Remember these are not objects of class Hit;
            // they're DOM elements (of class "hit").
            var oldHitIndex = $(this).data("entity-index");
            for (var i=newHits.length-1; i>=0; i--) {
                if (oldHitIndex == newHits[i].index) {
                    // There is already a <div> in the results field that
                    // matches the one just returned; replace it with an
                    // updated version (like a longer match string).
                    $(this).empty();
                    $(this).replaceWith(getSummaryDiv(newHits[i]));
                    newHits.splice(i, 1); // remove the match from "newHits"
                }
            }
            // Finally, if the entity of an old hit is no longer
            // represented in new hits, mark it for removal from the
            // results area.
            if ($.inArray(oldHitIndex, newHitIndices) < 0) {
                $(this).addClass("removeMe");
            }
        });
        // Now remove from the "results" div...
        $("#searchForm #results .hit.removeMe").remove();
        // And add all newHits...
        for (var i=0; i<newHits.length; i++) {
            $("#searchForm #results").append(getSummaryDiv(newHits[i]));
        }

        // Return the number of matching entities.
        return $("#searchForm #results > .hit").length;
    }

    function Entity() {
        // Start by setting all values to the empty string.
        for (var i=0; i<propertyListLength; i++) {
            this[propertyList[i]] = "";
        }
        // Set some default values.
        this.personalId = -1;
        this.picture = "unknown.png";
        // Use the names stored in the search form as default vals.
        // Usually they'll be overwritten, but not if this is a new client.
        this.firstName = $("#searchForm #firstName").val();
        this.lastName = $("#searchForm #lastName").val();
    }

    function Hit(entity) {
        this.index = entity.personalId;
        this.removeMe = false; // Used when comparing to already-matched records.
        this.picture = entity.picture;
        this.firstName = entity.firstName;
        this.lastName = entity.lastName;
        this.gender = entity.gender;
        this.dob = entity.dob ? getFormattedDOB(entity.dob) : "";
        this.age = entity.dob ? getYearsOld(entity.dob) : "";
    }

    function getFormattedDOB(date) {
        return moment(date).format('DD MMM YYYY');
    }

    function getYearsOld(date) {
        return moment().diff(date, 'years');
    }

    /* Hit factory holds a dictionary of hits (with entity indices as
       keys) that match user input. */
    function HitFactory() {
        this.hits = {};
    }

    HitFactory.prototype.getHit = function(entity) {
        var hit = null;
        if (this.hits.hasOwnProperty(entity.personalId)) {
            hit = this.hits[entity.personalId];
        }
        else {
            hit = new Hit(entity);
            this.hits[entity.personalId] = hit;
        }
        return hit;
    }

    HitFactory.prototype.killHit = function(entity) {
        if (this.hits.hasOwnProperty(entity.index)) {
            delete this.hits[entity.index];
        }
    }

    HitFactory.prototype.allTheHits = function() {
        var hitList = [];
        for (index in this.hits) {
            hitList.push(this.hits[index]);
        }
        return hitList;
    }

    /*
     * Takes a user-entered string and returns the set of matching
     * clients, as "hit" objects.
     */
    
    function search(userString, data_length, dataset) {
        // First Trim any non-alphanumerics from the ends of the user's input.
        userString = userString.replace(/^[^\w]+/i, "").replace(/[^\w]+$/i, "");

        // Then split the user's string on non-alphanumeric sequences. This
        // eliminates a dot after a middle initial, a comma if name is
        // entered as "Doe, John" (or as "Doe , John"), etc. 
        userSubstrings = userString.split(/[^\w]+/);

        // Store the first and second user substrings into some hidden form
        // fields. They might be used later if a new client is created.
        $("#searchForm #firstName").val(userSubstrings[0]);
        $("#searchForm #lastName").val(userSubstrings.length > 1 ? userSubstrings[1] : "");
        
        // The hit factory will generate new a Hit object or return an
        // already instantiated one with the requested index.
        var hitFactory = new HitFactory();

        var entity = null;
        var result = null;
        var matchLength = 0;
        var hit = null;

        // Turn the user's input into a list of regexes that will try to match against our matching terms.
        var userRegexes = $.map(userSubstrings, function(userSubstring) { return new RegExp("^" + userSubstring, "i"); });
        // This is the list of "matching terms" we will try to match to user input.
        var matchingTerms = ["firstName", "lastName"];
        for (var i=0; i<data_length; i++) {
            entity = dataset[i];
            // Make a copies of "userRegexes" and "matchingTerms" that we can
            // alter as we search.
            var userRegexesCopy = userRegexes.slice(0);
            var matchingTermsCopy = matchingTerms.slice(0);
            while (userRegexesCopy.length > 0) {
                var userRegex = userRegexesCopy.shift();
                var matchFound = false;
                for (var j=0; j < matchingTermsCopy.length; ) {
                    if (entity[matchingTermsCopy[j]] !== null){
                        result = entity[matchingTermsCopy[j]].match(userRegex);
                    }
                    if (result !== null) {
                        // We found a match. Figure out how long it is.
                        matchLength = result[0].length;
                        // If the match is perfect OR if there are no more
                        // user-entered search terms after this one, we may mark it
                        // as a hit.
                        if (matchLength == entity[matchingTermsCopy[j]].length || userRegexesCopy.length == 0) {
                            hit = hitFactory.getHit(entity);
                            hit[matchingTermsCopy[j]] = "<span class='marked'>" + entity[matchingTermsCopy[j]].substr(0, matchLength) + "</span>" + entity[matchingTermsCopy[j]].substr(matchLength);
                            matchFound = true;
                            // Remove this matching term from consideration when
                            // processing other user search terms by splicing it out
                            // of our copy of matching terms.
                            matchingTermsCopy.splice(j, 1);
                            // Since "matchingTermsCopy" is now shorter by 1, continue
                            // the loop without incrementing the counter.
                            continue;
                        }
                    }
                    j++;
                }
                if (matchFound == false) {
                    // If any part of the user-entered search terms failed to find
                    // a match, previous matches don't matter. The entity should
                    // not appear in the list of hits.
                    hitFactory.killHit(entity);
                    break;
                }
            }
            
        }
        return hitFactory.allTheHits();
    }

    function getSummaryDiv(hit) {
        var summaryDiv = $("<div class='hit'></div>");
        if (hit.picture){
            var picture = $("<div class='picture'><img src=\"img/" + hit.picture + "\"></div>");
        }
        var text = $("<div class='text'></div>");
        var fullName = $("<div class='summaryElement'><span>" + hit.firstName + " " + hit.lastName + "</span></div>");
        var clear = $("<div class='clear'></div>");
        var dob = $("<div class='summaryElement'><span class='label'>DOB: </span><span>" + getFormattedDOB(hit.DOB) + "</span></div>");
        var age = $("<div class='summaryElement'><span class='label'>age: </span><span>" + getYearsOld(hit.DOB) + "</span></div>");
        summaryDiv.append(picture);
        text.append(fullName);
        text.append(clear);
        text.append(dob);
        text.append(age);
        summaryDiv.append(text);
        summaryDiv.data("entity-index", hit.index);
        return summaryDiv;
    }

    function switchToSearch(keepResults) {
        if (keepResults == false) {
            $("#searchForm #searchField").val("");
            $("#searchForm #results").empty();
            $("#addNewClient").text(noCaveatText);
            $("#exportAll").text(exportAllText);
            $("#searchForm #addNewClient").prop("disabled", true);
        }
        $("#search").css("display", "block");
        $("#intake").css("display", "none");
    }

    function exportAll() {
        console.log("DEBUG: calling exportAll()");

        /* For now we implement the downloadable-file functionality
         * entirely on the browser side, even though in the long-term
         * doing it in the intermediary node server is probably right.
         *
         * This IRC transcript (edited for clarity) explains why:
         *
         *   <kfogel> So here's the deal: obviously, we want exports to
         *            "download" to the user's local machine, meaning it's
         *            like when a browser visits "http://blahblah/foo.blob"
         *            and gets "Content-type: application/octet-stream" in
         *            the headers -- then a fully portable, browser-native
         *            download windowlet pops up and The Rest Is History.
         *   
         *            Now, I could assemble the file on the browser-client
         *            side and use something like
         *            https://github.com/eligrey/FileSaver.js to simulate
         *            that behavior, but paroneayea points out this is not
         *            the most portable thing.  The most portable thing is to
         *            actually assemble the file "server-side" (by which I
         *            mean, in this case, the intermediary node server) and
         *            have the client get it from that URL.
         *   
         *            So the code I've written on the '14-export-clients'
         *            branch so far, which is all about fetching all the data
         *            (the data needed for the CSV files) all the way to the
         *            browser-client, is then not quite right.  Instead, I
         *            should assemble the file in the intermediate server,
         *            and have a designated route (e.g.,
         *            "/downloads/REST/OF/PATH/LOOKS/LIKE/AN/API/CALL") for
         *            getting those.
         *   
         *            My question is, does the above summary and conclusion
         *            sound right to you?
         *   
         *            (I like the FileSaver.js solution because of
         *            code-wise cleanliness, but if it's not
         *            portability-wise the right thing, I could do the
         *            other way.)
         *   
         *   <slifty> My gut reaction was the same as your first thought
         *            (something like
         *            http://jsfiddle.net/hybrid13i/JXrwM/)
         *   
         *            Do we have a sense of whether that wouldn't be
         *            portable (there are no libraries, it's just a
         *            straight up data:text/csv uri)?
         *   
         *   <kfogel> So the comment in the code in that fiddle, down
         *            near the end where it does the actual download
         *            provisioning, even says it's questionable
         *            portability.
         *   
         *            My instinct is, *if* doing it fully browser-side,
         *            then using a library like FileSaver.js is the way
         *            to go.  Because whatever portability issues there
         *            are, he's already doing his best to solve them for
         *            us
         *   
         *   <slifty> Right.  One reason I like the server side solution
         *            is that it can be used in other contexts.  maybe
         *            we want an application that generates a nightly
         *            report, for instance.
         *   
         *            So that's two benefits of server side -- I think
         *            the complexity can be encapsulated nicely so
         *            overall it's elegant (maybe it is a service that
         *            takes JSON objects rather than retrieving them)
         *            (and spits back a file path)
         *   
         *   <kfogel> Good point, although likely that nightly process
         *            would be running on some different server anyway.
         *            I mean, the fact that we have a "server"
         *            intermediary here is just an accident of
         *            implementation and browser security policy.
         *            *However*, the fact that server can provide URLs
         *            like "/download/FOO" is interesting, I see what
         *            you mean.
         *   
         *   <slifty> Sure, my point is more that there is no reason
         *            that report generation app and client app are the
         *            same they could be different apps some day!
         *   
         *   <kfogel> Agreed.  they probably will be
         *   
         *   <slifty> Point being, client side csv generation is only
         *            useful for this demo really
         *   
         *   <kfogel> I'm only putting the functionality into our client
         *            intake demo because that's the hat rack we have to
         *            hang hats on right now
         *   
         *   <slifty> Server side csv generation is going to be useful
         *            in more places
         *   
         *   <kfogel> So I think that makes sense, thanks.
         *   
         *   <slifty> (That said, you could start with client side since
         *            the logic will be similar... and that will be
         *            super fast to implement)
         *   
         *   <kfogel> hmrmrm, true.  Might do that.  Anyway, I
         *            understand the big picture now
         *
         * In addition to the above reasons to do it on the
         * intermediary-server-side, there's also the fact that
         * assembling a big downloadable in memory is not wise.  Much
         * better to assemble a file on disk on the server and then
         * server it to the client.
         */  

        // Export all clients.
        console.log("DEBUG: exporting clients");
        $.ajax("/clients", {
            method: "GET",
            dataType: "json"
        }).done(function(clients) {
            console.log("DEBUG: fetched clients for export: " + JSON.stringify(clients));
            var num_clients = clients.length;
            console.log("       num clients: " + num_clients);
            for (var i = 0; i < num_clients; i++) {
                console.log("       client: " + JSON.stringify(clients[i]));
            };
            // Create a downloadable for clients.  Note it's still
            // JSON, not CSV, and the JSON is still pretty opaque --
            // it's just "[object Object]" over and over.  We'll
            // unpack it when we're really creating CSV, of course.

            // UDE columns to export to CSV (in progress):
            //
            //   3.13 PersonalID (3.13.1)
            //   3.1 Name
            //       3.1.1 First Name (null ok)
            //       3.1.2 Middle Name (null ok)
            //       3.1.3 Last Name (null ok)
            //       3.1.4 Name Suffix (null ok)
            //   3.2 Social Security Number (null ok) (string, double-quotes padded w/ leading zeros)
            //   3.3 Date of Birth (null ok)
            //   3.4 Race
            //       3.4.1 AmIndAKNative (1 = American Indian or Alaska Native)
            //       3.4.1 Asian (1 = Asian)
            //       3.4.1 BlackAfAmerican (1 = Black or African American)
            //       3.4.1 NativeHIOtherPacific (1 = Native Hawaiian or Other Pacific Islander)
            //       3.4.1 White (1 = White)
            //       3.4.1 RaceNone (null ok) (Non-null only if all other Race fields = 0 or 99)
            //   3.5 Ethnicity (3.5.1)
            //   3.6 Gender
            //       3.6.1 Gender
            //       3.6.A OtherGender (null ok)
            //   3.7 Veteran Status (Export 99 (Data not collected)
            //                      for all clients, including minors, for whom there is
            //                      no Veteran Status data.
            //   4.41 Veteran Information
            
            var clients_downloadable = new Blob(clients, {type: "text/plain;charset=utf-8"});
            // We use the HUD 2014 standard name for this file,
            // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
            // Pages 17(bottom)-19
            //
            // NOTE: For some reason, this saveAs() can blank your
            // console log in the Firefox Inspect Element window.  If
            // you comment out the saveAs(), you'll see all the
            // preceding console.log() output again.
            saveAs(clients_downloadable, "Client.csv"); 
        });
        console.log("DEBUG: done exporting clients");

        // Export all enrollments.
        console.log("DEBUG: exporting enrollments");
        $.ajax("/enrollments", {
            method: "GET",
            dataType: "json"
        }).done(function(enrollments) {
            console.log("DEBUG: fetched enrollments for export: " + JSON.stringify(enrollments));
            var num_enrollments = enrollments.length;
            console.log("       num enrollments: " + num_enrollments);
            for (var i = 0; i < num_enrollments; i++) {
                console.log("       enrollment: " + JSON.stringify(enrollments[i]));
            };
            // Create a downloadable for enrollments.  Note it's still
            // JSON, not CSV, and the JSON is still pretty opaque --
            // it's just "[object Object]" over and over.  We'll
            // unpack it when we're really creating CSV, of course.
            var enrollments_downloadable = new Blob(enrollments, {type: "text/plain;charset=utf-8"});
            // We use the HUD 2014 standard name for this file,
            // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
            // Pages 19(bottom)-23(top)
            //
            // NOTE: For some reason, this saveAs() can blank your
            // console log in the Firefox Inspect Element window.  If
            // you comment out the saveAs(), you'll see all the
            // preceding console.log() output again.
            saveAs(enrollments_downloadable, "Enrollment.csv"); 
        });
        console.log("DEBUG: done exporting enrollments");
    }

    function switchToIntake(personalId, data_length, dataset) {
        // Reset all form fields.
        $("#intakeForm input[type='input']").val("");
        $("#intakeForm select option:first-of-type").prop("selected", true);
        $("#intakeForm #pictureFrame").empty();

        var entity = null;
        if (personalId < 0) { // New client
            entity = new Entity();
        }
        else {
            for (var i=0; i < data_length; i++) {
                if (dataset[i]["personalId"] == personalId) {
                    entity = dataset[i];
                }
            }
        }
        
        // Put the entity index into a hidden field. This gets used later by
        // various handlers.
        $("#intakeForm #entityIndex").val(entity.personalId);
        

        // Fill in input fields
        for (prop in entity) {
            if (entity[prop] !== null) {
                elem = $("#intakeForm #"+prop);
                if (elem !== null) {
                    if (elem.is("input")) {
                        if (elem.attr("type") == "checkbox" && entity[prop] == true) {
                            elem.prop("checked", true);
                        }
                        else {
                            elem.val(entity[prop]);
                        }
                    }
                    else if (elem.is("select")) {
                        elem.children("option").each(function() {
                            if ($(this).val() == entity[prop]) {
                                $(this).attr("selected", true);
                            }
                        });
                    }
                }
            }
        }

        // Fill in the picture
        if (entity.picture){
            $("#intakeForm #pictureFrame").append($("<img src=\"img/" + entity.picture + "\">"));
        }
        // Fill in the readonly DOB and age
        refreshFormattedDOB();
        if (personalId < 0) {
            $("#intakeForm #backToResults").css("display", "none");
            $("#intakeForm #revertChanges").css("display", "none");
            $("#intakeForm #cancel").css("display", "inline-block");
            $("#intakeForm #saveChanges").prop("disabled", false);
        }
        else {
            $("#intakeForm #backToResults").css("display", "inline-block");
            $("#intakeForm #revertChanges").css("display", "none");
            $("#intakeForm #cancel").css("display", "none");
            $("#intakeForm #saveChanges").prop("disabled", true);
        }

        $("#search").css("display", "none");
        $("#intake").css("display", "block");
    }

    function assignDOB() {
        var dataset = $("#index").data("full-data");
        var entityIndex = $("#intakeForm #entityIndex").val();
        // "this" refers to the pikaday object
        var DOB = this.getMoment().format('YYYY-MM-DD');
        // Put the DOB in the ISO 8601 format into the hidden DOB
        // field. This is what corresponds to DOB in the client
        // database. What the user sees on the screen is formatted for
        // user-friendliness and is set up in "refreshFormattedDOB".
        $("#intakeForm #DOB").val(DOB);
        refreshFormattedDOB();
        checkForChanges(dataset);
    }

    function refreshFormattedDOB() {
        var DOB = $("#intakeForm #DOB").val();
        if (DOB && DOB.length > 0) {
            $("#intakeForm #formattedDOB").html(getFormattedDOB(DOB) + "&nbsp;&nbsp(age "+ getYearsOld(DOB) + ")");
            $("#dob_value").val(DOB);
        }
        else {
            $("#intakeForm #formattedDOB").html("&nbsp;");
        }
    }

    function getEntityFromInputValues() {
        var entity = {};
        var entityIndex = $("#intakeForm #entityIndex").val();
        entity.personalId = entityIndex;
        entity.firstName = $("#intakeForm #firstName").val();
        entity.lastName = $("#intakeForm #lastName").val();
        entity.ssn = $("#intakeForm #ssn").val();
        entity.dob = $("#intakeForm #DOB").val();
        entity.gender = $("#intakeForm #gender").val();
        entity.ethnicity = $("#intakeForm #ethnicity").val();
        return entity;    
    }

    function saveChanges() {
        var entityIndex = $("#intakeForm #entityIndex").val();
        // set race.  By default all are false, except "raceNone."
        var client = {};
        client['amIndAKNative'] = 0;
        client['asian'] = 0;
        client['blackAfAmerican'] = 0;
        client['nativeHIOtherPacific'] = 0;
        client['white'] = 0;
        client['raceNone'] = 1;
        if ($("#asian").is(":checked") == true){
            client['asian'] = 1;
            client['raceNone'] = 0;
        }
        if ($("#blackAfAmerican").is(":checked") == true){
            client['blackAfAmerican'] = 1;
            client['raceNone'] = 0;
        }
        if ($("#amIndAKNative").is(":checked") == true){
            client['amIndAKNative'] = 1;
            client['raceNone'] = 0;
        }
        if ($("#white").is(":checked") == true){
            client['white'] = 1;
            client['raceNone'] = 0;
        }
        if ($("#nativeHIOtherPacific").is(":checked") == true){
            client['nativeHIOtherPacific'] = 1;
            client['raceNone'] = 0;
        }
        client['personalId'] = entityIndex;
        client['firstName'] = $("#intakeForm #firstName").val();
        client['lastName'] = $("#intakeForm #lastName").val();
        client['dob'] = $("#dob_value").val();
        client['gender'] = $("#intakeForm #gender").val();
        client['ethnicity'] = $("#intakeForm #ethnicity").val();
        client['ssn'] = $("#intakeForm #ssn").val();
        if (entityIndex != ""){
            $.ajax("/clients/" + entityIndex, {
                method: "PUT",
                data: client,
                always:  console.log("finished put")
            });
        }
        else{
            $.ajax("/clients/", {
                method: "POST",
                data: client,
                always:  console.log("finished post")
            });
        }
        switchToSearch(false);
    }

    function checkForChanges(dataset) {
        var index = $("#intakeForm #entityIndex").val();
        var origEntity = new Entity();
        dataset.forEach( function (client){
            if (client["personalId"] == index){
                origEntity = client;
            }
        });
        var newEntity = getEntityFromInputValues();
        for (prop in newEntity) {
            if ((origEntity[prop] == null && newEntity[prop] != null) || newEntity[prop].toString() !== origEntity[prop].toString()) {
                // The user has made a change
                if (index >= 0) { //  i.e., if this is not a new client
                    $("#intakeForm #backToResults").css("display", "none");
                    $("#intakeForm #revertChanges").css("display", "inline-block");
                }
                $("#intakeForm #saveChanges").prop("disabled", false);
                return;
            }
        }
        if (index >= 0) {  // again, if this is not a new client
            $("#intakeForm #backToResults").css("display", "inline-block");
            $("#intakeForm #revertChanges").css("display", "none");
        }
        $("#intakeForm #saveChanges").prop("disabled", true);
    }

    function cancel() {
        if (confirm("The new client will not be entered into the database. Are you sure?")) {
            switchToSearch(false);
        }
    }

    function revertChanges(dataset) {
        var index = $("#intakeForm #entityIndex").val();
        var newEntity = getEntityFromInputValues();
        var origEntity = new Entity();
        dataset.forEach( function (client){
            if (client["personalId"] == index){
                origEntity = client;
            }
        });
        for (prop in newEntity) {
            $("#intakeForm #" + prop).val(origEntity[prop]);
        }
        refreshFormattedDOB();
        $("#intakeForm #backToResults").css("display", "inline-block");
        $("#intakeForm #revertChanges").css("display", "none");
        $("#intakeForm #cancel").css("display", "none");
        $("#intakeForm #saveChanges").prop("disabled", true);
    }

});
