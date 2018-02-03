var Logic = function(socketServer) {
	this.Redis = require("../data/Redis");
	this.Codec = require("../web/Codec");
	this.Util = require("util");
	this.ReadLine = require("readline");
	this.fs = require("fs");
	this.redis = new this.Redis();
	this.socket = socketServer;
	this.gameTime = 30 * 60 *1000; // 30 minutes
	this.turnTime = 3 * 60 *1000; // 3 minutes
	this.turnTimer;
	this.blankBoard = [
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
		["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
	];
	this.boardModifiers = [
		["3W", "0", "0", "2L", "0", "0", "0", "3W", "0", "0", "0", "2L", "0", "0", "3W"],
		["0", "2W", "0", "0", "0", "3L", "0", "0", "0", "3L", "0", "0", "0", "2W", "0"],
		["0", "0", "2W", "0", "0", "0", "2L", "0", "2L", "0", "0", "0", "2W", "0", "0"],
		["2L", "0", "0", "2W", "0", "0", "0", "2L", "0", "0", "0", "2W", "0", "0", "2L"],
		["0", "0", "0", "0", "2W", "0", "0", "0", "0", "0", "2W", "0", "0", "0", "0"],
		["0", "3L", "0", "0", "0", "3L", "0", "0", "0", "3L", "0", "0", "0", "3L", "0"],
		["0", "0", "2L", "0", "0", "0", "2L", "0", "2L", "0", "0", "0", "2L", "0", "0"],
		["3W", "0", "0", "2L", "0", "0", "0", "2W", "0", "0", "0", "2L", "0", "0", "3W"],
		["0", "0", "2L", "0", "0", "0", "2L", "0", "2L", "0", "0", "0", "2L", "0", "0"],
		["0", "3L", "0", "0", "0", "3L", "0", "0", "0", "3L", "0", "0", "0", "3L", "0"],
		["0", "0", "0", "0", "2W", "0", "0", "0", "0", "0", "2W", "0", "0", "0", "0"],
		["2L", "0", "0", "2W", "0", "0", "0", "2L", "0", "0", "0", "2W", "0", "0", "2L"],
		["0", "0", "2W", "0", "0", "0", "2L", "0", "2L", "0", "0", "0", "2W", "0", "0"],
		["0", "2W", "0", "0", "0", "3L", "0", "0", "0", "3L", "0", "0", "0", "2W", "0"],
		["3W", "0", "0", "2L", "0", "0", "0", "3W", "0", "0", "0", "2L", "0", "0", "3W"]
	];
	this.baseTiles = {
		a: 9,
		b: 2,
		c: 2,
		d: 4,
		e: 12,
		f: 2,
		g: 3,
		h: 2,
		i: 9,
		j: 1,
		k: 1,
		l: 4,
		m: 2,
		n: 6,
		o: 8,
		p: 2,
		q: 1,
		r: 6,
		s: 4,
		t: 6,
		u: 4,
		v: 2,
		w: 2,
		x: 1,
		y: 2,
		z: 1,
		blank: 0 // TODO [2]
	};
	this.tilePoints = {
		a: 1,
		b: 3,
		c: 3,
		d: 2,
		e: 1,
		f: 4,
		g: 2,
		h: 4,
		i: 1,
		j: 8,
		k: 5,
		l: 1,
		m: 3,
		n: 1,
		o: 1,
		p: 3,
		q: 10,
		r: 1,
		s: 1,
		t: 1,
		u: 1,
		v: 4,
		w: 4,
		x: 8,
		y: 4,
		z: 10,
		blank: 0
	};
};

Logic.prototype.getOpenGame = function(player, size, id, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (data === null || data.length == 0)
			return callback(null, -1);
		for (var i = 0; i < data.length; i++) {
			var isOpen = data[i].open;
			var correctSize = size == -1 ? true : data[i].maxPlayers == size;
			var correctId = id == -1 ? true : data[i].id === id;
			if (isOpen && correctSize && correctId) {
				data[i].players.push(player);
				// Game start
				if (data[i].players.length == data[i].maxPlayers) {
					// Close game
					data[i].open = false;
					// set start time
					data[i].startTime = Date.now();
					// Send players their individual data
					for (var j = 0; j < data[i].players.length; j++) {
						// set rack
						var p = data[i].players[j];
						var rt = getFilledRack(data[i].rack[j], data[i].tiles);
						data[i].rack[j] = rt.rack;
						data[i].tiles = rt.tiles;
						// set time
						data[i].time[data[i].players[j]] = data[i].startTime;
						// set name
						data[i].name[data[i].players[j]] = j == 0 ? "Twitch" : "Beam";
						// set score
						data[i].score[data[i].players[j]] = 0;
						// set rack pos
						data[i].rackPos[j] = [];
					}
				}
				// Save
				that.redis.set("games", data);
				return callback(null, data[i].id);
			}
		}
		return callback(null, -1);
	});
};

