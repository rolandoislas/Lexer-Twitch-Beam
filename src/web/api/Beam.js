var Beam = function(logic) {
	this.BeamSocket = require("beam-client-node/lib/ws");
	this.BeamClient = require("beam-client-node");
	this.Chat = require("../../game/Chat.js");
	this.request = require("request");
	this.chat = new this.Chat(logic);
	this.client;
	this.chatHandler;
	connect(this);
};

function connect(that) {
	that.client = new that.BeamClient();
	var postData = {
		username: process.env.BEAM_USERNAME,
		password: process.env.BEAM_AUTH
	};
	that.client.use("oauth", {
		tokens: {
			access: process.env.BEAM_AUTH,
			expires: Date.now() + (365 * 24 * 60 * 60 * 1000)
		}
	});
	var user;
	that.client.request("GET", "users/current", {jar:true})
	.then(response => {
		user = response.body;
		return that.client.chat.join(response.body.channel.id);
	})
	.then(response => {
		setChatHandler(that, user.id, user.channel.id, 
			response.body.endpoints, response.body.authkey);
		console.log("Beam is now authenticated.");
	})
	.catch(error => {
		console.log("An error occurred authenticating Beam.", error);
	});
}

Beam.prototype.enableChatControl = function(player) {
	this.chat.setPlayer(player);
};

function setChatHandler(that, userId, channelId, endpoints, authkey) {
	var sock = new that.BeamSocket(endpoints).boot();
	sock.auth(channelId, userId, authkey)
	.then(() => {
		console.log("Beam chat connected");
	})
	.catch(error => {
		console.log("Beam chat failed to connect.", error);
	});
	
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
					return sock.call("msg", ["@" + user.username + " Move Rejected. Reason: " + err]);
				sock.call("msg", ["Move accepted: \"" + message + "\""]);
			});
		};
	sock.removeListener("ChatMessage", that.chatHandler);
	sock.on("ChatMessage", that.chatHandler);
	sock.on('error', error => {
        console.error('Beam chat socket error', error);
    });
}

module.exports = Beam;
