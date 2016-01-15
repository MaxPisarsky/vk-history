"use strict";

import VK from "./vk-api";
import GDrive from "./gdrive-api";

const pollInterval = 1000 * 60;

function pollHistory() {
	VK.checkAuth(function(token) {
		VK.getDialogs(token, 0, 200, function(resp) {
			console.log(resp);
		});
	});
	window.setTimeout(pollHistory, pollInterval);
}

function processChunkDialogs(page, chunkHandler) {
	VK.checkAuth(function(token) {
		VK.getDialogs(token, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, function(resp) {
			var items = resp && resp.response && resp.response.items;
			if (items && items.length && chunkHandler) {
				chunkHandler(page, items);
			}
		});
	});
}

function processAllDialogs() {
	processChunkDialogs(0, createChunkHandler);
}

function iterateDialogs(arr, completeDialogsCallback) {
	if (arr && arr.length) {
		setTimeout(function() {
			processDialog(arr.pop(), function(dialogId) {
				iterateDialogs(arr);
			});
		}, 334);
	} else if (completeDialogsCallback) {
		completeDialogsCallback();
	}
}

function createChunkHandler(page, items) {
	return function(page, items) {
		console.log(page);
		console.log(items);
		iterateDialogs(items, function() {
			setTimeout(function() {
				processChunkDialogs(page + 1, createChunkHandler);
			}, 334);
		});
	} (page, items);
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
	processDialogPage(dialogId, 0, createDialogHandler, completeDialogCallback)
}

function createDialogHandler(dialogId, page, items, completeDialogCallback) {
	return function(dialogId, page, items, completeDialogCallback) {
		console.log(dialogId);
		console.log(page);
		console.log(items);

		const lastDate = items && items.length && items[items.length - 1].date || 0;

		GDrive.checkAuth(function(token) {
			console.log('got gdrive token', token);
			GDrive.checkDataFolder(token, function(fid) {
				GDrive.createFile(token, dialogId + '.' + lastDate + '.json', fid, JSON.stringify(items), function() {
					setTimeout(function() { processDialogPage(dialogId, page + 1, createDialogHandler, completeDialogCallback); }, 334);
				});
			});
		});
	} (dialogId, page, items, completeDialogCallback);
}

processAllDialogs();
