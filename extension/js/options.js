"use strict";

import "../css/bootstrap.min.css";

import "../ico/gdrive.png";
import "../ico/question_mark.png";
import "../ico/right_arrow.png";

import VK from "./vk-api";
import GDrive from "./gdrive-api";

function gdriveAuth(event) {
	event.preventDefault();
	GDrive.checkAuth(function(token) {
		console.log('got gdrive token', token);
		chrome.storage.sync.set({'storage': 'gdrive'}, refreshStorage);
		GDrive.checkDataFolder(token);
	});
}

function refreshStorage() {
	chrome.storage.sync.get({'storage': {}}, function(items) {
		if (items.storage === 'gdrive') {
			document.getElementById("storePhoto").src = 'ico/gdrive.png';
			document.getElementById("storeName").innerHTML = 'Гугл-диск';
		}
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

	refreshStorage();
}

document.getElementById("chooseGdriveBtn").addEventListener("click", gdriveAuth);

document.addEventListener('DOMContentLoaded', restoreInfo);