Logic.prototype.broadcastGameState = function(callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (data === null || data.length == 0 || err)
			return;
		// game index
		var game = 0;
		that.socket.broadcast(that.Codec.encode("rack", {rack: data[game].rack[0], id: 0}));
		that.socket.broadcast(that.Codec.encode("rack", {rack: data[game].rack[1], id: 1}));
		that.socket.broadcast(that.Codec.encode("rackPos", data[game].rackPos));
		that.socket.broadcast(that.Codec.encode("board", data[game].board));
		sendPlayers(that, data[game]);
		that.socket.broadcast(that.Codec.encode("turn", {player: data[game].players[0]}));
	});
};

function sendPlayers(that, game) {
	var players = {};
	game.players.forEach(function(p) {
		players[p] = {};
		players[p].name = game.name[p];
		players[p].score = game.score[p];
		players[p].time = that.gameTime - (game.time[p] - game.startTime); // 10 - time diff
	});
	that.socket.broadcast(that.Codec.encode("players", players));
}

function getFilledRack(rack, tiles) {
	var letters = "abcdefghijklmnopqrstuvwxyz";
	var total = 0;
	for (var key in tiles)
		total += tiles[key];
	if (total == 0)
		return {rack: rack, tiles: tiles};
	if (typeof rack === "undefined")
		rack = [];
	var rackSize = rack.length;
	for (var i = 0; i < 7 - rackSize; i++) {
		var seek = true;
		while (seek) {
			var index = Math.floor(Math.random() * 28);
			var key = index < 26 ? letters[index] : "blank" ;
			if (tiles[key] > 0) {
				seek = false;
				tiles[key]--;
				rack.push(key);
			}
		}
	}
	return {rack: rack, tiles: tiles};
}

Logic.prototype.createNewLobby = function(player, size, id, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (data === null)
			data = [];
		var game = {
			id: id == -1 ? getId(data) : id,
			players: [player],
			open: true,
			maxPlayers: size,
			board: that.blankBoard,
			score: {},
			rack: [],
			rackPos: [],
			tiles: that.baseTiles,
			turn: 0,
			time: {},
			name: {},
			lastSix: []
		};
		data.push(game);
		that.redis.set("games", data);
		return callback();
	});
};

Logic.prototype.createGame = function(size, id, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// check if game is in redis cache
		var found = false;
		if (typeof data !== "undefined" && data !== null)
			for (var i = 0; i < data.length; i++)
				if (data[i].id == id)
					found = true;
		//  create new game if not found
		if (!found)
			that.createNewLobby(0, size, id, function() {
				that.getOpenGame(1, size, id, function(err, gameId) {
					startNewGame(that);
					return callback(null);
				});
			});
		else {
			startNewGame(that);
			return callback(null);
		}
	});
};

function startNewGame(that) {
	// broadcast and start turn timer
	that.broadcastGameState();
	that.socket.broadcast(that.Codec.encode("log", {message: "New game started."}));
	clearInterval(that.turnTimer);
	that.turnTimer = setInterval(function() {
		that.startNextTurn(0, 0);
	}, that.turnTime);
}

function getId(games) {
	var id = Math.random();
	while (isIdUsed(id, games))
		id = Math.random();
	return id.toString();
}

function isIdUsed(id, games) {
	for (var i = 0; i < games.length; i++) {
		if (games[i].id === id)
			return true;
	}
	return false;
}

