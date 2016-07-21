$(function() {
    $('#signinButton').text('Click to log in');
    start();
    $('#signinButton').click(function() {
        auth2.grantOfflineAccess({'redirect_uri': 'postmessage'}).then(signInCallback);
    });
    setInitialVars();
    if ($("#id_token").val()) {
        switchToSearch(false);
    }

});

function start() {
    gapi.load('auth2', function() {

	var clientId = $.get("/client_id/", function(data) {
	    auth2 = gapi.auth2.init({
		client_id: data,
	    });
        });
    });
};

function signInCallback(authResult) {
    if (authResult['code']) {
        var auth_info = {};
        auth_info['code'] = authResult['code'];
        $.ajax({
            type: 'POST',
            url: '/authenticate/',
            data: auth_info,
            success: function(result) {
                var result_obj = JSON.parse(result);
                id_token_var = result_obj.id_token;
                $("#id_token").val(id_token_var);
                if (id_token_var) {
                    getClients(id_token_var);
                    switchToSearch();
                }
                else {
                    switchToWarning();
                }
            },
            error: function(error) {
                console.log("An error occurred: " + error.responseText);
            }
        });
    }
    else {
        console.log("Sorry, there was an error generating your id token.");
    }
};


function switchToSearch(keepResults) {
    if (keepResults == false) {
        $("#searchForm #searchField").val("");
        $("#searchForm #results").empty();
        $("#addNewClient").text(noCaveatText);
        $("#exportAll").text(exportAllText);
        $("#importAll").text(importAllText);
        $("#searchForm #addNewClient").prop("disabled", true);
    }
    $("#search").css("display", "block");
    $("#intake").css("display", "none");
    $("#login").css("display", "none");
    $("#warning").css("display", "none");
};

function switchToLogin(msg) {
    var warningMessage = "Sorry, you are not authorized to access this content.  Please refresh and try logging in again.";
    $("#search").css("display", "none");
    $("#intake").css("display", "none");
    $("#login").css("display", "block");
    $("#warning").css("display", "none");
    if (msg) {
        $("#warningtext").text(warningMessage);
    }
    else {
        $("#warningtext").text("");
    }
};



