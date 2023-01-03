const {app, BrowserWindow, ipcMain} = require('electron');
const keytar = require('keytar');
const fs = require('fs');
const path = require('path');
const loginController = require('./login');
const tl = require('./launcher');
const patcher = require('./patcher');
const child = require('child_process').execFile;

const config = (function () {
	try {
		return require('./config.json');
	} catch (e) {
		try {
			return require("../../config.json");
		} catch (e) {
			let defaultCfg = {
				gameLang: "uk",
				patcher_url: "http://api.digitalsavior.fr",
				login_url: "http://api.digitalsavior.fr",
				selfupdate_url: "http://api.digitalsavior.fr/launcher/",
				activate_selfupdate: true
			};
			fs.writeFileSync('config.json', JSON.stringify(defaultCfg, null, 4));
			return defaultCfg;
		}
	}
})();

const gotTheLock = app.requestSingleInstanceLock()

const KEYTAR_SERVICE_NAME = "islanlauncher";

let MessageListener;
let loginData;
let gameStr;
let win;

function createWindow() {
	win = new BrowserWindow({
		width: 1280,
		height: 720,
		transparent: true,
		frame: false,
		resizable: false,
		maximizable: false,
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js'),
			devTools: true
		}
	});

	if (!gotTheLock) {
		app.quit()
	} else {
		app.on('second-instance', (event, commandLine, workingDirectory) => {
			if (win) {
				if (win.isMinimized()) win.restore()
				win.focus()
			}
		})
	}

	win.loadFile('src/index.html');

	MessageListener = tl.registerMessageListener((message, code) => {
		//console.log(`Received message: ${message}(${code})`);

		switch (message) {
			case "ticket": {
				loginController.getServerInfo(loginData.token).then((data) => {
					gameStr = data;
					tl.sendMessageToClient('ticket', `{"ticket": "${JSON.parse(gameStr).ticket}", "result-code": 200}`);
				}).catch((err) => {
					tl.sendMessageToClient('ticket', '{"result-code": 0, "result-message": "No handler"}');
				});
				break;
			}
			case "last_svr": {
				let gs = JSON.parse(gameStr);
				delete gs["user_permission"];
				delete gs["chars_per_server"];
				delete gs["ticket"];
				tl.sendMessageToClient("last_svr", JSON.stringify(gs));
				break;
			}
			case "char_cnt": {
				let gs = JSON.parse(gameStr);
				delete gs["user_permission"];
				delete gs["last_connected_server_id"];
				delete gs["ticket"];
				tl.sendMessageToClient("char_cnt", JSON.stringify(gs));
				break;
			}
			case "gameEvent":
			case "endPopup": {
				win.webContents.send('gameMessage', message, code);
				break;
			}
		}
	});

	win.webContents.on('dom-ready', async () => {
		keytar.findCredentials(KEYTAR_SERVICE_NAME).then((result) => {
			if (result[0]) {
				loginData = {
					username: result[0].account,
					token: result[0].password
				};
				win.webContents.send('loginResponse', null, loginData.username, false);
			}
		}).catch((err) => {
			console.error(err);
		});

		win.webContents.send('switchLanguage', config.gameLang);

		patcher.checkForUpdates(win);
	});

	// Redirect console to built-in one
	const nodeConsole = require("console");
	console = new nodeConsole.Console(process.stdout, process.stderr);

	const old_stdout = process.stdout.write;
	process.stdout.write = function (msg, ...args) {
		old_stdout(msg, ...args);
		log(msg, "log");
	};
	const old_stderr = process.stderr.write;
	process.stderr.write = function (msg, ...args) {
		old_stderr(msg, ...args);
		if (msg.startsWith("warn:"))
			log(msg.replace("warn:", ""), "warn");
		else
			log(msg, "error");
	};
}

app.whenReady().then(() => {
	if (config.activate_selfupdate)
		require('./update')(createWindow);
	else
		createWindow();
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

function log(msg, type) {
	win.webContents.send('console-log', msg, type);
}

ipcMain.on('switchLanguage', (event, lang) => {
	config.gameLang = lang;
	fs.writeFileSync('config.json', JSON.stringify(config, null, 4));
	win.webContents.send('switchLanguage', lang);
});

ipcMain.on('loginRequest', async (event, username, password, rememberMe) => {
	try {
		if (loginData && loginData.username === username && password === "password") {
			event.reply('loginResponse', null, username, true);
			return;
		}

		let result = await loginController.login(username, password);
		if (loginData) {
			loginController.logout(loginData.token);
			keytar.deletePassword(KEYTAR_SERVICE_NAME, loginData.username);
		}
		loginData = Object.assign({}, result);

		if (rememberMe) {
			keytar.setPassword(KEYTAR_SERVICE_NAME, result.username, result.token);
		}

		event.reply('loginResponse', null, result.username, true);
	} catch (err) {
		event.reply('loginResponse', err);
	}
});

ipcMain.on('logoutRequest', (event) => {
	loginController.logout(loginData.token);
	keytar.deletePassword(KEYTAR_SERVICE_NAME, loginData.username);
});

ipcMain.on('abort-login-req', (event) => {
	loginController.cancelAllRequests();
});

ipcMain.on('launchGame', async (event) => {
	if (app.isPackaged) {
		let shinra = app.isPackaged ? path.join(app.getAppPath(), '..', '..') : app.getAppPath();
		let toolbox = app.isPackaged ? path.join(app.getAppPath(), '..', '..') : app.getAppPath();
		shinra = path.join(shinra, 'shinrameter', 'ShinraMeter.exe');
		toolbox = path.join(toolbox, 'tb', 'TeraToolbox.exe');
		try {
			child(toolbox);
			child(shinra);
		} catch (e) {
			console.log(e);
			app.exit();
		}
	}

	try {
		gameStr = await loginController.getServerInfo(loginData.token);

		event.reply('launchGameRes', null);

		tl.launchGame(gameStr, config.gameLang, (err) => {
			if (err) throw err;
			event.reply('exitGame');
		});
	} catch (err) {
		event.reply('launchGameRes', err);
	}
});

ipcMain.on('patch-paused-state', (event, paused) => {
	if (paused) {
		patcher.pauseDownload();
	} else {
		patcher.downloadFiles(win);
	}
});

ipcMain.on('repair-client', (event) => {
	patcher.checkForUpdates(win, true);
});

ipcMain.on('window-minimize', (event) => {
	BrowserWindow.getFocusedWindow().minimize();
});

ipcMain.on('window-close', (event) => {
	ipcMain.removeAllListeners();
	BrowserWindow.getFocusedWindow().close();
	app.quit();
});

process.on('exit', () => {
	MessageListener;
});