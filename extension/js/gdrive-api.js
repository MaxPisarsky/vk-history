"use strict";

const GDrive = (function() {
	var gdrive_api = "https://www.googleapis.com/drive/v2/";
	var app_folder = 'VKHistoryBackup';

	function checkAuth(tokenCallback) {
		chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
			tokenCallback(token);
		});
	}

	function createDataFolder(token, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var resp = JSON.parse(xhr.responseText);
				console.log(resp);
				callback && callback();
			}
		};
		xhr.open("POST", gdrive_api + "files" , true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.setRequestHeader("Content-type", "application/json");
		xhr.send(JSON.stringify({
			"title": app_folder,
			"parents": [{"id":"root"}],
			"mimeType": "application/vnd.google-apps.folder"
		}));
	}

	function checkDataFolder(token, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var resp = JSON.parse(xhr.responseText);
				console.log(resp);
				if (resp.items.length === 0) {
					createDataFolder(token, callback);
				} else {
					console.log('folder was found');
					callback && callback();
				}
			}
		};
		xhr.open("GET", gdrive_api + "files?q=title+%3D+'" + app_folder + "'+and+mimeType+%3D+'application%2Fvnd.google-apps.folder'" , true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.send();
	}

	return class GDrive {
		static checkAuth(tokenCallback) { checkAuth(tokenCallback); }
		static checkDataFolder(token, callback) { checkDataFolder(token, callback); }
	}
}());

export default GDrive;
