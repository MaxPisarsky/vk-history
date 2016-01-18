'use strict';

import VK from './vk-api';
import GDrive from './gdrive-api';

const pollInterval = 1000 * 60;

function reportStatus(text, current, total, lastSyncedId) {
	chrome.storage.sync.get({'status': {}}, function(items) {
		var status = {
			text: text
		};
		const newCurrent = current || items.status.current;
		const newTotal = total || items.status.total;
		const newSyncedId = lastSyncedId || items.status.lastSyncedId;
		if (newCurrent) {
			status.current = newCurrent;
		}
		if (newTotal) {
			status.total = newTotal;
		}
		if (newSyncedId) {
			status.lastSyncedId = newSyncedId;
		}

		chrome.storage.sync.set({'status': status});
		chrome.runtime.sendMessage({type: 'status', status: status});
	});
}

function processChunkDialogs(page, lastSyncedId, chunkHandler, completeAllDialogsCallback) {
	VK.checkAuth(function(token) {
		VK.getDialogs(token, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, lastSyncedId, function(total, items) {
			if (items && items.length && chunkHandler) {
				chunkHandler(page, lastSyncedId, total, items, completeAllDialogsCallback);
			} else if (completeAllDialogsCallback) {
				completeAllDialogsCallback();
			}
		});
	});
}

function processAllDialogs() {
	chrome.storage.sync.get({'status': {}}, function(obj) {
		processChunkDialogs(obj.status && obj.status.lastSyncedId ? 1 : 0, obj.status && obj.status.lastSyncedId, createChunkHandler, function() {
			reportStatus('done');
		});
	});
}

function iterateDialogs(arr, count, completeDialogsCallback) {
	if (arr && arr.length) {
		setTimeout(function() {
			processDialog(arr.pop(), function() {
				reportStatus('sync', count + 1);
				iterateDialogs(arr, count + 1, completeDialogsCallback);
			});
		}, 334);
	} else if (completeDialogsCallback) {
		completeDialogsCallback();
	}
}

function createChunkHandler(page, lastSyncedId, total, items, completeAllDialogsCallback) {
	return function(page, lastSyncedId, total, items, completeAllDialogsCallback) {
		reportStatus('sync', undefined, total);

		iterateDialogs(items, page * VK.MAX_DIALOGS_ON_PAGE, function() {
			setTimeout(function() {
				processChunkDialogs(page + 1, lastSyncedId, createChunkHandler, completeAllDialogsCallback);
			}, 334);
		});
	} (page, lastSyncedId, total, items, completeAllDialogsCallback);
}

function processDialogPage(dialogId, page, chunkHandler, completeDialogCallback) {
	VK.checkAuth(function(token) {
		VK.getDialog(token, dialogId, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, function(resp) {
			var items = resp && resp.response && resp.response.items;
			if (items && items.length && chunkHandler) {
				chunkHandler(dialogId, page, items, completeDialogCallback);
			} else if (completeDialogCallback) {
				completeDialogCallback(dialogId);
			}
		});
	});
}

function processDialog(dialog, completeDialogCallback) {
	const dialogId = VK.getDialogId(dialog);
	processDialogPage(dialogId, 0, createDialogHandler, completeDialogCallback);
}

function createDialogHandler(dialogId, page, items, completeDialogCallback) {
	return function(dialogId, page, items, completeDialogCallback) {
		const lastDate = items && items.length && items[items.length - 1].date || 0;
		const lastMsgId = items && items.length && items[items.length - 1].id || 0;

		//setTimeout(function() { processDialogPage(dialogId, page + 1, createDialogHandler, completeDialogCallback); }, 334);
		GDrive.checkAuth(function(token) {
			GDrive.createDataFile(token, dialogId + '.' + lastDate + '.json', JSON.stringify(items), function() {
				reportStatus('sync', undefined, undefined, lastMsgId);
				setTimeout(function() { processDialogPage(dialogId, page + 1, createDialogHandler, completeDialogCallback); }, 334);
			});
		});
	} (dialogId, page, items, completeDialogCallback);
}

processAllDialogs();
