var Chat = function(logic) {
	this.logic = logic;
	this.player;
};

Chat.prototype.parseMessage = function(user, message, callback) {
	if (/^\d{1,2}[-\s]\d{1,2}\s\w$/.test(message)) { // "(int)-(int) (char)" position tile
		if (message.indexOf("-") < 0)
			message = message.replace(" ", "-");
		var letter = message.split(" ")[1];
		if (letter.length != 1 || !(/[a-z]/i.test(letter)))
			return callback("Invalid letter.");
		var x = parseInt(message.split(" ")[0].split("-")[0]);
		var y = parseInt(message.split(" ")[0].split("-")[1]);
		if (x > 14 || y < 0)
			return callback("Coordinates must range from 0 to 14.");
		this.logic.submitTilePosition(this.player, x, y, letter, user.username, function(err) {
			return callback(err);
		});
	} else if (/^remove\s\d{1,2}-\d{1,2}$/i.test(message)) { // "remove (int)-(int)" remove tile
		var x = parseInt(message.split(" ")[1].split("-")[0]);
		var y = parseInt(message.split(" ")[1].split("-")[1]);
		this.logic.removeTile(this.player, x, y, user.username, function(err) {
			return callback(err);
		});
	} else if (/^submit$/i.test(message)) { // submit turn
		this.logic.submitTurn(this.player, user.username, function(err) {
			return callback(err);
		});
	} else if (/^swap\s\w$/i.test(message)) { // swap tile
		var letter = message.split(" ")[1];
		if (letter.length != 1 || !(/[a-z]/i.test(letter)))
			return callback("Invalid letter.");
		this.logic.swapTile(this.player, letter, user.username, function(err) {
			return callback(err);
		});
	} else if (/^[a-z]{1}$/i.test(message)) { // single letter
		return callback("To play a letter you must enter coordinates. Ex. 0-7 " + message);
	}
};

Chat.prototype.setPlayer = function(player) {
	this.player = player;
};

Chat.prototype.setGame = function(game) {
	this.game = game;
};

module.exports = Chat;