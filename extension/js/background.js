"use strict";

import VK from "./vk-api";

var pollInterval = 1000 * 60;

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

function createChunkHandler(page, items) {
	return function(page, items) {
		console.log(page);
		console.log(items);
		if (items) {
			items.forEach(function(dialog) {
				processDialog(dialog);
			});
		}
		processChunkDialogs(page + 1, createChunkHandler);
	} (page, items);
}

function processDialogPage(dialogId, page, chunkHandler) {
	VK.checkAuth(function(token) {
		VK.getDialog(token, dialogId, page * VK.MAX_DIALOGS_ON_PAGE, VK.MAX_DIALOGS_ON_PAGE, function(resp) {
			var items = resp && resp.response && resp.response.items;
			if (items && items.length && chunkHandler) {
				chunkHandler(dialogId, page, items);
			}
		});
	});
}

function processDialog(dialog) {
	var dialogId = VK.getDialogId(dialog);
	processDialogPage(dialogId, 0, createDialogHandler)
}

function createDialogHandler(dialogId, page, items) {
	return function(dialogId, page, items) {
		console.log(dialogId);
		console.log(page);
		console.log(items);
		/*if (items) {
			items.forEach(function(dialog) {
				processDialog(dialog);
			});
		}*/
		processDialogPage(dialogId, page + 1, createDialogHandler);
	} (dialogId, page, items);
}

processAllDialogs();