Logic.prototype.checkBoardPush = function(player, proposedBoard, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// check turn
		if (player != data[game].players[data[game].turn])
			return callback(null, false, "Your turn, it is not.");
		// changed tiles
		var changed = [];
		for (var i = 0; i < data[game].board.length; i++) {
			for(var j = 0; j < data[game].board[i].length; j++) {
				if (data[game].board[i][j] !== proposedBoard[i][j] && data[game].board[i][j] === "")
					changed.push([i, j]);
			}
		}
		if (changed.length < 1)
			return callback(null, false, "No word has been played.");
		// check letters used are available to the player
		for (var i = 0; i < changed.length; i++)
			if (data[game].rack[data[game].players.indexOf(player)].indexOf(proposedBoard[changed[i][0]][changed[i][1]].toLowerCase()) == -1)
				return callback(null, false, "You dirty cheater.");
		// line check
		var horizontal = true;
		var vertical = true;
		for (var i = 0; i < changed.length; i++) {
			if (changed[0][0] != changed[i][0])
				horizontal = false;
			if (changed[0][1] != changed[i][1])
				vertical = false;
		}
		if ((!horizontal) && (!vertical))
			return callback(null, false, "Tiles must be in a line.");
		// check middle tile (only really needed on first turn)
		if (proposedBoard[7][7] === "")
			return callback(null, false, "Start in the middle! k thx bai");
		// word check
		var words = [];
		for (var i = 0; i < changed.length; i++) {
			var ws = [["", "h", 0], ["", "v", 0]]; // word, direction, points
			// horizontal
			var left, right;
			var index = changed[0][1];
			while(index > -1 && proposedBoard[changed[i][0]][index] !== "")
				index--;
			left = ++index;
			while (index < 15 && proposedBoard[changed[i][0]][index] !== "")
				index++;
			right = --index;
			var w2 = 0;
			var w3 = 0;
			for (var j = left; j < right + 1; j++) {
				ws[0][0] += proposedBoard[changed[i][0]][j];
				var isNew = data[game].board[changed[i][0]][j] === "";
				ws[0][2] += that.tilePoints[ws[0][0][ws[0][0].length - 1].toLowerCase()] 
					* (isNew && that.boardModifiers[changed[i][0]][j] === "2L" ? 2 : 1)
					* (isNew && that.boardModifiers[changed[i][0]][j] === "3L" ? 3 : 1);
				if (isNew && that.boardModifiers[changed[i][0]][j] === "2W")
					w2++;
				if (isNew && that.boardModifiers[changed[i][0]][j] === "3W")
					w3++;
			}
			for (var j = 0; j < w2; j++)
				ws[0][2] *= 2;
			for (var j = 0; j < w3; j++)
				ws[0][2] *= 3;
			// vertical
			var top, bottom;
			var index = changed[0][0];
			while(index > -1 && proposedBoard[index][changed[i][1]] !== "")
				index--;
			top = ++index;
			while (index < 15 && proposedBoard[index][changed[i][1]] !== "")
				index++;
			bottom = --index;
			w2 = 0;
			w3 = 0;
			for (var j = top; j < bottom + 1; j++) {
				ws[1][0] += proposedBoard[j][changed[i][1]];
				var isNew = data[game].board[j][changed[i][1]]=== "";
				ws[1][2] += that.tilePoints[ws[1][0][ws[1][0].length - 1].toLowerCase()] 
					* (isNew && that.boardModifiers[j][changed[i][1]] === "2L" ? 2 : 1)
					* (isNew && that.boardModifiers[j][changed[i][1]] === "3L" ? 3 : 1);
				if (isNew && that.boardModifiers[j][changed[i][1]] === "2W")
					w2++;
				if (isNew && that.boardModifiers[j][changed[i][1]] === "3W")
					w3++;
			}
			for (var j = 0; j < w2; j++)
				ws[1][2] *= 2;
			for (var j = 0; j < w3; j++)
				ws[1][2] *= 3;
			// add words
			words.push(ws[0]);
			words.push(ws[1]);
		}
		// Clean words
		var remove = [];
		var seen = [];
		for (var i = 0; i < words.length; i++)
			if (words[i][0].length < 2 || seen.indexOf(words[i][0] + words[i][1]) > -1)
				remove.push(i);
			else
				seen.push(words[i][0] + words[i][1]);
		for (var i = 0; i < remove.length; i++)
			words.splice(remove[i] - i, 1);
		if (words.length < 1)
			return callback(null, false, "No valid word played.");
		// valid word
		areWordsValid(that, words, function(valid, firstInvalid) {
			if (!valid)
				return callback(null, false, "\"" + firstInvalid + "\" " + "is not a valid word.");
			else {
				data[game].board = proposedBoard;
				// update rack
				var pid = data[game].players.indexOf(player);
				for (var i = 0; i < changed.length; i++)
					data[game].rack[pid].splice(data[game].rack[pid].indexOf(proposedBoard[changed[i][0]][changed[i][1]].toLowerCase()), 1);
				// clear conflicting rackPos
				for (var i = 0; i < data[game].maxPlayers; i++)
					for (var j = 0; j < changed.length; j++) {
						inner:
						for (var key in data[game].rackPos[i]) {
							var pos = data[game].rackPos[i][key];
							if (pos.x == changed[j][1] && pos.y == changed[j][0]) {
								data[game].rackPos[i].splice(key, 1);
								break inner;
							}
						}
					}
				// add points
				for (var i = 0; i < words.length; i++)
					data[game].score[player] += words[i][2];
				// save game
				that.redis.set("games", data);
				// send data
				that.socket.broadcast(that.Codec.encode("board", data[game].board));
				var message = data[game].name[player] + " played: ";
				var turnPoints = 0;
				for (var i = 0; i < words.length; i++) {
					message += words[i][0] + " [" + words[i][2] + "], ";
					turnPoints += words[i][2];
				}
				message = message.replace(/, $/, "") + ".";
				that.socket.broadcast(that.Codec.encode("log", {message: message}));
				return callback(null, true, null, turnPoints);
			}
		});
	});
};

