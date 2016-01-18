'use strict';

const GDrive = (function() {
	const gdrive_api = 'https://www.googleapis.com/drive/v2/';
	const gdrive_upload_api = 'https://www.googleapis.com/upload/drive/v2/files';
	const app_folder = 'VKHistoryBackup';

	var fid;

	function checkAuth(tokenCallback) {
		chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
			tokenCallback(token);
		});
	}

	function createDataFolder(token, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var resp = JSON.parse(xhr.responseText);
				console.log(resp);
				var id = resp && resp.id;
				fid = id;
				callback && callback(id);
			}
		};
		xhr.open('POST', gdrive_api + 'files?visibility=PRIVATE' , true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.setRequestHeader('Content-type', 'application/json');
		xhr.send(JSON.stringify({
			'title': app_folder,
			'parents': [{'id':'root'}],
			'mimeType': 'application/vnd.google-apps.folder'
		}));
	}

	function checkDataFolder(token, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var resp = JSON.parse(xhr.responseText);
				console.log(resp);
				if (resp.items.length === 0) {
					createDataFolder(token, callback);
				} else {
					var id = resp && resp.items && resp.items[0] && resp.items[0].id;
					console.log('folder was found', id);
					fid = id;
					callback && callback(id);
				}
			}
		};
		xhr.open('GET', gdrive_api + 'files?q=title+%3D+\'' + app_folder + '\'+and+mimeType+%3D+\'application%2Fvnd.google-apps.folder\'' , true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.send();
	}

	function createFile(token, filename, folder, content, callback) {
		const boundary = '-------314159265358979323846';
		const delimiter = '\r\n--' + boundary + '\r\n';
		const close_delim = '\r\n--' + boundary + '--';
		const contentType = 'application/json';

		var metadata = {
			'title': filename,
			'parents': [{'id':folder}],
			'mimeType': 'application/json'
		};

		var multipartRequestBody =
				delimiter +
				'Content-Type: application/json\r\n\r\n' +
				JSON.stringify(metadata) +
				delimiter +
				'Content-Type: ' + contentType + '\r\n' +
				'\r\n' +
				content +
				close_delim;

		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			var resp;
			if (xhr.readyState === 4 && xhr.status === 200) {
				resp = JSON.parse(xhr.responseText);
				console.log(resp);
				callback && callback();
			} else if (xhr.readyState === 4 && xhr.status === 404) {
				resp = JSON.parse(xhr.responseText);
				if (resp && resp.error && resp.error.errors && resp.error.errors.length && resp.error.errors[0].reason === 'notFound') {
					fid = undefined;
					createDataFileChecked(token, filename, folder, content, callback);
				}
			}
		};
		xhr.open('POST', gdrive_upload_api + '?visibility=PRIVATE&uploadType=multipart' , true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.setRequestHeader('Content-type', 'multipart/related; boundary=\'' + boundary + '\'');
		xhr.send(multipartRequestBody);
	}

	function createDataFileChecked(token, filename, content, callback) {
		if (fid) {
			createFile(token, filename, fid, content, callback);
		} else {
			checkDataFolder(token, function(fid) {
				createFile(token, filename, fid, content, callback);
			});
		}
	}

	return class GDrive {
		static checkAuth(tokenCallback) { checkAuth(tokenCallback); }
		static checkDataFolder(token, callback) { checkDataFolder(token, callback); }
		static createDataFile(token, filename, content, callback) { createDataFileChecked(token, filename, content, callback); }
	};
}());

export default GDrive;
