function gdriveAuth(event) {
	event.preventDefault();
	chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
		console.log(token);
	  // Use the token.
	});
}

document.getElementById("chooseGdriveBtn").addEventListener("click", gdriveAuth);