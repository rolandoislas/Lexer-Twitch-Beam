var Chat = function(logic) {
	this.logic = logic;
	this.player;
	this.commandPlaceTile = new RegExp("^([\\d{1,2}a-zA-Z])[-\\s]?(\\d{1,2})\\s?([a-zA-Z])$");
	this.commandRemovetile = new RegExp("^(?:remove|del|rem|delete)\\s([\\d{1,2}a-zA-Z])[-\\s]?(\\d{1,2})$", "i");
};

function letterToNumber(letter) {
	var number = parseInt(letter);
	if (!isNaN(number))
		return number;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters.indexOf(letter.toUpperCase())
}

Chat.prototype.parseMessage = function(user, message, callback) {
	if (this.commandPlaceTile.test(message)) { // "(int/char)-(int) (char)" position tile
		var groups = this.commandPlaceTile.exec(message);
		var x = parseInt(letterToNumber(groups[1]));
		var y = parseInt(groups[2]);
		if (x > 14 || x < 0 || y > 14 || y < 0)
			return callback("Coordinates must range from 0 to 14 or A to O.");
		this.logic.submitTilePosition(this.player, x, y, groups[3], user.username, function(err) {
			return callback(err);
		});
	}
	else if (this.commandRemovetile.test(message)) { // "remove/rem/del/delete (int/char)-(int)" remove tile
        var groups = this.commandRemovetile.exec(message);
		var x = parseInt(letterToNumber(groups[1]));
		var y = parseInt(groups[2]);
        if (x > 14 || x < 0 || y > 14 || y < 0)
            return callback("Coordinates must range from 0 to 14 or A to O.");
		this.logic.removeTile(this.player, x, y, user.username, function(err) {
			return callback(err);
		});
	}
	else if (/^submit$/i.test(message)) { // submit turn
		this.logic.submitTurn(this.player, user.username, function(err) {
			return callback(err);
		});
	}
	else if (/^swap\s([a-zA-Z])$/i.test(message)) { // swap tile
		var letter = message.split(" ")[1];
		if (letter.length != 1 || !(/[a-z]/i.test(letter)))
			return callback("Invalid letter.");
		this.logic.swapTile(this.player, letter, user.username, function(err) {
			return callback(err);
		});
	}
	else if (/^([a-zA-Z])$/.test(message)) { // single letter
		return callback("To play a letter you must enter coordinates. Ex. a-7 " + message);
	}
};

Chat.prototype.setPlayer = function(player) {
	this.player = player;
};

Chat.prototype.setGame = function(game) {
	this.game = game;
};

module.exports = Chat;