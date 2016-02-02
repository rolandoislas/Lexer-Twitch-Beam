var Codec = function() {};

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

module.exports = Codec;