function areWordsValid(that, words, callback, index) {
	index = (typeof index === "undefined") ? 0 : index; 
	isWordValid(that, words[index][0], function(valid) {
		if (!valid)
			return callback(false, words[index][0]);
		if (index == words.length - 1)
			return callback(true);
		else
			areWordsValid(that, words, callback, ++index);
	});
}

function isWordValid(that, word, callback) {
	if (!/[a-z]/.test(word.toLowerCase()))
		return callback(false);
	var lineReader;
	try {
		lineReader = that.ReadLine.createInterface({
			input: that.fs.createReadStream("src/resources/eowl/" + word[0].toLowerCase() + ".txt")
		});
	} catch(e) {
		return callback(false);
	}
	var found = false;
	lineReader.on("line", function(line) {
		if (line === word.toLowerCase())
			found = true;
	});
	lineReader.on("close", function() {
		callback(found);
	});
}

Logic.prototype.checkWord = function(player, word) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// check word
		isWordValid(that, word, function(valid) {
			var playerName = "[Word Lookup] " + data[game].name[player];
			if (valid)
				that.socket.broadcast(that.Codec.encode("chat", {
					message: playerName + " managed to construct a valid string of characters."
				}));
			else
				that.socket.broadcast(that.Codec.encode("chat", {
					message: playerName + " looked up a random string of gibberish."
				}));
		});
	});
};

Logic.prototype.startNextTurn = function(player, points, callback) {
	callback = typeof callback === "undefined" ? function() {} : callback;
	var that = this;
	clearInterval(this.turnTimer);
	this.turnTimer = setInterval(function() {
		that.startNextTurn(player == 0 ? 1 : 0, 0);
	}, that.turnTime);
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// check turn
		if (data[game].players[data[game].turn] != player)
			return callback(null, "Do not skip your opponent's turn, you maniac.");
		// update rack
		var pid = data[game].players.indexOf(player);
		var rt = getFilledRack(data[game].rack[pid], data[game].tiles);
		data[game].rack[pid] = rt.rack;
		data[game].tiles = rt.tiles;
		// update player time
		data[game].time[player] = Date.now();
		for (var i = 0; i < data[game].players.length; i++)
			if (data[game].players[i] != player)
				data[game].time[player] -= data[game].time[data[game].players[i]] - data[game].startTime;
		// set turn
		data[game].turn = data[game].turn == data[game].players.length - 1
			? 0 : data[game].turn + 1;
		// update last six scores
		data[game].lastSix.push(points);
		if (data[game].lastSix.length > 6)
			data[game].lastSix.splice(0, 1);
		// send data
		that.socket.broadcast(that.Codec.encode("rack", {rack: data[game].rack[pid], id: player}));
		that.socket.broadcast(that.Codec.encode("rackPos", data[game].rackPos));
		sendPlayers(that, data[game]);
		that.socket.broadcast(that.Codec.encode("turn", {
			player: data[game].players[data[game].turn]
		}));
		var message = data[game].name[player] + " ended their turn for " + points + " points.";
		that.socket.broadcast(that.Codec.encode("log", {message: message}));
		// save data
		that.redis.set("games", data);
		// check end
		that.checkEnd(player, function(err) {
			return callback(null);
		});
	});
};

