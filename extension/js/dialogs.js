function loadAll() {
	chrome.storage.local.get({'status': {}}, function(items) {
		const dialogCountSpan = document.getElementById('dialogCount');
		const dialogCount = items && items.status && items.status.total;
		dialogCountSpan.innerHTML = dialogCount;
	});
}

document.addEventListener('DOMContentLoaded', loadAll);
