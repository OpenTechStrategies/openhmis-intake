$(function() {
    // on page load, either show the log in button or the search page,
    // depending on whether a token cookie is set
    id_token = getCookie('id_token=');
    if (id_token) {
        switchToSearch(false);
    }
    else {
        switchToLogin(false);
    }
});

function switchToSearch(keepResults) {
    // display buttons
    noCaveatText = "Add New Client";
    exportAllText = "Example Export -- All Clients (UDE)";
    importAllText = "Example Import";
    $("#addNewClient").text(noCaveatText);
    $("#exportAll").text(exportAllText);
    $("#importAll").text(importAllText);
    $("#logoutButton").css('display', '');
    $("#logoutButton").text('Log out');
    if (! keepResults) {
        $("#searchForm #addNewClient").prop("disabled", true);
        if (getCookie('user_name=')) {
            $("#loginInfo").append("<br/>" + getCookie('user_name=') + "<br/>" + getCookie('user_org=') + "<br/>CoC: " + getCookie('user_coc='));
        }
    }
    

    // if we aren't getting here by hitting "back to results" from a
    // client page, empty the form and reload the data.  If we are, we
    // should keep the results and data as they were.
    if (keepResults == false) {
        $("#searchForm #searchField").val("");
        $("#searchForm #results").empty();
        // reload the data
        id_token = getCookie('id_token=');
        loadClientData(id_token);
    }
    var client_list = $("#index").data("full-data");
    if (typeof(client_list) !== 'undefined') {
        $("#searchForm #results").on("click", ".hit", function(e) {
            switchToIntake($(e.currentTarget).data("entity-index"), client_list.length, client_list);
        });
        $("#searchForm #searchField").keyup( function() { findSearchResults(client_list, client_list.length); } );

    }
    // make the buttons do something
    $("#searchForm #addNewClient").click(function() {
        switchToIntake(-1, null, null);
    });
    
    $("#searchForm #exportAll").click(function() {
        $("#results").html('...processing export <br/>');
        exportAll();
    });
    $("#importAll").click(function() {
        $("#results").html('...processing import <br/>');
        $("#import_file").trigger('click');
        $('#import_file').change( function(evt) {
            importFile(evt);
        });
    });

    $("#logoutButton").click( function() {
        logoutUser();
    });

    // display the search box, hide everything else
    $("#search").css("display", "block");
    $("#intake").css("display", "none");
    $("#login").css("display", "none");
    $("#warning").css("display", "none");
    
};

/*
 * Get all clients from the database and store the JSON blob...in a
 * cookie?
*/
function loadClientData(token) {
    token_obj = {'id_token': token};
    $.ajax("/clients", {
        method: "GET",
        dataType: "json",
        data: token_obj
    }).done(function(result_data) {
        if (typeof(result_data.error) !== 'undefined') {
            switchToLogin(true, result_data.error);
        }
        // only if we have data, show results:
        if (typeof(result_data.data) !== 'undefined') {
            var data = result_data.data.items;
            $("#index").data("full-data", data);
            // make instant search work
            $("#searchForm #results").on("click", ".hit", function(e) {
                switchToIntake($(e.currentTarget).data("entity-index"), data.length, data);
            });
            $("#searchForm #searchField").keyup( function() { findSearchResults(data, data.length); } );
        }
        else {
            // show an error?
            console.log("DEBUG: Data is missing; this is probably an error.");
        }
    });
};


/*
 * Contains utility functions for HMIS demo client app.
*/