Logic.prototype.checkEnd = function(player, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		if (typeof game === "undefined") {
			that.socket.broadcast(that.Codec.encode("end", {winner: -1}));
			return callback(null);
		}
		// check out (clean rack) end
		for (var i = 0; i < data[game].rack.length; i++) {
			if (data[game].rack[i].length == 0) {
				doEnd(that, data[game]);
				return callback(null);
			}
		}
		// check 6 0-point turns
		var zeroes = 0;
		for (var i = 0; i < data[game].lastSix.length; i++)
			if (data[game].lastSix[i] == 0)
				zeroes++;
		if (zeroes == 6) {
			doEnd(that, data[game]);
			return callback(null);
		}
		// check time end
		for (var i = 0; i < data[game].players.length; i++) {
			var time = Date.now();
			for (var j = 0; j < data[game].players.length; j++)
				if (data[game].players[j] != player)
					time -= data[game].time[data[game].players[i]] - data[game].startTime;
			if (time - data[game].startTime > that.gameTime) {
				data[game].time[data[game].players[i]] = data[game].startTime + that.gameTime;
				doEnd(that, data[game]);
				return callback(null);
			}
		}
		return callback(null);
	});
};

function doEnd(that, game, disconnected) {
	clearInterval(that.turnTimer);
	if (!game.open) {
		// calculate player in lead
		var winning = -1;
		for (var i = 0; i < game.players.length; i++) {
			// adjust remaining tiles into score
			var modifier = 0;
			for (var j = 0; j < game.rack[i].length; j++)
				modifier -= that.tilePoints[game.rack[i][j].toLowerCase()];
			if (game.rack[i].length == 0)
				for (var j = 0; j < game.players.length; j++)
					for (var k = 0; k < game.rack[j].length; k++)
						modifier += that.tilePoints[game.rack[j][k].toLowerCase()];
			// check score against winning
			game.score[game.players[i]] += modifier;
			if (winning == -1 || game.score[game.players[i]] > game.score[winning])
				winning = game.players[i];
		}
		// send winner
		if (disconnected)
			that.socket.broadcast(that.Codec.encode("log", {
				message: "A player has disconnected."
			}));
		sendPlayers(that, game);
		that.socket.broadcast(that.Codec.encode("end", {winner: winning}));
		var message = game.name[winning] + " has won the game.";
		that.socket.broadcast(that.Codec.encode("log", {message: message}));
	}
	// delete game
	that.redis.get("games", function(err, data) {
		if (err)
			data = [];
		var index;
		for (var i = 0; i < data.length; i++)
			if (data[i].id == game.id)
				index = i;
		data.splice(index);
		that.redis.set("games", data);
		// Start a new game
        if (process.env.GAME_DAEMON === "true") {
            console.log("Starting game");
            createGame(size, id, function (err) {
            	if (err) {
                    console.log(err);
                    process.exit(1);
                }
            });
        }
	});
}

Logic.prototype.endGame = function(player) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				doEnd(that, data[i], true);
	});
};

Logic.prototype.swapTiles = function(player, swap, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// remove matching tiles
		var pid = data[game].players.indexOf(player);
		var size = data[game].rack[pid].length;
		for (var i = 0; i < swap.length; i++) {
			var index = data[game].rack[pid].indexOf(swap[i].toLowerCase());
			if (index > -1)
				data[game].rack[pid].splice(index, 1);
		}
		if (data[game].rack[pid].length == size)
			return callback("Not found in rack.");
		data[game].rackPos[player] = [];
		var message = data[game].name[player] + " swapped " + (swap.length) + " tiles.";
		if (data[game].players[data[game].turn] == player) // their turn
			that.socket.broadcast(that.Codec.encode("log", {message: message}));
		// save
		that.redis.set("games", data);
		return callback(null);
	});
};

Logic.prototype.getNewId = function(callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (data === null)
			data = [];
		if (err)
			return callback(err);
		return callback(null, getId(data));
	});
};

