!function() {
	
	var width = 600;
	var height = 650;
	var boardWidth = width;
	var boardHeight = boardWidth;
	
	$(document).ready(function() {
		Crafty.init(width, height, $(".game")[0]);
		Crafty.defineScene("game", loadGame);
		Crafty.enterScene("game");
	});
	
	/* ======================= GAME ======================= */
	var baseBoard = [
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
	var tilePoints = {
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
	var socket;
	var isWaiting = true;
	var waitMessageId;
	var playerId;
	var turn;
	var rack;
	var rackData;
	var backBoard;
	var board;
	var boardIds;
	var z = 1000000;
	var buttons = {};
	var infoText;
	var clock;
	var turnId;
	var endClock;
	var swapping;
	var swapMessageId;
	var pingClock;
	
	function loadGame() {
		createBackground();
		createButtons();
		connectToServer();
		addEvents();
	}
	
	function addEvents() {
		$(".wordCheckSubmit").on("click", checkWord);
		$(".wordCheckInput").on("keypress", checkWord);
	}
	
	function checkWord(e) {
		if (e.type === "keypress" && e.which != 13)
			return;
		var word = $(".wordCheckInput").val();
		socket.send(Codec.encode("checkWord", {word: word}));
	}
	
	function createButtons() {
		infoText = Crafty.e("2D, DOM, Text")
			.attr({x: width - 50, y: height - 12}).getId();
			
		buttons.submit = createTile(">", 0, boardHeight, "undefined", "rgb(204, 204, 204)").getId();
		Crafty(buttons.submit).x = boardWidth - Crafty(buttons.submit).w;
		Crafty(buttons.submit).bind("Click", submit);
		Crafty(buttons.submit).name = "Submit";
		
		buttons.recall = createTile("^", 0, boardHeight, "undefined", "rgb(204, 204, 204)").getId();
		Crafty(buttons.recall).x = boardWidth - Crafty(buttons.submit).w * 2;
		Crafty(buttons.recall).origin("center");
		Crafty(buttons.recall).rotation = 180;
		Crafty(buttons.recall).bind("Click", drawRack);
		Crafty(buttons.recall).name = "Recall";
		
		buttons.skip = createTile("[ ]", 0, boardHeight, "undefined", "rgb(204, 204, 204)").getId();
		Crafty(buttons.skip).x = boardWidth - Crafty(buttons.skip).w * 3;
		Crafty(buttons.skip).bind("Click", function(e) {
			socket.send(Codec.encode("skipTurn"));
		});
		Crafty(buttons.skip).name = "Skip";
		
		buttons.swap = createTile(")(", 0, boardHeight, "undefined", "rgb(204, 204, 204)").getId();
		Crafty(buttons.swap).x = boardWidth - Crafty(buttons.skip).w * 4;
		Crafty(buttons.swap).bind("Click", displaySwapGui);
		Crafty(buttons.swap).name = "Swap";
		
		for (var key in buttons) {
			Crafty(buttons[key]).bind("MouseOver", function() {
				setInfoText(typeof this.name === "undefined" ? "" : this.name);
			});
			Crafty(buttons[key]).bind("MouseOut", function() {
				Crafty(infoText).text("");
			});
		}
	}
	
	function displaySwapGui() {
		if (!swapping) {
			console.log("start swap");
			swapping = true;
			drawRack(false);
			disableRack();
			rack.forEach(function(id) {
				Crafty(id).bind("Click", function() {
					this.color(this.color() === "rgba(255, 0, 0, 1)" ? "rgb(237, 221, 175)" : "rgb(255, 0, 0)");
				});
			});
			var message = "Click the tiles in your rack you wish to swap.<br>"
				+ "Click the swap button to confirm.<br>"
				+ "Click this message to cancel.";
			swapMessageId = displayMessage(message, function() {
				swapping = false;
				drawRack();
				this.destroy();
			}).getId();
		} else {
			var swap = [];
			rack.forEach(function(id) {
				var tile = Crafty(id);
				if (tile.color() === "rgba(255, 0, 0, 1)")
					swap.push(tile.text() === "" ? "blank" : tile.text());
			});
			socket.send(Codec.encode("swap", swap));
			swapping = false;
			drawRack();
			Crafty(swapMessageId).destroy();
		}
	}
	
	function setInfoText(text) {
		Crafty(infoText).text(text);
	}
	
	function submit() {
		disableRack();
		var proposedBoard = JSON.parse(JSON.stringify(board));
		rack.forEach(function(id) {
			var tile = Crafty(id);
			if (tile.y < boardHeight) {
				var line = 15 - Math.floor((boardHeight - tile.y) / tile.h);
				var letter = 15 - Math.floor((boardWidth - tile.x) / tile.w);
				proposedBoard[line][letter] = tile.text();
			}
		});
		socket.send(Codec.encode("boardPush", proposedBoard));
	}
	
	function disableRack() {
		rack.forEach(function(id) {
			Crafty(id).disableDrag();
		});
	}
	
	function enableRack() {
		rack.forEach(function(id) {
			Crafty(id).enableDrag();
		});
	}
	
	function connectToServer() {
		socket = new WebSocket(location.protocol.replace("http", "ws") + "//" 
			+ location.hostname + (location.port ? ":" + location.port : ""), "protocolOne");
		socket.onopen = function(event) {
			socket.send(Codec.encode("requestGame", {
				size: typeof size === "undefined" ? -1 : size,
				id: typeof id === "undefined" ? -1 : id
			}));
		};
		socket.onclose = function(event) {
			var p = $("<p>");
			p.html("Disconnected from server.");
			$(".log").append(p);
			$(".log")[0].scrollTop = $(".log")[0].scrollHeight;
		};
		socket.onmessage = function(event) {
			console.log(event.data);
			var command = Codec.decode(event.data);
			if (command.type === "waitForGame") {
				pingClock = setInterval(ping, 20000);
				if (isWaiting) {
					var message = displayMessage("Waiting for opponent.<br>" + getJoinMessage(), function(e) {
						if (!isWaiting)
							this.destroy();
					});
					waitMessageId = message.getId();
				}
			} else if (command.type === "start") {
				playerId = command.data.id;
				isWaiting = false;
				if (typeof waitMessageId !== "undefined") {
					Crafty(waitMessageId).destroy();
					waitMessageId = "undefined";
				}
			} else if (command.type === "turn") {
				clock = setInterval(decrementActivePlayerTime, 1000);
				turnId = command.data.player;
				turn = command.data.player == playerId;
				if (turn)
					displayClickDestructMessage("It's your turn.", 10000);
			} else if (command.type === "rack") {
				rackData = command.data;
				drawRack();
			} else if (command.type === "board") {
				board = command.data;
				drawBoard();
			} else if (command.type === "rejectPush") {
				displayClickDestructMessage(command.data.reason, 10000);
				enableRack();
			} else if (command.type === "error") {
				displayClickDestructMessage(command.data.message, 10000);
			} else if (command.type === "log") {
				var p = $("<p>");
				p.html(command.data.message);
				$(".log").append(p);
				$(".log")[0].scrollTop = $(".log")[0].scrollHeight;
			} else if (command.type === "players") {
				clearInterval(clock);
				$(".players").html("");
				for (var key in command.data) {
					var div = $("<div>").data("id", key);
					div.append($("<span>").html(command.data[key].name)); //name
					div.append($("<span>", {"class": "stat"}).html(command.data[key].score)); // score
					var time = new Date(command.data[key].time);
					div.append($("<span>", {"class": "stat"}).html(time.getMinutes() + ":" + 
					(time.getSeconds() > 9 ? "" : "0") + time.getSeconds())); // time
					$(".players").append(div);
				}
			} else if (command.type === "end") {
				clearInterval(endClock);
				clearInterval(pingClock);
				var message = "";
				if (command.data.winner === playerId)
					message = "You have won the game."
				else
					message = "The game is over loser.";
				if (command.data.winner > -1)
					displayClickDestructMessage(message, 10000);
			}
		};
	}
	
	function ping() {
		socket.send(Codec.encode("ping"));
	}
	
	function getJoinMessage() {
		if (location.pathname.split("/")[1] !== "create")
			return "";
		var message = "Join link:<br>";
		message += "<input onClick=\"this.select()\" readonly value=\""
		message += location.origin + "/join/" + location.pathname.split("/")[3];
		message += "\">";
		return message;
	}
	
	function decrementActivePlayerTime() {
		$(".players > div").each(function() {
			if ($(this).data("id") == turnId) {
				var timeString = $($(this).children("span")[2]).html();
				var min = Number.parseInt(timeString.substr(0, timeString.indexOf(":"))) * 60 * 1000;
				var sec = Number.parseInt(timeString.substr(timeString.indexOf(":") + 1, timeString.length - 1))
					* 1000;
				var time = new Date(min + sec - 1000);
				if (time <= 0) {
					clearInterval(clock);
					socket.send(Codec.encode("checkEnd"));
					endClock = setInterval(function() {
						socket.send(Codec.encode("checkEnd"));
					}, 5000);
				}
				$($(this).children("span")[2]).html(time.getMinutes() + ":" 
					+ (time.getSeconds() > 9 ? "" : "0") + time.getSeconds());
			}
		});
	}
	
	function drawBoard() {
		if (typeof boardIds !== "undefined")
			boardIds.forEach(function(id) {
				Crafty(id).destroy();
			});
		boardIds = [];
		var temp = createTile("");
		for (var i = 0; i < board.length; i++) {
			for (var j = 0; j < board[i].length; j++) {
				if (board[i][j].length > 0) {
					var x = temp.w * j + temp.w / 2 + 10;
					var y = temp.h * i + temp.h / 2 + 10;
					var backTile = getEntitiesAtLocation(x, y)[0];
					var tile = createTile(board[i][j].replace("blank", ""), backTile.x, backTile.y)
						.css("border", "none");
					tile.bind("MouseUp", fadeAndReturn);
					tile.w = backTile.w;
					tile.h = backTile.h;
					boardIds.push(tile.getId());
				}
			}
		}
		temp.destroy();
	}
	
	function fadeAndReturn(e, point, down, that) {
		point = typeof point === "undefined" ? 1.0 : point;
		down = typeof down === "undefined" ? true : down;
		that = typeof that === "undefined" ? this : that;
		if (down)
			point -= .1;
		else
			point += .1;
		that.alpha = point;
		if (down && point <= 0.0)
			return setTimeout(function() {
				fadeAndReturn(e, 0.01, false, that);
			}, 1000);
		else if ((!down) && point >= 1.0)
			return;
		else
			return setTimeout(function() {
				fadeAndReturn(e, point, down, that);
			}, 25);	
	}
	
	function drawRack(position) {
		position = typeof position === "undefined" ? true : position;
		if (typeof rack !== "undefined")
			rack.forEach(function(id) {
				Crafty(id).destroy();
			});
		var temp = createTile("");
		var x = (height - boardHeight - temp.h) / 2;
		var y = boardHeight + x;
		temp.destroy();
		rack = [];
		rackData.forEach(function(letter) {
			var tile = createTile(letter.replace("blank", "").toUpperCase(), x, y);
			tile.enableDrag();
			if (position) {
				tile.bind("MouseUp", positionTileOnBoard);
				tile.bind("MouseDown", function(e) {
					this.css("border", "1px solid rgb(0, 0, 0)");
					this.z = ++z;
				});
			}
			rack.push(tile.getId());
			x += tile.w;
		});
	}
	
	function positionTileOnBoard(e) {
		var x = this.x + this.w / 2;
		var y = this.y + this.h / 2;
		var entities = getEntitiesAtLocation(x, y);
		if (entities.length <= 2 && entities.length > 1 && y <= boardHeight) {
			var backTile = entities[0];
			// Remove border and set proper size
			this.css("border", "none");
			this.x = backTile.x + (backTile.x == 0 ? 1 : 0);
			this.y = backTile.y + (backTile.y == 0 ? 1 : 0);
			this.w = backTile.w;
			this.h = backTile.h;
			this.color("rgb(204, 204, 204)");
		} else {
			this.css("border", "1px solid rgb(0, 0, 0)");
			this.color("rgb(237, 221, 175)");
			x = (height - boardHeight - this.h) / 2;
			y = boardHeight + x;
			for (var i = 0; i < 7; i++) {
				entities = getEntitiesAtLocation(x+10, y+10);
				if (entities.length == 0 || (entities.length == 1 && this === entities[0])) {
					this.x = x;
					this.y = y;
					break;
				}
				x += this.w;
			}
		}
	}
	
	function getEntitiesAtLocation(x, y) {
		var entityArray = [];
		Crafty("*").each(function() {
			if (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h)
				entityArray.push(this);
		});
		return entityArray;
	}
	
	function displayClickDestructMessage(message, time) {
		var m = displayMessage(message, function() {
			this.destroy();
		});
		if (typeof time !== "undefined")
			window.setTimeout(function() {
				m.destroy();
			}, time);
	}
	
	function displayMessage(message, callback) {
		var messageWidth = boardWidth * .7;
		var messageHeight = boardWidth * .21;
		var x = boardWidth / 2 - messageWidth / 2;
		var y = boardHeight / 2 - messageHeight / 2;
		var message = Crafty.e("2D, DOM, Color, Text, Mouse")
			.attr({x: x, y: y, w: messageWidth, h: messageHeight})
			.color("rgb(237, 221, 175)")
			.text("<br>" + message)
			.unselectable()
			.textFont({
				size: messageWidth * .05 + "px"
			})
			.css("text-align", "center");
		message.z = ++z;
		if (typeof callback !== "undefined")
			message.bind("Click", callback);
		return message;
	}
	
	function createBackground() {
		Crafty.background("rgb(204, 204, 204)");
		var tileSize = boardWidth / 15;
		var x = 0;
		var y = 0;
		backBoard = [];
		baseBoard.forEach(function(line) {
			backBoard[baseBoard.indexOf(line)] = [];
			line.forEach(function(tile) {
				var tile = createTile(tile, x, y, {
					top: y == 0,
					right: true,
					bottom: true,
					left: x == 0
				});
				backBoard[baseBoard.indexOf(line)].push(tile.getId());
				x += tileSize;
			});
			x = 0;
			y += tileSize;
		});
	}
	
	function createTile(letter, x, y, border, color) {
		x = typeof x === "undefined" ? 0 : x;
		y = typeof y === "undefined" ? 0 : y;
		color = typeof color === "undefined" ? "rgb(237, 221, 175)" : color;
		border = typeof border === "undefined" ? {
			top: true,
			right: true,
			bottom: true,
			left: true
		} : border;
		// Tile size
		var tileWidth = boardWidth / 15;
		var tileHeight = tileWidth;
		tileWidth -= (border.left ? 1 : 0) + (border.right ? 1 : 0);
		tileHeight -= (border.top ? 1 : 0) + (border.bottom ? 1 : 0);
		// Construct
		var tile = Crafty.e("2D, DOM, Color, Text, Mouse, Draggable")
			.attr({x: x, y: y, w: tileWidth, h: tileHeight})
			.color(color)
			.text(letter)
			.textFont({
				size: tileWidth + "px"
			})
			.unselectable()
			.css("text-align", "center")
			.disableDrag();
		// Border
		if (border.top)
			tile.css("border-top","1px solid rgb(0, 0, 0)");
		if (border.right)
			tile.css("border-right", "1px solid rgb(0, 0, 0)");
		if (border.bottom)
			tile.css("border-bottom", "1px solid rgb(0, 0, 0)");
		if (border.left)
			tile.css("border-left", "1px solid rgb(0, 0, 0)");
		// Background board tiles
		if (letter.length > 1 || letter === "0") {
			tile.textFont({
				size: tileWidth * .5 + "px",
				lineHeight: tileHeight + "px"
			});
		}
		if (letter === "0")
			tile.text("");
		if (letter === "2W")
			tile.color("rgb(253, 171, 201)");
		if (letter === "2L")
			tile.color("rgb(173, 218, 235)");
		if (letter === "3W")
			tile.color("rgb(238, 67, 102)");
		if (letter === "3L")
			tile.color("rgb(6, 94, 228)");
		if (letter === "0")
			tile.color("rgb(255, 255, 255)");
		// hover text
		tile.bind("MouseOver", function() {
			setInfoText(typeof tilePoints[letter.toLowerCase()] === "undefined" ? "" 
				: "Points:&nbsp;" + tilePoints[letter.toLowerCase()]);
		});
		tile.bind("MouseOut", function() {
			setInfoText("");
		});
		return tile;
	}
	
}();
var Codec = function() {};
!function() {
var delimiter = ":::";

Codec.encode = function(type, data) {
	return type + delimiter + JSON.stringify(data);
};

Codec.decode = function(message) {
	var command = {};
	command.type = message.substring(0, message.indexOf(delimiter));
	try {
	command.data = 
		JSON.parse(message.substring(message.indexOf(delimiter) + 3, message.length));
	} catch(e) {
		command.data = {};
	}
	return command;
};
}();