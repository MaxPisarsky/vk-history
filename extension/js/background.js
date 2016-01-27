'use strict';

import VK from './vk-api';
import GDrive from './gdrive-api';

const pollInterval = 1000 * 60 * 30;

function reportStatus(text, current, total) {
	chrome.storage.local.get({'status': {}}, function(items) {
		var status = {
			text: text
		};
		const newCurrent = current || items.status.current;
		const newTotal = total || items.status.total;
		if (newCurrent) {
			status.current = newCurrent;
		}
		if (newTotal) {
			status.total = newTotal;
		}

		status.dialogs = items && items.status && items.status.dialogs || {};

		if (text === 'done') {
			var maxId = -1;
			for (var dialogId in status.dialogs) {
				if (status.dialogs[dialogId] && status.dialogs[dialogId].lastMsgId > maxId) {
					maxId = status.dialogs[dialogId].lastMsgId;
				}
			}
			status.lastSyncedId = maxId;
		}

		chrome.storage.local.set({'status': status});
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
	chrome.storage.local.get({'status': {}}, function(obj) {
		processChunkDialogs(obj.status && obj.status.lastSyncedId ? 1 : 0, obj.status && obj.status.lastSyncedId, createChunkHandler, function() {
			reportStatus('done');
			setTimeout(function() { processAllDialogs(); }, pollInterval);
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

function processDialogPage(dialogId, page, lastSyncedId, chunkHandler, completeDialogCallback) {
	VK.checkAuth(function(token) {
		VK.getDialog(token, dialogId, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, lastSyncedId, function(items) {
			if (items && items.length && chunkHandler) {
				chunkHandler(dialogId, page, lastSyncedId, items, completeDialogCallback);
			} else if (completeDialogCallback) {
				completeDialogCallback(dialogId);
			}
		});
	});
}

function processDialog(dialog, completeDialogCallback) {
	const dialogId = VK.getDialogId(dialog);
	chrome.storage.local.get({'status': {}}, function(obj) {
		const lastMsgId = obj && obj.status && obj.status.dialogs && obj.status.dialogs[dialogId] && obj.status.dialogs[dialogId].lastMsgId;
		const page = lastMsgId ? 1 : 0;
		processDialogPage(dialogId, page, lastMsgId, createDialogHandler, completeDialogCallback);
	});
}

function createDialogHandler(dialogId, page, lastSyncedId, items, completeDialogCallback) {
	return function(dialogId, page, lastSyncedId, items, completeDialogCallback) {
		const lastDate = items && items.length && items[items.length - 1].date || 0;
		const lastMsgId = items && items.length && items[items.length - 1].id || 0;

		GDrive.checkAuth(function(token) {
			GDrive.createDataFile(token, dialogId + '.' + lastDate + '.json', JSON.stringify(items), function() {
				chrome.storage.local.get({'status': {}}, function(items) {
					var status = items && items.status || {};
					if (!status.dialogs) {
						status.dialogs = {};
					}
					if (!status.dialogs[dialogId]) {
						status.dialogs[dialogId] = {};
					}
					status.dialogs[dialogId].lastMsgId = lastMsgId;
					chrome.storage.local.set({'status': status}, function() {
						setTimeout(function() { processDialogPage(dialogId, page + 1, lastSyncedId, createDialogHandler, completeDialogCallback); }, 334);
					});
				});
			});
		});
	} (dialogId, page, lastSyncedId, items, completeDialogCallback);
}

processAllDialogs();
