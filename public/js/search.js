/*
 * Adjust display of page based on search results
*/
function findSearchResults(data, dataLength) {
    $("#duplicate_box").remove();
    var userString = $("#searchForm #searchField").val();
    var minSearchLength = 1;
    if (userString.length >= minSearchLength) {
        //this calls search() inside itself
        var numResults = populateResults(userString, dataLength, data);
        // If "results" is empty, activate the "add new client" button.
        if (numResults > 0) {
            // We've found some results, but we may still have to add a
            // new client (maybe a person with the same name as an
            // existing client). The "add new client" button will be
            // activated, but with a caveat.
            
            caveatText = "None Of The Above -- Add New Client";
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
};

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
    };

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
    };

    function Hit(entity) {
        this.index = entity.personalId;
        this.removeMe = false; // Used when comparing to already-matched records.
        this.picture = entity.picture;
        this.firstName = entity.firstName;
        this.lastName = entity.lastName;
        this.gender = entity.gender;
        this.dob = entity.dob ? getFormattedDOB(entity.dob) : "";
        this.age = entity.dob ? getYearsOld(entity.dob) : "";
    };

    function getFormattedDOB(date) {
        return moment(date).format('DD MMM YYYY');
    };

    function getYearsOld(date) {
        return moment().diff(date, 'years');
    };

    /* Hit factory holds a dictionary of hits (with entity indices as
       keys) that match user input. */
    function HitFactory() {
        this.hits = {};
    };

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
    };

    HitFactory.prototype.killHit = function(entity) {
        if (this.hits.hasOwnProperty(entity.index)) {
            delete this.hits[entity.index];
        }
    };

    HitFactory.prototype.allTheHits = function() {
        var hitList = [];
        for (index in this.hits) {
            hitList.push(this.hits[index]);
        }
        return hitList;
    };

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
        userSubstrings = userString.split(/\s+[^\w]+\s*|\s*[^\w]+\s+|\s+/);

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
                    else {
                        result = null;
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
    };

    function getSummaryDiv(hit) {
        var summaryDiv = $("<div class='hit'></div>");
        if (hit.picture){
            var picture = $("<div class='picture'><img src=\"img/" + hit.picture + "\"></div>");
        }
        var text = $("<div class='text'></div>");
        var fullName = $("<div class='summaryElement'><span>" + hit.firstName + " " + hit.lastName + "</span></div>");
        var clear = $("<div class='clear'></div>");
        var dob = $("<div class='summaryElement'><span class='label'>DOB: </span><span>" + hit.dob + "</span></div>");
        var age = $("<div class='summaryElement'><span class='label'>age: </span><span>" + getYearsOld(hit.dob) + "</span></div>");
        summaryDiv.append(picture);
        text.append(fullName);
        text.append(clear);
        text.append(dob);
        text.append(age);
        summaryDiv.append(text);
        summaryDiv.data("entity-index", hit.index);
        return summaryDiv;
    };


