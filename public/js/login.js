$(function() {
    $('#signinButton').text('Click to log in');
    start();
    $('#signinButton').click(function() {
        auth2.grantOfflineAccess({'redirect_uri': 'postmessage'}).then(signInCallback);
    });
    setInitialVars();

    id_token = getCookie('id_token=');
    if (id_token) {
        getClients(id_token);
        switchToSearch(false);
        if (! getCookie('user_name=')) {
            getLoginInfo(id_token);
        }
    }
    else {
        switchToLogin(false);
    }
    if (getCookie('user_name=')) {
        $("#loginInfo").html(getCookie('user_name=') + "<br/>" + getCookie('user_org=') + "<br/>" + getCookie('user_coc='));
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
                document.cookie = "id_token=" + id_token_var;
                if (id_token_var) {
                    getClients(id_token_var);
                    // fill in account that was used to log in
                    // and store info to a cookie
                    getLoginInfo(id_token_var);
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

/*
 * Takes the id token (received from Google) and displays the
 * human-readable id associated with it (usually a Google email
 * address).
*/
function getLoginInfo(token) {
    var token_wrapper = {"token": token};
    var account_error_text = "Sorry, there was an error finding your account.";
    $.ajax({
        type: 'POST',
        url: '/identify/',
        data: token_wrapper
    }).done (function (response) {
        var result = JSON.parse(response);
        if (typeof(result.data) !== 'undefined') {
            var account = result.data.item;
            if (account.user != null) {
                console.log(account.user);
                document.cookie = "user_name=" + account.user.externalId;
                document.cookie = "user_org=" + account.user.organization;
                document.cookie = "user_coc=" + account.user.coC;
                $("#loginInfo").html(getCookie('user_name=') + "<br/>" + getCookie('user_org=') + "<br/>CoC: " + getCookie('user_coc='));
            }
            else {
                document.cookie = "user_name=" + account.externalId;
                // unset other cookies
                document.cookie = "user_org=" + "";
                document.cookie = "user_coc=" + "";
                $("#loginInfo").html(getCookie('user_name='));
            }
        }
        else {
            // show an error
            console.log(result.error);
            $("#loginInfo").html(account_error_text);
        }

    });
}

function switchToLogin(msg) {
    var warningMessage = "Sorry, you are not authorized to access this content.  Please log in again.";
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

// check for cookie (inspired by
// http://www.w3schools.com/js/js_cookies.asp)
function getCookie(cookie_name) {
    var cookie_array = document.cookie.split('; ');
    var id_token = null;
    for (var i=0; i < cookie_array.length; i++) {
        var cookie = cookie_array[i];
        if (cookie.indexOf(cookie_name) == 0) {
            id_token = cookie.substring(cookie_name.length, cookie.length);
        }
    }
    return id_token;
}
