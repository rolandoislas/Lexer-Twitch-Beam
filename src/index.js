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
webServer.addGet("/random/:size", function(req, res, next) {
	req.params.size = parseInt(req.params.size);
	if ((!Number.isInteger(req.params.size)) || req.params.size < 1 || req.params.size > 4)
		return next();
	res.render("pages/game", {
		title: "",
		description: "Join a random game of Lexer.",
		size: req.params.size
	});
});
webServer.addGet("/create/:size/:id", function(req, res, next) {
	req.params.size = parseInt(req.params.size);
	if ((!Number.isInteger(req.params.size)) || req.params.size < 1 || req.params.size > 4)
		return next();
	res.render("pages/game", {
		title: "",
		description: "Join a random game of Lexer.",
		size: req.params.size,
		id: req.params.id
	});
});
webServer.addGet("/join/:id", function(req, res, next) {
	res.render("pages/game", {
		title: "",
		description: "Join a random game of Lexer.",
		id: req.params.id
	});
});

var socketServer = new Socket(webServer.run());
var logic = new Logic(socketServer);
webServer.addGetLive("/ajax/getId", function(req, res, next) {
	logic.getNewId(function(err, id) {
		if (err)
			res.status(500).json(err);
		res.json({id: id});
	});
});
socketServer.addCommand("requestGame", function(socket, command) {
	logic.getOpenGame(socket.id, command.data.size, command.data.id, function(err, id) {
		if (err)
			return socket.send(Codec.encode("error"));
		if (command.size == -1 && id == -1 && command.data.id != -1)
			return socket.send(Codec.encode("error", {message: "Game not found."}));
		if (id == -1)
			logic.createNewLobby(socket.id, command.data.size, command.data.id, function(err) {
				if (err)
					return socket.send(Codec.encode("error", {message: err.message}));
				socket.send(Codec.encode("waitForGame"));
			});
		else
			socket.send(Codec.encode("waitForGame"));
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
