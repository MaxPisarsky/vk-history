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
				if (resp.items.length === 0) {
					createDataFolder(token, callback);
				} else {
					var id = resp && resp.items && resp.items[0] && resp.items[0].id;
					fid = id;
					callback && callback(id);
				}
			}
		};
		xhr.open('GET', gdrive_api + 'files?q=title+%3D+\'' + app_folder + '\'+and+mimeType+%3D+\'application%2Fvnd.google-apps.folder\'', true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.send();
	}

	function checkFile(token, name, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var resp = JSON.parse(xhr.responseText);
				if (resp.items.length === 0) {
					callback && callback(false);
				} else {
					var id = resp && resp.items && resp.items[0] && resp.items[0].id;
					callback && callback(true, id);
				}
			}
		};
		xhr.open('GET', gdrive_api + 'files?q=title+%3D+\'' + name + '\'+and+\'' + fid + '\'+in+parents', true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.send();
	}

	function findFiles(token, partName, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var resp = JSON.parse(xhr.responseText);
				if (resp.items.length === 0) {
					callback && callback(false);
				} else {
					callback && callback(true, resp.items);
				}
			}
		};
		xhr.open('GET', gdrive_api + 'files?q=title+contains+\'' + partName + '\'+and+\'' + fid + '\'+in+parents', true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.send();
	}

	function createOrUpdateFile(token, filename, folder, content, id, callback) {
		const boundary = '-------314159265358979323846';
		const delimiter = '\r\n--' + boundary + '\r\n';
		const close_delim = '\r\n--' + boundary + '--';
		const contentType = 'application/json';
		const func = id ? createOrUpdateDataFileChecked : createDataFileChecked;

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
				callback && callback();
			} else if (xhr.readyState === 4 && xhr.status === 404) {
				resp = JSON.parse(xhr.responseText);
				if (resp && resp.error && resp.error.errors && resp.error.errors.length && resp.error.errors[0].reason === 'notFound') {
					fid = undefined;
					func(token, filename, folder, content, callback);
				}
			}
		};
		xhr.open(id ? 'PUT' : 'POST', gdrive_upload_api + (id ? '/' + id : '') + '?visibility=PRIVATE&uploadType=multipart' , true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.setRequestHeader('Content-type', 'multipart/related; boundary=\'' + boundary + '\'');
		xhr.send(multipartRequestBody);
	}

	function createDataFileChecked(token, filename, content, callback) {
		if (fid) {
			createOrUpdateFile(token, filename, fid, content, undefined, callback);
		} else {
			checkDataFolder(token, function(fid) {
				createOrUpdateFile(token, filename, fid, content, undefined, callback);
			});
		}
	}

	function createOrUpdateDataFileChecked(token, filename, content, callback) {
		if (fid) {
			checkFile(token, filename, function(result, id) {
				createOrUpdateFile(token, filename, fid, content, result ? id : undefined, callback);
			});
		} else {
			checkDataFolder(token, function(fid) {
				checkFile(token, filename, function(result, id) {
					createOrUpdateFile(token, filename, fid, content, result ? id : undefined, callback);
				});
			});
		}
	}

	function getFileChecked(token, filename, callback) {
		if (fid) {
			getFile(token, filename, callback);
		} else {
			checkDataFolder(token, function() {
				getFile(token, filename, callback);
			});
		}
	}

	function getFile(token, filename, callback) {
		checkFile(token, filename, function(result, id) {
			if (result) {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState === 4 && xhr.status === 200) {
						var resp = JSON.parse(xhr.responseText);
						callback && callback(resp);
					}
				};
				xhr.open('GET', gdrive_api + 'files/' + id + '?alt=media', true);
				xhr.setRequestHeader('Authorization', 'Bearer ' + token);
				xhr.send();
			} else {
				callback && callback(undefined);
			}
		});
	}

	function getFileById(token, id, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var resp = JSON.parse(xhr.responseText);
				callback && callback(resp);
			}
		};
		xhr.open('GET', gdrive_api + 'files/' + id + '?alt=media', true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.send();
	}

	function getLastPartDialogChecked(token, id, callback) {
		if (fid) {
			getLastPartDialog(token, id, callback);
		} else {
			checkDataFolder(token, function() {
				getLastPartDialog(token, id, callback);
			});
		}
	}

	function getLastPartDialog(token, id, callback) {
		getNextPartDialog(token, id, -1, callback);
	}

	function getNextPartDialog(token, id, ts, callback) {
		findFiles(token, id + '.', function(result, items) {
			if (result) {
				var filtered = items.filter(function(value) {
					return value.title.startsWith(id);
				});

				filtered.sort(function(a, b) {
					var tsA = parseInt(a.title.replace(id + '.', '').replace('.json', ''), 10);
					var tsB = parseInt(b.title.replace(id + '.', '').replace('.json', ''), 10);
					return tsB - tsA;
				});

				if (ts === -1) {
					var tsL = parseInt(filtered[0].title.replace(id + '.', '').replace('.json', ''), 10);
					getFileById(token, filtered[0].id, function(resp) { callback(tsL, resp); });
				} else {
					for (var i = 0, len = filtered.length; i < len; i++) {
						var tsF = parseInt(filtered[i].title.replace(id + '.', '').replace('.json', ''), 10);
						if (tsF < ts) {
							getFileById(token, filtered[i].id, function(resp) { callback(tsF, resp); });
							break;
						}
					}
				}
			} else {
				callback();
			}
		});
	}

	return class GDrive {
		static checkAuth(tokenCallback) { checkAuth(tokenCallback); }
		static checkDataFolder(token, callback) { checkDataFolder(token, callback); }
		static createDataFile(token, filename, content, callback) { createDataFileChecked(token, filename, content, callback); }
		static createOrUpdateDataFile(token, filename, content, callback) { createOrUpdateDataFileChecked(token, filename, content, callback); }
		static getFile(token, filename, callback) { getFileChecked(token, filename, callback); }
		static getLastPartDialog(token, id, callback) { getLastPartDialogChecked(token, id, callback); }
		static getNextPartDialog(token, id, ts, callback) { getNextPartDialog(token, id, ts, callback); }
	};
}());

export default GDrive;
