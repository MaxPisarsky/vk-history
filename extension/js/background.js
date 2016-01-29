'use strict';

import VK from './vk-api';
import GDrive from './gdrive-api';

const pollInterval = 1000 * 60 * 30;
const metas_dict = {};

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
		VK.getDialogs(token, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, lastSyncedId, function(total, items, real_offset) {
			if (items && items.length && chunkHandler) {
				chunkHandler(page, lastSyncedId, total, items, real_offset, completeAllDialogsCallback);
			} else if (completeAllDialogsCallback) {
				completeAllDialogsCallback();
			}
		});
	});
}

function loadAllData(token, callback) {
	GDrive.getFile(token, 'dialogs.json', function(content) {
		if (content) {
			content.forEach(function(dialog) {
				metas_dict[dialog.id] = dialog;
			});
		}

		GDrive.getFile(token, 'status.json', function(content) {
			if (content && content.status) {
				chrome.storage.local.set({'status': content.status}, function() {
					callback && callback();
				});
			} else {
				callback && callback();
			}
		});
	});
}

function processAllDialogs() {
	GDrive.checkAuth(function(token) {
		loadAllData(token, function() {
			chrome.storage.local.get({'status': {}}, function(obj) {
				processChunkDialogs(obj.status && obj.status.lastSyncedId ? 1 : 0, obj.status && obj.status.lastSyncedId, createChunkHandler, function() {
					reportStatus('done');
					var keys = Object.keys(metas_dict);
					var values = keys.map(function(v) { return metas_dict[v]; });
					GDrive.createOrUpdateDataFile(token, 'dialogs.json', JSON.stringify(values));
					chrome.storage.local.get({'status': {}}, function(object) {
						GDrive.createOrUpdateDataFile(token, 'status.json', JSON.stringify(object));
					});
					setTimeout(function() { processAllDialogs(); }, pollInterval);
				});
			});
		});
	});
}

function iterateDialogs(arr, count, completeDialogsCallback) {
	if (arr && arr.length) {
		setTimeout(function() {
			processDialog(arr.pop(), function(meta) {
				reportStatus('sync', count + 1);
				metas_dict[meta.id] = meta;
				iterateDialogs(arr, count + 1, completeDialogsCallback);
			});
		}, 334);
	} else if (completeDialogsCallback) {
		completeDialogsCallback();
	}
}

function createChunkHandler(page, lastSyncedId, total, items, real_offset, completeAllDialogsCallback) {
	return function(page, lastSyncedId, total, items, real_offset, completeAllDialogsCallback) {
		reportStatus('sync', undefined, total);

		iterateDialogs(items, lastSyncedId ? total - page * VK.MAX_DIALOGS_ON_PAGE - real_offset : page * VK.MAX_DIALOGS_ON_PAGE, function() {
			setTimeout(function() {
				processChunkDialogs(page + 1, lastSyncedId, createChunkHandler, completeAllDialogsCallback);
			}, 334);
		});
	} (page, lastSyncedId, total, items, real_offset, completeAllDialogsCallback);
}

function processDialogPage(meta, page, lastSyncedId, chunkHandler, completeDialogCallback) {
	VK.checkAuth(function(token) {
		VK.getDialog(token, meta.id, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, lastSyncedId, function(items) {
			if (items && items.length && chunkHandler) {
				chunkHandler(meta, page, lastSyncedId, items, completeDialogCallback);
			} else if (completeDialogCallback) {
				completeDialogCallback(meta);
			}
		});
	});
}

function processDialog(dialog, completeDialogCallback) {
	const meta = VK.getDialogMeta(dialog);
	chrome.storage.local.get({'status': {}}, function(obj) {
		const lastMsgId = obj && obj.status && obj.status.dialogs && obj.status.dialogs[meta.id] && obj.status.dialogs[meta.id].lastMsgId;
		const page = lastMsgId ? 1 : 0;
		processDialogPage(meta, page, lastMsgId, createDialogHandler, completeDialogCallback);
	});
}

function createDialogHandler(meta, page, lastSyncedId, items, completeDialogCallback) {
	return function(meta, page, lastSyncedId, items, completeDialogCallback) {
		const lastDate = items && items.length && items[items.length - 1].date || 0;
		const lastMsgId = items && items.length && items[items.length - 1].id || 0;

		GDrive.checkAuth(function(token) {
			GDrive.createDataFile(token, meta.id + '.' + lastDate + '.json', JSON.stringify(items), function() {
				chrome.storage.local.get({'status': {}}, function(items) {
					var status = items && items.status || {};
					if (!status.dialogs) {
						status.dialogs = {};
					}
					if (!status.dialogs[meta.id]) {
						status.dialogs[meta.id] = {};
					}
					status.dialogs[meta.id].lastMsgId = lastMsgId;
					chrome.storage.local.set({'status': status}, function() {
						setTimeout(function() { processDialogPage(meta, page + 1, lastSyncedId, createDialogHandler, completeDialogCallback); }, 334);
					});
				});
			});
		});
	} (meta, page, lastSyncedId, items, completeDialogCallback);
}

processAllDialogs();
