var Socket = function(webServer) {
	this.WebSocket = require("ws").Server;
	this.Codec = require("./Codec");
	this.Logic = require("../game/Logic");
	this.webServer = webServer;
	this.ws; // Web Socket
	this.commands = {};
	this.idIncrement = 0;
	this.sockets = {};
	this.logic;
};

function handleMessage(that, message, socket) {
	var command = that.Codec.decode(message);
	for (var key in that.commands)
		if (key === command.type)
			return that.commands[key](socket, command);
}

Socket.prototype.addCommand = function(command, callback) {
	this.commands[command] = callback;
}

Socket.prototype.run = function() {
	this.ws = new this.WebSocket({server:this.webServer});
	var that = this;
	this.ws.on("connection", function(socket) {
		socket.id = that.idIncrement++;
		that.sockets[socket.id] = socket;
		socket.on("message", function(message, flags) {
			if (process.env.NODE_ENV === "development")
				console.log(message);
			handleMessage(that, message, socket);
		});
		socket.on("close", function(code, message) {
			if (typeof socket.auth !== "undefined" && socket.auth)
				that.logic.endGame(socket.id);
			delete that.sockets[socket.id];
		});
	});
	this.logic = new this.Logic(this);
};

Socket.prototype.send = function(recepients, message) {
	var that = this;
	if (Number.isInteger(recepients))
		recepients = [recepients];
	recepients.forEach(function(recepient) {
		try {
			that.sockets[recepient].send(message);
		} catch(ignore) {}
	});
}

Socket.prototype.broadcast = function(message) {
	for (var key in this.sockets) {
		try {
			this.sockets[key].send(message);
		} catch(ignore) {}
	}
}

module.exports = Socket;