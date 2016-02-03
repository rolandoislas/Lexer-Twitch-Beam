var Http = function(port) {
	this.port = port;
	this.Express = require('express');
	this.app = new this.Express();
	this.gets = [];
	this.posts = [];
};

Http.prototype.run = function() {
	this.app.set('port', this.port);
	if (process.env.NODE_ENV === "production") {
		this.app.use(redirectHeroku);
		if (process.env.SSL === "true")
			this.app.use(forceSsl);
		else
			this.app.use(downgradeSsl);
	}
	
	for (var i = 0; i < this.gets.length; i++) {
		this.app.get(this.gets[i][0], this.gets[i][1]);
	}
	
	this.posts.forEach(function(post) {
		this.app.post(post[0], post[1]);
	});
	
	this.app.use(this.Express.static(__dirname + '/../_www/public'));
	this.app.set('views', __dirname + '/../_www/views');
	this.app.set('view engine', 'ejs');
	this.app.use(handle404);
	
	var that = this;
	return this.app.listen(this.app.get('port'), function() {
	  console.log('Web server running on port', that.app.get('port'));
	});
};

function handle404(req, res, next) {
	res.status(404);
	res.render("pages/404");
}

function redirectHeroku(req, res, next) {
	if (typeof(process.env.URL) !== "undefined" && req.hostname.indexOf("herokuapp.com") > -1)
		return res.redirect(301, process.env.URL);
	return next();
}

function forceSsl(req, res, next) {
	if (req.headers['x-forwarded-proto'] !== 'https' && req.headers['cf-visitor'] !== "{\"scheme\":\"https\"}")
        return res.redirect(301, ['https://', req.get('Host'), req.url].join(''));
    return next();
}

function downgradeSsl(req, res, next) {
	if (req.headers["x-forwarded-proto"] === "https")
        return res.redirect(301, ["http://", req.get("Host"), req.url].join(""));
    return next();
}

Http.prototype.addGet = function(path, callback) {
	this.gets.push([path, callback]);
};
Http.prototype.addGetLive = function(path, callback) {
	this.app._router.stack.splice(this.app._router.stack.length - 1, 1);
	this.app.get(path, callback);
	this.app.use(handle404);
};

Http.prototype.addPost = function(path, callback) {
	this.posts.push([path, callback]);
};

module.exports = Http;