function setInitialVars() {
    // Set all these as global variables so they can be used in other
    // functions.
    id_token = getCookie('id_token=');
    // minimum search length needed to start looking for matches.
    rightNow = moment();  // Used for calculating ages
    thisYear = rightNow.format('YYYY');
    picker = new Pikaday({
        field: $('#datepicker')[0],
        yearRange: [1900, thisYear],
        maxDate: rightNow.toDate(),
        onSelect: assignDOB,
        onOpen: function() {
            var set_dob = $("#intakeForm #dob").val();
            // Remove the style showing the previously selected date
            $(this.el).find(".is-selected").removeClass("is-selected");
            // If no dob specified, move the view to today.
            if (set_dob == ""){
                this.gotoToday();
            }
            else{
                // Else, go to selected DOB
                this.setDate(set_dob);
            }
        }
    });
    // This is the list of all the properties that define a client
    // (later called an "Entity").  These properties have names that
    // match exactly to the API fields, though do not cover all the
    // API fields.
    // Should this include personalId?
    propertyList = ["firstName", "lastName", "ssn", "dob",
                        "gender", "ethnicity", "amIndAKNative",
                        "asian","blackAfAmerican",
                        "nativeHIOtherPacific","white"];
    propertyListLength = propertyList.length;

    // These are the properties we will try to match to user input.
    matchingTerms = ["firstName", "lastName"];
};


