var Http = require("./web/Http");
var Socket = require("./web/Socket");
var Codec = require("./web/Codec");
var Logic = require("./game/Logic");
var Redis = require("./data/Redis");
var Twitch = require("./web/api/Twitch");
var Beam = require("./web/api/Beam");
var redis = new Redis();

var port = process.env.PORT;
var id = "TwitchBeam";
var size = 2;

var webServer = new Http(port);
webServer.addGet("/", function(req, res) {
	res.render("pages/index", {
		title: "",
		description: "A word game built with web sockets and JavaScript."
	});
});
webServer.addGet("/beam", function(req, res, next) {
	res.render("pages/game", {
		title: "Team Beam",
		description: "Watch Lexer on team Beam.",
		size: size,
		id: id
	});
});
webServer.addGet("/twitch", function(req, res, next) {
	res.render("pages/game", {
		title: "Team Twitch",
		description: "Watch Lexer on team Twitch.",
		size: size,
		id: id
	});
});
webServer.addGet("/control", function(req, res, next) {
	res.render("pages/control", {
		title: "Control Panel",
		description: "",
		size: size,
		id: id,
		beamUser: process.env.BEAM_USERNAME,
		twitchUser: process.env.TWITCH_USERNAME
	});
});

var socketServer = new Socket(webServer.run());
var logic = new Logic(socketServer);
var twitch = new Twitch(logic);
var beam = new Beam(logic);
socketServer.addCommand("requestGame", function(socket, command) {
	logic.broadcastGameState();
});
socketServer.addCommand("auth", function(socket, command) {
	if (command.data.auth.toString() === process.env.AUTH)
		socket.auth = true;
});
socketServer.addCommand("createGame", function(socket, command) {
	if (socket.auth == null || typeof socket.auth === "undefined" || !socket.auth)
		return;
	createGame();
});
socketServer.run();

process.on("uncaughtException", function(err) {
    console.log("#########");
    console.log(err.stack);
    process.exit(1);
});

/**
 * Start the game
 */
function createGame() {
	console.log("Starting game");
    logic.createGame(size, id, function(err) {
        if (err) {
            console.log(err);
            process.exit(1)
        }
        twitch.enableChatControl(0);
        beam.enableChatControl(1);
    });
}

if (process.env.GAME_DAEMON === "true")
	createGame();
