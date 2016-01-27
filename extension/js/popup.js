'use strict';

function checkOptions() {
	chrome.storage.sync.get({'vkaccess_token': {}}, function(items) {
		const isVKTokenPresent = items.vkaccess_token.length !== undefined;
		chrome.storage.sync.get({'storage': {}}, function(items) {
			const isStoragePresent = items.storage.length !== undefined;
			if (!isVKTokenPresent || !isStoragePresent) {
				showOptionsBlock();
			} else {
				showStatusBlock();
			}
		});
	});
}

function openOptions() {
	var optionsUrl = chrome.extension.getURL('options.html');
	chrome.tabs.query({url: optionsUrl}, function(tabs) {
		if (tabs.length) {
			chrome.tabs.update(tabs[0].id, {active: true});
		} else {
			chrome.tabs.create({url: optionsUrl});
		}
	});
}

function showOptionsBlock() {
	document.getElementById('optionsBlock').style.display = 'block';
}

function drawSyncStatus(items) {
	const statusBlock = document.getElementById('status');
	const progressBar = document.getElementById('progress');

	const totalDialogs = items.status.total || progressBar.getAttribute('aria-valuemax');
	const currentDialogs = items.status.current || progressBar.getAttribute('aria-valuenow');

	statusBlock.innerHTML = 'синхронизация';
	statusBlock.className = 'label label-info';

	progressBar.className = 'progress-bar progress-bar-info progress-bar-striped active';
	progressBar.setAttribute('aria-valuenow', currentDialogs);
	progressBar.setAttribute('aria-valuemax', totalDialogs);
	progressBar.style.width = totalDialogs === 0 ? 0 : (Math.round(currentDialogs * 100 / totalDialogs) + '%');
	progressBar.innerHTML = currentDialogs + '/' + totalDialogs;
}

function drawDoneStatus(items) {
	const statusBlock = document.getElementById('status');
	const progressBar = document.getElementById('progress');

	const totalDialogs = items.status.total || progressBar.getAttribute('aria-valuemax');
	const currentDialogs = items.status.current || progressBar.getAttribute('aria-valuenow');

	statusBlock.innerHTML = 'завершено';
	statusBlock.className = 'label label-success';

	progressBar.className = 'progress-bar progress-bar-success';
	progressBar.setAttribute('aria-valuenow', currentDialogs);
	progressBar.setAttribute('aria-valuemax', totalDialogs);
	progressBar.style.width = totalDialogs === 0 ? 0 : (Math.round(currentDialogs * 100 / totalDialogs) + '%');
	progressBar.innerHTML = currentDialogs + '/' + totalDialogs;
}

function showStatusBlock() {
	document.getElementById('statusBlock').style.display = 'block';
	chrome.storage.local.get({'status': {}}, function(items) {
		const status = items.status.text !== undefined ? items.status.text : 'sync';
		switch (status) {
		case 'sync':
			drawSyncStatus(items);
			break;
		case 'done':
			drawDoneStatus(items);
			break;
		}
	});
}

document.getElementById('openOptionsBtn').addEventListener('click', openOptions);

checkOptions();

chrome.runtime.onMessage.addListener(
	function(request) {
		if (request.type === 'status' && request.status.text) {
			switch (request.status.text) {
			case 'sync':
				drawSyncStatus(request);
				break;
			case 'done':
				drawDoneStatus(request);
				break;
			}
		}
	});
