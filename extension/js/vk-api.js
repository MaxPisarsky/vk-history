"use strict";

const VK = (function() {
	var vkCLientId = 5183677;
	var vkRequestedScopes = 'messages';
	var vkAuthenticationUrl  = 'https://oauth.vk.com/authorize?client_id=' + vkCLientId + '&scope=' + vkRequestedScopes + '&redirect_uri=http%3A%2F%2Foauth.vk.com%2Fblank.html&display=page&response_type=token';
	var vk_api = "https://api.vk.com/method/";

	function displayeAnError(textToShow, errorToShow) {
		alert(textToShow + '\n' + errorToShow);
	}

	function getUrlParameterValue(url, parameterName) {
		var urlParameters  = url.substr(url.indexOf("#") + 1),
			parameterValue = "",
			index,
			temp;

		urlParameters = urlParameters.split("&");

		for (index = 0; index < urlParameters.length; index += 1) {
			temp = urlParameters[index].split("=");

			if (temp[0] === parameterName) {
				return temp[1];
			}
		}

		return parameterValue;
	}

	function listenerHandler(authenticationTabId, tokenCallback) {
		return function tabUpdateListener(tabId, changeInfo) {
			var vkAccessToken,
				vkAccessTokenExpiredFlag;

			if (tabId === authenticationTabId && changeInfo.url !== undefined && changeInfo.status === "loading") {
				if (changeInfo.url.indexOf('oauth.vk.com/blank.html') > -1) {
					authenticationTabId = null;
					chrome.tabs.onUpdated.removeListener(tabUpdateListener);
					chrome.tabs.remove(tabId);

					vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');

					if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
						displayeAnError('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
						return;
					}

					chrome.storage.sync.set({'vkaccess_token': vkAccessToken}, function () {
						console.log('vk token saved');
						tokenCallback(vkAccessToken);
					});
				}
			}
		}
	}

	function checkAuth(tokenCallback) {
		chrome.storage.sync.get({'vkaccess_token': {}}, function(items) {
			if (items.vkaccess_token.length === undefined) {
				console.log('not found vk token - need auth');
				chrome.tabs.create({url: vkAuthenticationUrl, selected: true}, function (tab) {
					chrome.tabs.onUpdated.addListener(listenerHandler(tab.id, tokenCallback));
				});
			} else {
				console.log('found vk token');
				tokenCallback(items.vkaccess_token);
			}
		});
	}

	function getUser(token, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var resp = JSON.parse(xhr.responseText);
				if (resp && resp.error && resp.error.error_code === 5) {
					console.log('token expired');
					chrome.storage.sync.remove('vkaccess_token', checkAuth(function(token) { getUser(token, callback); }));
				} else {
					callback && callback(resp);
				}
			}
		};
		xhr.open("GET", vk_api + "users.get?fields=photo_200&v=5.41&access_token=" + token, true);
		xhr.send();
	}

	function getDialogs(token, offset, count, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var resp = JSON.parse(xhr.responseText);
				if (resp && resp.error && resp.error.error_code === 5) {
					console.log('token expired');
					chrome.storage.sync.remove('vkaccess_token', checkAuth(function(token) { getDialogs(token, offset, count, callback); }));
				} else if (resp && resp.error && resp.error.error_code === 6) {
					setTimeout(function() {
						getDialogs(token, offset, count, callback);
					}, 334);
				} else {
					callback && callback(resp);
				}
			}
		};
		xhr.open("GET", vk_api + "messages.getDialogs?offset=" + offset + "&count=" + count + "&v=5.41&access_token=" + token, true);
		xhr.send();
	}

	function getDialogId(dialog) {
		var message = dialog && dialog.message;
		var dialogId;
		if (message) {
			dialogId = message.user_id;
			if (message.chat_id) {
				dialogId = message.chat_id + 2000000000;
			}
			var date = message.date;
			console.log(dialogId, date);
		}
		return dialogId;
	}

	function getDialog(token, id, offset, count, callback, start_message_id) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var resp = JSON.parse(xhr.responseText);
				if (resp && resp.error && resp.error.error_code === 5) {
					console.log('token expired');
					chrome.storage.sync.remove('vkaccess_token', checkAuth(function(token) { getDialog(token, id, offset, count, callback, start_message_id); }));
				} else if (resp && resp.error && resp.error.error_code === 6) {
					setTimeout(function() {
						getDialog(token, id, offset, count, callback, start_message_id);
					}, 334);
				} else {
					callback && callback(resp);
				}
			}
		};
		xhr.open("GET", vk_api + "messages.getHistory?" + (start_message_id === undefined ? "rev=1" : "") + (id > 2000000000 ? "&peer_id=" + id : ("&user_id=" + id)) + (start_message_id ? "&start_message_id=" + start_message_id : "") + "&offset=" + ((start_message_id ? -1 : 1) * offset) + "&count=" + count + "&v=5.41&access_token=" + token, true);
		xhr.send();
	}

	return class VK {
		static checkAuth(tokenCallback) { checkAuth(tokenCallback); }
		static getUser(token, callback) { getUser(token, callback); }
		static getDialogs(token, offset, count, callback) { getDialogs(token, offset, count, callback); }
		static getDialogId(dialog) { return getDialogId(dialog); }
		static getDialog(token, id, offset, count, callback, start_message_id) { getDialog(token, id, offset, count, callback, start_message_id); }
		static get MAX_DIALOGS_ON_PAGE() { return 200; }
	}
})();

export default VK;
