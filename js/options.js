function gdriveAuth(event) {
	event.preventDefault();
	chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
		console.log(token);
	  // Use the token.
	});
}

function restoreInfo() {
	VK.checkAuth(function(token) {
		console.log('got token ' + token);
		VK.getUser(token, function(resp) {
			var info = resp.response[0];
			document.getElementById("vkName").innerHTML = info.first_name + ' ' + info.last_name;
			document.getElementById("vkPhoto").src = info.photo_200;
		});
	});
}

document.getElementById("chooseGdriveBtn").addEventListener("click", gdriveAuth);

document.addEventListener('DOMContentLoaded', restoreInfo);