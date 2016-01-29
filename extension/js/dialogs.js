'use strict';

import '../ico/ajax-loader.gif';

import VK from './vk-api';
import GDrive from './gdrive-api';

function loadAll() {
	chrome.storage.local.get({'status': {}}, function(items) {
		const dialogCountSpan = document.getElementById('dialogCount');
		const dialogCount = items && items.status && items.status.total;
		dialogCountSpan.innerHTML = dialogCount;
	});

	function hideSpinner() {
		document.getElementById('spinner').style.display = 'none';
	}

	function showSpinner() {
		document.getElementById('spinner').style.display = 'flex';
	}

	function hideDialogs() {
		document.getElementById('dialogs').style.display = 'none';
	}

	function showDialogs() {
		document.getElementById('dialogs').style.display = 'block';
	}

	function hideDialog() {
		document.getElementById('dialog').style.display = 'none';
	}

	function showDialog() {
		document.getElementById('dialog').style.display = 'block';
	}

	function loadAvatars(peoples) {
		VK.getAvatars(peoples, function(p) {
			p.forEach(function(man) {
				Array.prototype.forEach.call(document.getElementsByClassName('img' + man.id), function(el) {
					el.src = man.photo_50;
				});

				Array.prototype.forEach.call(document.getElementsByClassName('name' + man.id), function(el) {
					el.innerHTML = '<a href="https://vk.com/id' + man.id + '">' + man.first_name + ' ' + man.last_name + '</a>';
				});

				Array.prototype.forEach.call(document.getElementsByClassName('profile-link-' + man.id), function(el) {
					el.href = 'https://vk.com/id' + man.id;
				});
			});
		});
	}



	function loadDialog(id) {
		hideDialogs();
		showSpinner();

		GDrive.checkAuth(function(token) {
			GDrive.getLastPartDialog(token, id, function(ts, rows) {
				console.log(ts, rows);
				GDrive.getNextPartDialog(token, id, ts, function(ts, rows) {
					console.log(ts, rows);
				});
			});
		});
	}

	GDrive.checkAuth(function(token) {
		GDrive.getFile(token, 'dialogs.json', function(content) {
			hideSpinner();
			if (content) {
				content.sort(function(a, b) {
					return b.date - a.date;
				});

				const dialogsContainer = document.getElementById('dialogs');
				var peoples = [];
				content.forEach(function(dialog) {
					var row = document.createElement('div');
					row.className = 'row';
					row.style.borderBottom = '1px solid #e4e8ed';
					row.style.padding = '5px';

					var avaCol = document.createElement('div');
					avaCol.className = 'col-xs-2 col-sm-2 col-md-1';
					avaCol.style.paddingLeft = '0px';
					var imgLink = document.createElement('a');
					var ava = document.createElement('img');
					ava.src = dialog.photo ? dialog.photo : '';
					imgLink.appendChild(ava);
					avaCol.appendChild(imgLink);

					var infoCol = document.createElement('div');
					infoCol.className = 'col-xs-3 col-sm-3 col-md-3';
					var nameRow = document.createElement('div');
					nameRow.className = 'row';
					nameRow.innerHTML = dialog.title;
					var dateRow = document.createElement('div');
					dateRow.className = 'row';
					const dialogDate = new Date(dialog.date * 1000);
					dateRow.innerHTML = ('0' + dialogDate.getDate()).slice(-2) + '.' + ('0' + (1 + dialogDate.getMonth())).slice(-2) + '.' + ('000' + dialogDate.getFullYear()).slice(-4) + ' ' + ('0' + dialogDate.getHours()).slice(-2) + ':' + ('0' + dialogDate.getMinutes()).slice(-2) + ':' + ('0' + dialogDate.getSeconds()).slice(-2);
					infoCol.appendChild(nameRow);
					infoCol.appendChild(dateRow);

					var msgCol = document.createElement('div');
					msgCol.className = 'col-xs-7 col-sm-7 col-md-8';
					msgCol.innerHTML = dialog.body;

					row.appendChild(avaCol);
					row.appendChild(infoCol);
					row.appendChild(msgCol);

					row.addEventListener('click', function() { loadDialog(dialog.id); });

					dialogsContainer.appendChild(row);

					if (dialog.user_id && !dialog.photo) {
						imgLink.className = 'profile-link-' + dialog.user_id;
						ava.className = 'img' + dialog.user_id;
					}

					if (dialog.user_id && dialog.id < 2000000000) {
						nameRow.className += ' name' + dialog.user_id;
						peoples.push(dialog.user_id);
						if (peoples.length === 200) {
							loadAvatars(peoples);
							peoples = [];
						}
					}
				});

				if (peoples.length) {
					loadAvatars(peoples);
				}
			}
		});
	});
}

document.addEventListener('DOMContentLoaded', loadAll);
