var Http = require("./web/Http");
var Socket = require("./web/Socket");
var Codec = require("./web/Codec");
var Logic = require("./game/Logic");
var Redis = require("./data/Redis");
var redis = new Redis();

var port = process.env.PORT;

redis.clear();

var webServer = new Http(port);
webServer.addGet("/", function(req, res) {
	res.render("pages/index", {
		title: "",
		description: "A word game built with web sockets and JavaScript."
	});
});

var socketServer = new Socket(webServer.run());
var logic = new Logic(socketServer);
socketServer.addCommand("requestGame", function(socket, command) {
	logic.getOpenGame(socket.id, function(err, id) {
		if (err)
			socket.send(Codec.encode("error"));
		if (id == -1)
			logic.createNewLobby(socket.id, function(err) {
				if (err)
					socket.send(Codec.encode("error"));
				socket.send(Codec.encode("waitForGame"));
			});
	});
});
socketServer.addCommand("boardPush", function(socket, command) {
	logic.checkBoardPush(socket.id, command.data, function(err, accepted, reason, points) {
		if (err)
			socket.send(Codec.encode("error"));
		if (accepted)
			logic.startNextTurn(socket.id, points, function(err) {
				if (err)
					socket.send(Codec.encode("error"));
			});
		else
			socket.send(Codec.encode("rejectPush", {reason: reason}));
	});
});
socketServer.addCommand("skipTurn", function(socket, command) {
	logic.startNextTurn(socket.id, 0, function(err, message) {
		if (err)
			return socket.send(Codec.encode("error"));
		if (message)
			return socket.send(Codec.encode("error", {message: message}));
	});
});
socketServer.addCommand("checkEnd", function(socket, command) {
	logic.checkEnd(socket.id, function(err, id) {
		if (err)
			socket.send(Codec.encode("error"));
	});
});
socketServer.addCommand("swap", function(socket, command) {
	logic.swapTiles(socket.id, command.data, function(err) {
		if (err)
			socket.send(Codec.encode("error"));
		logic.startNextTurn(socket.id, 0, function(err, message) {
			if (err)
				return socket.send(Codec.encode("error"));
			if (message)
				return socket.send(Codec.encode("error", {message: message}));
		});
	});
});
socketServer.run();

process.on("uncaughtException", function(err) {
    console.log("#########");
    console.log(err.stack);
});
