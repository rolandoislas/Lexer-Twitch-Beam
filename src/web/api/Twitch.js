var Twitch = function(logic) {
	this.Tmi = require("tmi.js");
	this.Chat = require("../../game/Chat.js");
	this.chat = new this.Chat(logic);
	this.client;
	this.chatHandler;
	connect(this);
};

function connect(that) {
	var options = {
		options: {
			debug: process.env.NODE_ENV === "development"
		},
		connection: {
			cluster: "chat",
			reconnect: true
		},
		identity: {
			username: process.env.TWITCH_USERNAME,
			password: process.env.TWITCH_AUTH
		},
		channels: ["#" + process.env.TWITCH_USERNAME]
	};
	that.client = new that.Tmi.client(options);
	that.client.connect();
}

Twitch.prototype.enableChatControl = function(player) {
	this.chat.setPlayer(player);
	var that = this;
	if (typeof this.chatHandler === "undefined")
		this.chatHandler = function(channel, user, message, self) {
			that.chat.parseMessage(user, message, function(err) {
				if (err)
					that.client.say("#" + process.env.TWITCH_USERNAME, 
						"@" + user.username + " Move Rejected. Reason: " + err);
			});
		};
	this.client.removeListener("chat", this.chatHandler);
	this.client.on("chat", this.chatHandler);
};

module.exports = Twitch;