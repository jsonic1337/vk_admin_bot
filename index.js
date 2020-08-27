var keymute = 'мут',
	keyunmute = 'анмут',
	kubik = "кубик",
	help = "хелп",
	give_warn = "варн",
	unwarn = "разварн",
	kick = "кик",
	random_anime = "аниме";
const request = require('request');
const {
	VK
} = require('vk-io');
const vk = new VK({
	token: " токен "
});
const {
	api
} = vk;
let fs = require('fs');
const path = './config.json'
fs.access(path, fs.F_OK, (err) => {
	if (err) {
		createConfig();
		return
	}
})
setInterval(saveConfig, 20 * 60000);
readConfig();
vk.updates.start();
vk.updates.on('message', (context, next) => {
	if (!config.hasOwnProperty(context.chatId)) {
		config[context.chatId] = { "admins": [239801026], "whitelist": [], "warn": {}, "mute": {}, "audioBlocked": false };
		saveConfig();
	} else if (!config[context.chatId]["warn"].hasOwnProperty(context.senderId)) {
		config[context.chatId]["warn"][context.senderId] = 0;
		saveConfig();
	} else if (config[context.chatId]['mute'].hasOwnProperty(context.senderId) && config.hasOwnProperty(context.chatId)) {
		config[context.chatId]["warn"][context.senderId]++;
		context.send(`У [id${context.senderId}|Вас] мут! Варнов: ${config[context.chatId]["warn"][context.senderId]}/5`);
		saveConfig();
		checkWarn(context.senderId, context);
	} else if (!context.isUser || context.text == null) return
	else if (context.text.toLowerCase() == kubik) {
		let scope = (getRandomInt(6));
		context.send(`${cubes[scope]}\n[id${context.senderId}|Вам] выпало число ${scope+1}!`)
	} else if (context.text.toLowerCase() == help) {
		context.send('Команды бота:\nКик - исключает пользователя\nМут 1 - дает мут пользователю на любое время (вместо 1 можно писать любое число, указывается в минутах)\nВарн - дает варн пользователю\nРазварн - снимает все варны пользователя\nУказанные выше команды работают только при ответе на сообщение пользователя, с которым нужно совершить какое либо действие.\nДоп. команды:\nКубик - рандом значение от 1 до 6\nАниме - название рандомного аниме');
	} else if (context.text.toLowerCase() == random_anime) {
		request.post({
			url: 'https://genword.ru/generators/anime/new/',
			headers: {
				'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
				'x-requested-with': 'XMLHttpRequest'
			}
		}, (err, response, body) => {
			if (err) return console.log(err);
			context.send(JSON.parse(body).result.nameRu);
		});
	} else if (context.hasReplyMessage == false) return
	else if (context.replyMessage.senderId < 0 || config[context.chatId]["admins"].includes(context.replyMessage.senderId)) return
	else if (context.text.startsWith(keymute)) {
		if (config[context.chatId]["admins"].includes(context.senderId)) {
			mutetime = parseInt(context.text.toLowerCase().replace(keymute, '').trim());
			if (mutetime !== mutetime) {
				mutetime = 5;
			}
			muteUser(context.replyMessage.senderId, mutetime, context.chatId);
		} else {
			checkAdmin(context);
		}
	} else if (context.text.startsWith(keyunmute)) {
		if (config[context.chatId]["admins"].includes(context.senderId)) {
			unmuteUser(context.replyMessage.senderId, context.chatId)
		} else {
			checkAdmin(context);
		}
	} else if (context.text.toLowerCase() == give_warn) {
		if (config[context.chatId]["admins"].includes(context.senderId)) {
			if (!config[context.chatId]["warn"].hasOwnProperty(context.replyMessage.senderId)) {
				config[context.chatId]["warn"][context.replyMessage.senderId] = 1;
				saveConfig();
			} else {
				config[context.chatId]["warn"][context.replyMessage.senderId]++;
				saveConfig();
				checkWarn(context.replyMessage.senderId.toString(), context);
			}
			context.send(`[id${context.replyMessage.senderId}|Вы] получили предупреждение!\nВарнов: ${config[context.chatId]["warn"][context.replyMessage.senderId]}/5`);
		} else {
			checkAdmin(context);
		}
	} else if (context.text.toLowerCase() == unwarn) {
		if (config[context.chatId]["admins"].includes(context.senderId)) {
			if (!config[context.chatId]["warn"].hasOwnProperty(context.replyMessage.senderId)) {
				config[context.chatId]["warn"][context.replyMessage.senderId] = 0;
				saveConfig();
			} else {
				config[context.chatId]["warn"][context.replyMessage.senderId] = 0;
				saveConfig();
				checkWarn(context.replyMessage.senderId.toString(), context);
			}
			context.send(`[id${context.replyMessage.senderId}|Ваши] предупреждения обнулены!\nВарнов: ${config[context.chatId]["warn"][context.replyMessage.senderId]}/5`);
		} else {
			checkAdmin(context);
		}
	} else if (context.text.toLowerCase() == kick) {
		if (config[context.chatId]["admins"].includes(context.senderId)) {
			context.kickUser(context.replyMessage.senderId);
			config[context.chatId]["warn"][context.replyMessage.senderId] = 0;
			saveConfig();
		} else {
			checkAdmin(context);
		}
	}
})
async function checkAdmin(context) {
	let users = await vk.api.messages.getConversationMembers({
		peer_id: context.peerId
	});
	let user = users.items.find((item) => item.member_id === context.senderId);
	if (user.is_admin) {
		if (!config[context.chatId]["admins"].hasOwnProperty(context.senderId)) {
			config[context.chatId]["admins"].push(context.senderId);
			console.log(config[context.chatId]);
			saveConfig();
			context.send(`[id${context.senderId}|Вы] добавлены в список администраторов в беседе! Теперь вы можете использовать админ-команды!`)
		}
	} else {
		context.send(`У [id${context.senderId}|Вас] нет прав администратора в беседе!`)
		return
	}
}

