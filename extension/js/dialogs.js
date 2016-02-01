'use strict';

import '../ico/ajax-loader.gif';

import VK from './vk-api';
import GDrive from './gdrive-api';

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
	document.getElementById('dialogContainer').style.display = 'none';
}

function showDialog() {
	document.getElementById('dialogContainer').style.display = 'block';
}

function hideLoadMore() {
	document.getElementById('loadMoreBtn').style.display = 'none';
}

function showLoadMore() {
	document.getElementById('loadMoreBtn').style.display = 'block';
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

function loadMore() {
	const btn = document.getElementById('loadMoreBtn');
	const id = btn.getAttribute('dialog-id');
	const ts = btn.getAttribute('dialog-ts');
	loadDialog(id, ts);
}

function loadDialog(id, ts) {
	hideDialogs();
	showSpinner();
	showLoadMore();

	GDrive.checkAuth(function(token) {
		loadLastPart(token, id, ts, [], function(ts, rows) {
			const dialogContainer = document.getElementById('dialog');
			var peoples = [];

			rows.forEach(function(msg) {
				var row = document.createElement('div');
				row.className = 'row';
				row.style.borderBottom = '1px solid #e4e8ed';
				row.style.padding = '5px';

				var avaCol = document.createElement('div');
				avaCol.className = 'col-xs-2 col-sm-2 col-md-1';
				var imgLink = document.createElement('a');
				var ava = document.createElement('img');
				imgLink.appendChild(ava);
				avaCol.appendChild(imgLink);

				var infoCol = document.createElement('div');
				infoCol.className = 'col-xs-3 col-sm-3 col-md-3';
				var nameRow = document.createElement('div');
				nameRow.className = 'row';
				var dateRow = document.createElement('div');
				dateRow.className = 'row';
				const dialogDate = new Date(msg.date * 1000);
				dateRow.innerHTML = ('0' + dialogDate.getDate()).slice(-2) + '.' + ('0' + (1 + dialogDate.getMonth())).slice(-2) + '.' + ('000' + dialogDate.getFullYear()).slice(-4) + ' ' + ('0' + dialogDate.getHours()).slice(-2) + ':' + ('0' + dialogDate.getMinutes()).slice(-2) + ':' + ('0' + dialogDate.getSeconds()).slice(-2);
				infoCol.appendChild(nameRow);
				infoCol.appendChild(dateRow);

				if (msg.action && msg.action === 'chat_invite_user') {
					if (msg.body !== '') {
						msg.body += '\n';
					}
					msg.body += '<span class="name' + msg.from_id + '"></span> пригласил/а <span class="name' + msg.action_mid + '">/<span>';
				}

				var msgCol = document.createElement('div');
				msgCol.className = 'col-xs-7 col-sm-7 col-md-8';
				msgCol.innerHTML = msg.body.replace(/\r\n|\n/g, '<br />');

				row.appendChild(avaCol);
				row.appendChild(infoCol);
				row.appendChild(msgCol);

				dialogContainer.insertBefore(row, dialogContainer.firstChild);

				if (msg.from_id) {
					imgLink.className = 'profile-link-' + msg.from_id;
					ava.className = 'img' + msg.from_id;
					nameRow.className += ' name' + msg.from_id;
					if (peoples.indexOf(msg.from_id) === -1) {
						peoples.push(msg.from_id);
					}
					if (peoples.length === 200) {
						loadAvatars(peoples);
						peoples = [];
					}
				}
			});

			if (ts) {
				const btn = document.getElementById('loadMoreBtn');
				btn.setAttribute('dialog-ts', ts);
			} else {
				hideLoadMore();
			}

			if (peoples.length) {
				loadAvatars(peoples);
			}

			hideSpinner();
			showDialog();
		});
	});
}

function loadLastPart(token, id, ts, rows_collector, callback) {
	GDrive.getNextPartDialog(token, id, ts, function(ts, rows) {
		if (rows) {
			rows_collector = rows.concat(rows_collector);
		}
		if (rows && rows_collector.length < 10) {
			loadLastPart(token, id, ts, rows_collector, callback);
		} else {
			callback && callback(ts, rows_collector.reverse());
		}
	});
}

function loadAll() {
	showSpinner();
	hideDialog();

	chrome.storage.local.get({'status': {}}, function(items) {
		const dialogCountSpan = document.getElementById('dialogCount');
		const dialogCount = items && items.status && items.status.total;
		dialogCountSpan.innerHTML = dialogCount;
	});

	GDrive.checkAuth(function(token) {
		GDrive.getFile(token, 'dialogs.json', function(content) {
			hideSpinner();
			showDialogs();

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

					row.addEventListener('click', function() {
						const btn = document.getElementById('loadMoreBtn');
						btn.setAttribute('dialog-id', dialog.id);
						btn.setAttribute('dialog-ts', -1);
						const dialogContainer = document.getElementById('dialog');
						dialogContainer.innerHTML = '';
						loadDialog(dialog.id, -1);
					});

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

function back() {
	loadAll();
}

document.addEventListener('DOMContentLoaded', loadAll);
document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
document.getElementById('backBtn').addEventListener('click', back);
