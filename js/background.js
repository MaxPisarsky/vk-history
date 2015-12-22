var pollInterval = 1000 * 60;
var vkCLientId = 5183677;
var vkRequestedScopes = 'messages';
var vkAuthenticationUrl  = 'https://oauth.vk.com/authorize?client_id=' + vkCLientId + '&scope=' + vkRequestedScopes + '&redirect_uri=http%3A%2F%2Foauth.vk.com%2Fblank.html&display=page&response_type=token';

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

function pollHistory() {
	chrome.storage.sync.get({'vkaccess_token': {}}, function(items) {
		console.log(items);
		if (items.vkaccess_token.length === undefined) {
			chrome.tabs.create({url: vkAuthenticationUrl, selected: true}, function (tab) {
				chrome.tabs.onUpdated.addListener(listenerHandler(tab.id));
			});

			return;
		}
		
		
	});
	window.setTimeout(pollHistory, pollInterval);
}

function listenerHandler(authenticationTabId) {
	return function tabUpdateListener(tabId, changeInfo) {
		var vkAccessToken,
            vkAccessTokenExpiredFlag;

        if (tabId === authenticationTabId && changeInfo.url !== undefined && changeInfo.status === "loading") {

            if (changeInfo.url.indexOf('oauth.vk.com/blank.html') > -1) {
                authenticationTabId = null;
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);

                vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');

                if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
                    displayeAnError('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
                    return;
                }

                chrome.storage.sync.set({'vkaccess_token': vkAccessToken}, function () {
                });
            }
        }
	}
}

pollHistory();