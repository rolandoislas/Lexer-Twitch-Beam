var Beam = function(logic) {
	this.Beam = require("beam-client-node/lib/ws");
	this.Chat = require("../../game/Chat.js");
	this.request = require("request");
	this.chat = new this.Chat(logic);
	this.client;
	this.chatHandler;
	connect(this);
};

function connect(that) {
	getData(that, function(user, chat) {
		that.client = new that.Beam(chat.endpoints).boot();
		setChatHandler(that);
		that.client.call("auth", [user.channel.id, user.id, chat.authkey])
			.then(function () {
				console.log("Beam is now authenticated.");
			}).catch(function (err) {
				console.log("An error occurred authenticating Beam.")
			});
	});
}

function getData(that, callback) {
	var postData = {
		username: process.env.BEAM_USERNAME,
		password: process.env.BEAM_AUTH
	};
	that.request({
		method: "POST",
		uri: "https://beam.pro/api/v1/users/login",
		form: postData,
		jar: true
	}, function(err, res, body) {
		var user = JSON.parse(body);
		that.request({
			method: "GET",
			uri: "https://beam.pro/api/v1/chats/" + user.channel.id,
			jar: true
		}, function(err, res, body) {
			return callback(user, JSON.parse(body));
		});
	});
}

Beam.prototype.enableChatControl = function(player) {
	this.chat.setPlayer(player);
};

function setChatHandler(that) {
	if (typeof that.chatHandler === "undefined")
		that.chatHandler = function(data) {
			var user = {};
			user.username = data.user_name;
			var message = "";
			data.message.message.forEach(function(chunk) {
				if (chunk.type === "text")
					message += chunk.data;
				else if (chunk.type === "emoticon" || chunk.type === "link")
					message += "Kappa" // soft reject (regex fail)
			});
			that.chat.parseMessage(user, message, function(err) {
				if (err)
					return that.client.call("msg", ["@" + user.username + " Move Rejected. Reason: " + err]);
				that.client.call("msg", ["Move accepted: \"" + message + "\""]);
			});
		};
	that.client.removeListener("ChatMessage", that.chatHandler);
	that.client.on("ChatMessage", that.chatHandler);
}

module.exports = Beam;