function enableEdit(data) {
    setInitialVars();
    
    $("#intakeForm input").keyup(function(e) {
        checkForChanges(data);
    });
    $("#intakeForm select").on("change", function(e) {
        checkForChanges(data);
    });
    $("#intakeForm input:checkbox").on("change", function(e) {
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
    $("#intakeForm #missing").on("change", function() {
        manageCheckboxes('missing');
    });
    $("#intakeForm #unknown").on("change", function() {
        manageCheckboxes('unknown');
    });
    $("#intakeForm #refused").on("change", function() {
        manageCheckboxes('refused');
    });
};


    function manageCheckboxes(checkbox_id){
        //if checked
        var elem = $("#intakeForm #" + checkbox_id);
        if ( elem.prop("checked") == true) {
            $(".race").not(elem).prop("checked", false);
            $(".race").not(elem).prop("disabled", true);
        }
        //if unchecked, re-enable
        else {
            $(".race").prop("disabled", false);
        }
    };
                    



    function switchToIntake(personalId, data_length, dataset) {
        // Reset all form fields.
        $("#intakeForm input[type='input']").val("");
        // It's not clear whether this line is doing anything
        $("#intakeForm select option:first-of-type").prop("selected", true);
        $("#intakeForm input[type='checkbox']").prop("checked", false);
        $("#intakeForm input[type='checkbox']").prop("disabled", false);        
        $("#intakeForm #pictureFrame").empty();
        $("#showError").css('display', 'none');

        // enable/disable buttons
        enableEdit(dataset);
        
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
                                $(this).prop("selected", true);
                            }
                            else{
                                $(this).prop("selected", false);
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
    };

    function assignDOB() {
        var dataset = $("#index").data("full-data");
        var entityIndex = $("#intakeForm #entityIndex").val();
        // "this" refers to the pikaday object
        var DOB = this.getMoment().format('YYYY-MM-DD');
        // Put the DOB in the ISO 8601 format into the hidden DOB
        // field. This is what corresponds to DOB in the client
        // database. What the user sees on the screen is formatted for
        // user-friendliness and is set up in "refreshFormattedDOB".
        $("#intakeForm #dob").val(DOB);
        refreshFormattedDOB();
        checkForChanges(dataset);
    };

    function refreshFormattedDOB() {
        var DOB = $("#intakeForm #dob").val();
        if (DOB && DOB.length > 0) {
            $("#intakeForm #formattedDOB").html(getFormattedDOB(DOB) + "&nbsp;&nbsp(age "+ getYearsOld(DOB) + ")");
            $("#dob").val(DOB);
        }
        else {
            $("#intakeForm #formattedDOB").html("&nbsp;");
        }
    };

    function getEntityFromInputValues() {
        var entity = {};
        var entityIndex = $("#intakeForm #entityIndex").val();
        entity.personalId = entityIndex;
        for (var i=0; i<propertyListLength; i++) {
            entity[propertyList[i]] = $("#intakeForm #" + propertyList[i]).val();
        }
        return entity;    
    };

function saveChanges() {
        var entityIndex = $("#intakeForm #entityIndex").val();
        // set race.  By default all are false, except "raceNone."
        var client = {};
        client['amIndAKNative'] = 0;
        client['asian'] = 0;
        client['blackAfAmerican'] = 0;
        client['nativeHIOtherPacific'] = 0;
        client['white'] = 0;
        // TODO: handle the different options for 'raceNone' correctly
        client['raceNone'] = 9;
        if ($("#asian").is(":checked") == true){
            client['asian'] = 1;
            client['raceNone'] = null;
        }
        if ($("#blackAfAmerican").is(":checked") == true){
            client['blackAfAmerican'] = 1;
            client['raceNone'] = null;
        }
        if ($("#amIndAKNative").is(":checked") == true){
            client['amIndAKNative'] = 1;
            client['raceNone'] = null;
        }
        if ($("#white").is(":checked") == true){
            client['white'] = 1;
            client['raceNone'] = null;
        }
        if ($("#nativeHIOtherPacific").is(":checked") == true){
            client['nativeHIOtherPacific'] = 1;
            client['raceNone'] = null;
        }
        client['personalId'] = "";
        if (entityIndex > 0){
            client['personalId'] = entityIndex;
        }
        client['firstName'] = $("#intakeForm #firstName").val();
        client['lastName'] = $("#intakeForm #lastName").val();
        client['dob'] = $("#dob").val();
        client['gender'] = $("#intakeForm #gender").val();
        client['ethnicity'] = $("#intakeForm #ethnicity").val();
        client['ssn'] = $("#intakeForm #ssn").val();
        client['id_token'] = getCookie('id_token=');
        if (entityIndex > 0 ){
            $.ajax("/clients/" + entityIndex, {
                method: "PUT",
                data: client,
                error: function(error) {
                    manageErrors(error);
                },
                success: function (response) {
                    manageErrors(response);
                },
                always:  console.log("finished put")
            }); 
        }
        else{
            $.ajax("/clients/", {
                method: "POST",
                data: client,
                always:  console.log("finished post"),
                success: function (response) {
                    console.log("DEBUG: successful POST");
                    manageErrors(response);
                },
                error: function (error) {
                    console.log("DEBUG: there was an error");
                    manageErrors(error);
                }
            });
        }
    };

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
    };

    function cancel() {
        if (confirm("The new client will not be entered into the database. Are you sure?")) {
            switchToSearch(false);
        }
    };

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
            if ($("#intakeForm #" + prop).attr("type") == "checkbox") {
                if (origEntity[prop] == true) {
                    $("#intakeForm #" + prop).prop("checked", true);
                }
                else {
                    $("#intakeForm #" + prop).prop("checked", false);
                }
            }
            else {
                $("#intakeForm #" + prop).val(origEntity[prop]);
            }
        }
        refreshFormattedDOB();
        $("#intakeForm #backToResults").css("display", "inline-block");
        $("#intakeForm #revertChanges").css("display", "none");
        $("#intakeForm #cancel").css("display", "none");
        $("#intakeForm #saveChanges").prop("disabled", true);
    };

function manageErrors(response) {
    if (typeof(response.responseText) !== 'undefined') {
        var result = JSON.parse(response.responseText);
    }
    else {
        var result = JSON.parse(response);
    }
    if (result.error){
        // show error to user
        // make this more human-readable.
        var message = result.error.errors[0]['message'];
        var problem = result.error.errors[0]['problem'];
        if (result.error.code == 'INVALID_PARAMETER') {
            if (problem) {
                message = "Sorry, one of the values you entered was invalid.  The server says: " + problem;
            }
            else {
                message = "Sorry, one of the values you entered was invalid.";
            }
        }
        else if (result.error.code == 'ACCESS_DENIED') {
            message = "Sorry, you don't have permission to make this change.";
        }
        else if (result.error.code == 'MISSING_PARAMETER') {
            message = "Sorry, you're missing a required value.  Did you add the SSN?";
        }
        $("#showError").css('display', 'block');
        $("#showError").text(message);
    }
    else {
        $("#dob").removeAttr("value");
        location.reload();
        switchToSearch(false);
    }
};
