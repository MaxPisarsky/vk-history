var pollInterval = 1000 * 60;

function pollHistory() {
	VK.checkAuth(function(token) {
		VK.getDialogs(token, 0, 200, function(resp){
			console.log(resp);
		});
	});
	window.setTimeout(pollHistory, pollInterval);
}

pollHistory();