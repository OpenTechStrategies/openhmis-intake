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
                $("#intakeForm input").keyup(function(e) {
                    checkForChanges($(e.currentTarget).data("entity-index"), data);
                });
                $("#intakeForm #backToResults").click(function() {
                    switchToSearch(true);
                });
                $("#intakeForm #revertChanges").click(function(e) {
                    revertChanges($(e.currentTarget).data("entity-index"), data);
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
    var propertyList = ["index", "picture", "firstName", "lastName", "SSN", "DOB", "gender", "ethnicity", "race"];
    var propertyListLength = propertyList.length;

    // These are the properties we will try to match to user input.
    var matchingTerms = ["firstName", "lastName"];

    var caveatText = "None Of The Above -- Add New Client";
    var noCaveatText = "Add New Client";
    var revertText = "Revert Changes";
    var backText = "Back to Results";

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
        this.index = -1;
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
        var picture = $("<div class='picture'><img src=\"img/" + hit.picture + "\"></div>");
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
            $("#searchForm #addNewClient").prop("disabled", true);
        }
        $("#search").css("display", "block");
        $("#intake").css("display", "none");
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
        $("#intakeForm #pictureFrame").append($("<img src=\"img/" + entity.picture + "\">"));

        // Fill in the readonly DOB and age
        refreshFormattedDOB();

        if (index < 0) {
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
        var entityIndex = $("#intakeForm #entityIndex").val();
        // "this" refers to the pikaday object
        var DOB = this.getMoment().format('YYYY-MM-DD');
        // Put the DOB in the ISO 8601 format into the hidden DOB
        // field. This is what corresponds to DOB in the client
        // database. What the user sees on the screen is formatted for
        // user-friendliness and is set up in "refreshFormattedDOB".
        $("#intakeForm #DOB").val(DOB);
        refreshFormattedDOB();
        checkForChanges(entityIndex);
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
        for (var i=0; i<propertyListLength; i++) {
            entity[propertyList[i]] = $("#intakeForm #" + propertyList[i]).val();
        }
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
        client['ssn'] = $("#intakeForm #SSN").val();
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
    }

    function checkForChanges(index, dataset) {
        var index = $("#intakeForm #index").val();
        dataset.forEach( function (client){
            if (client["personalId"] == index){
                var origEntity = client;
            }
        });
        var origEntity = index < 0 ? new Entity() : dataset[index];
        var newEntity = getEntityFromInputValues();

        for (prop in newEntity) {
            if (newEntity[prop].toString() !== origEntity[prop].toString()) {
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

    function revertChanges() {
        var newEntity = getEntityFromInputValues();
        var origEntity = sampleData[newEntity.index];
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