function muteUser(userId, time, peer) {
	config[peer]['mute'][userId] = Date.now() + (time * 60000);
	sendmsg(peer, `У [id${userId}|Вас] мут на ${time} мин! За каждое написанное сообщение вы будете получать варн!`);
}

function unmuteUser(userId, peer) {
	delete config[peer]['mute'][userId];
	sendmsg(peer, `[id${userId}|Вы] можете общаться!`);
}
setInterval(checkMute, 5000);

function checkMute() {
	Object.keys(config).forEach(key => {
		Object.keys(config[key]['mute']).forEach(key2 => {
			if (Date.now() >= config[key]['mute'][key2]) {
				unmuteUser(key2, parseInt(key));
				saveConfig();
			}
		})
	})
}

function sendmsg(chat, msg) {
	api.messages.send({
		chat_id: chat,
		message: msg,
		random_id: 0
	})
}

function checkWarn(userid, context) {
	if (config[context.chatId]["warn"][userid] >= 5) {
		context.send(`У [id${userid}|Вас] максимальное количество варнов. Вы будете кикнуты!`)
		context.kickUser(userid);
		config[context.chatId]["warn"][userid] = 0;
		saveConfig();
	}
}

function createConfig() {
	fs.writeFile("config.json", "{}", function(err) {
		if (err) {
			console.log(err);
		} else {
			console.log("Файл создан");
		}
	})
}

function readConfig() {
	fs.readFile('./config.json', 'utf8', (err, jsonString) => {
		if (err) return console.log('err: ' + err);
		config = JSON.parse(jsonString);
	})
}

function saveConfig() {
	fs.writeFile('./config.json', JSON.stringify(config), err => {
		if (err) return console.log('Error writing file', err);
	})
}

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}
var cubes = ["ᅠ ᅠ ⬜⬜⬜\nᅠ ᅠ ⬜🔳⬜\nᅠ ᅠ ⬜⬜⬜", "ᅠ ᅠ 🔳⬜⬜\nᅠ ᅠ ⬜⬜⬜\nᅠ ᅠ ⬜⬜🔳", "ᅠ ᅠ 🔳⬜⬜\nᅠ ᅠ ⬜🔳⬜\nᅠ ᅠ ⬜⬜🔳", "ᅠ ᅠ 🔳⬜🔳\nᅠ ᅠ ⬜⬜⬜\nᅠ ᅠ 🔳⬜🔳", "ᅠ ᅠ 🔳⬜🔳\nᅠ ᅠ ⬜🔳⬜\nᅠ ᅠ 🔳⬜🔳", "ᅠ ᅠ 🔳⬜🔳\nᅠ ᅠ 🔳⬜🔳\nᅠ ᅠ 🔳⬜🔳"]