Logic.prototype.sendChat = function(player, message) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// clean message
		message = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		message = data[game].name[player] + ": " + message;
		//send
		that.socket.broadcast(that.Codec.encode("chat", {message: message}));
	});
};

Logic.prototype.submitTilePosition = function(player, x, y, letter, chatName, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
		if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
			return callback("Game restarting");
		// check if tile is in rack
		var pid = data[game].players.indexOf(player);
		var count = 0;
		data[game].rack[pid].forEach(function(l) {
			if (l.toLowerCase() === letter.toLowerCase()) 
				count++;
		});
		if (count == 0)
			return callback("Tile \"" + letter.toUpperCase() + "\" not available.");
		var boardCount = 0; // amount pending on board
		data[game].rackPos[player].forEach(function(tile) {
			if (tile.l.toLowerCase() === letter.toLowerCase())
				boardCount++;
		});
		// check if space is free on board and pending
		var pendingFilled = false;
		data[game].rackPos[player].forEach(function(tile) {
			if (tile.x == x && tile.y == y)
				pendingFilled = true;
		});
		if (data[game].board[y][x] !== "" || pendingFilled)
			return callback("Slot filled.");
		// set position
		var set = false;
		for (var i = 0; i < data[game].rack[pid].length; i++) {
			if (data[game].rack[pid][i].toLowerCase() === letter.toLowerCase())
				if (count - boardCount >= 1) {
					data[game].rackPos[player].push({l: letter.toLowerCase(), x: x, y: y});
					set = true;
					break;
				}
		}
		if (!set)
			return callback("No playable tile in rack. Try removing tiles from the board first.");
		// save
		that.redis.set("games", data);
		that.socket.broadcast(that.Codec.encode("chat", {
			message: chatName + ": " + x + "-" + y + " " + letter,
			player: player
		}));
		that.socket.broadcast(that.Codec.encode("rackPos", data[game].rackPos));
		return callback(null);
	});
};

Logic.prototype.removeTile = function(player, x, y, chatName, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// remove tile from pending if found
		var index = -1;
		data[game].rackPos[player].forEach(function(tile) {
			if (tile.x == x && tile.y == y)
				index = data[game].rackPos[player].indexOf(tile);
		});
		if (index < 0)
			return callback("No tile to remove.");
		data[game].rackPos[player].splice(index, 1);
		// save
		that.redis.set("games", data);
		that.socket.broadcast(that.Codec.encode("chat", {
			message: chatName + ": remove " + x + "-" + y,
			player: player
		}));
		that.socket.broadcast(that.Codec.encode("rackPos", data[game].rackPos));
		return callback(null);
	});
};

Logic.prototype.submitTurn = function(player, chatName, callback) {
	var that = this;
	this.redis.get("games", function(err, data) {
		if (err)
			return callback(err);
		// game index
		var game;
		for (var i = 0; i < data.length; i++)
			if (data[i].players.indexOf(player) > -1)
				game = i;
        if (data[game] === null || typeof data[game] === "undefined" || data.length === 0)
            return callback("Game restarting");
		// submit board push
		var proposedBoard = JSON.parse(JSON.stringify(data[game].board));
		data[game].rackPos[player].forEach(function(tile) {
			if (typeof tile !== "undefined" && tile !== null)
				proposedBoard[tile.y][tile.x] = tile.l.toUpperCase();
		});
		that.checkBoardPush(player, proposedBoard, function(err, accepted, rejectMessage, points) {
			if (err)
				return callback("An error occurred.");
			if (!accepted)
				return callback(rejectMessage);
			// log chat message
			that.startNextTurn(player, points, function(err, rejectMessage) {
				if (typeof rejectMessage === "undefined")
					that.socket.broadcast(that.Codec.encode("chat", {
						message: chatName + ": submit",
						player: player
					}));
				return callback(rejectMessage);
			});
		});
	});
};

Logic.prototype.swapTile = function(player, letter, chatName, callback) {
	var that = this;
	this.swapTiles(player, [letter], function(err) {
		if (err)
			return callback(err);
		that.startNextTurn(player, 0, function(err, rejectMessage) {
			if (typeof rejectMessage === "undefined")
				that.socket.broadcast(that.Codec.encode("chat", {
					message: chatName + ": swap " + letter,
					player: player
				}));
			return callback(rejectMessage);
		});
	});
};

module.exports = Logic;