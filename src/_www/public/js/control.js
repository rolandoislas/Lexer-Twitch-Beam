!function() {
	
	$(document).ready(function() {
		$(document).on("click", "#start", connectToServer);
		$(document).on("click", "#chatsToggle", toggleChats);
	});
	
	var socket;
	var turnClock;
	var pingClock;
	var time;
	var turnId;
	
	function toggleChats() {
		var chats = $("#chats");
		if (chats.html() === "") {
			var urls = [
				"https://beam.pro/embed/chat/$beam",
				"http://www.twitch.tv/$twitch/chat"
			];
			urls.forEach(function(url) {
				url = url.replace("$beam", beamUser).replace("$twitch", twitchUser);
				var frame = $("<iframe>", {
					"class": "streamChat"
				}).attr("src", url.toLowerCase());
				chats.append(frame);
			});
		} else
			chats.html("");
	}
	
	function connectToServer() {
		try {
			socket.close();
		} catch(ignore) {}
		socket = new WebSocket(location.protocol.replace("http", "ws") + "//" 
			+ location.hostname + (location.port ? ":" + location.port : ""), "protocolOne");
		socket.onopen = function(event) {
			socket.send(Codec.encode("auth", {auth: $("#auth").val()}));
			socket.send(Codec.encode("createGame", {
				size: typeof size === "undefined" ? -1 : size,
				id: typeof id === "undefined" ? -1 : id
			}));
			clearInterval(pingClock);
			pingClock = setInterval(ping, 20000);
		};
		socket.onclose = function(event) {
			var p = $("<p>");
			p.html("Disconnected from server.");
			$(".log").append(p);
			$(".log")[0].scrollTop = $(".log")[0].scrollHeight;
			clearInterval(pingClock);
			connectToServer();
		};
		socket.onmessage = function(event) {
			console.log(event.data);
			var command = Codec.decode(event.data);
			if (command.type === "log") {
				var p = $("<p>");
				p.html(command.data.message);
				$(".log").append(p);
				$(".log")[0].scrollTop = $("." + command.type)[0].scrollHeight;
			} else if (command.type === "end")
				setTimeout(function() {
					socket.close();
				}, 10000);
		};
	}
	
	function ping() {
		socket.send(Codec.encode("ping"));
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