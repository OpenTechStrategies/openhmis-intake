$(function() {
    $('#signinButton').text('Click to log in');
    start();
    $('#signinButton').click(function() {
        auth2.grantOfflineAccess({'redirect_uri': 'postmessage'}).then(signInCallback);
    });
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
             var id_token_var = result_obj.id_token;
             $("#id_token").val(id_token_var);
             // TODO: may need to reload the page here
          },
          error: function(error) {
              console.log("An error occurred: " + error.responseText);
          }
          });
      } else {
          console.log("Sorry, there was an error generating your id token.");
      }
};


