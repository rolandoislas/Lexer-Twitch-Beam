var Beam = function(logic) {
	this.BeamSocket = require("beam-client-node/lib/ws");
	this.BeamClient = require("beam-client-node");
	this.Chat = require("../../game/Chat.js");
	this.request = require("request");
	this.chat = new this.Chat(logic);
	this.client;
	this.sock;
	this.chatHandler;
	connect(this);
};

function connect(that) {
	console.log("Connecting to Beam");
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
        setTimeout(connect, 30000, that);
	});
}

Beam.prototype.enableChatControl = function(player) {
	this.chat.setPlayer(player);
};

function setChatHandler(that, userId, channelId, endpoints, authkey) {
	that.sock = new that.BeamSocket(endpoints).boot();
    that.sock.auth(channelId, userId, authkey)
	.then(() => {
		console.log("Beam chat connected");
	})
	.catch(error => {
		console.log("Beam chat failed to connect.", error);
        setTimeout(setChatHandler, 30000, that, userId, channelId, endpoints, authkey);
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
					return that.sock.call("msg", ["@" + user.username + " Move Rejected. Reason: " + err]);
                that.sock.call("msg", ["Move accepted: \"" + message + "\""]);
			});
		};
    that.sock.removeListener("ChatMessage", that.chatHandler);
    that.sock.on("ChatMessage", that.chatHandler);
    that.sock.on('error', error => {
        console.error('Beam chat socket error', error);
    	setTimeout(setChatHandler, 30000, that, userId, channelId, endpoints, authkey);
    });
    that.sock.on("closed", () => {
    	console.log("Socket closed. reconnecting");
    	setTimeout(setChatHandler, 30000, that, userId, channelId, endpoints, authkey);
	});
}

module.exports = Beam;
