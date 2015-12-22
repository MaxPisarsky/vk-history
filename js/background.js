var pollInterval = 1000 * 60;

function pollHistory() {
	window.setTimeout(pollHistory, pollInterval);
}



pollHistory();