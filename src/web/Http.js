var Http = function(port) {
	this.port = port;
	this.Express = require('express');
	this.gets = [];
	this.posts = [];
};

Http.prototype.run = function() {
	var app = new this.Express();
	app.set('port', this.port);
	if (process.env.NODE_ENV === "production") {
		app.use(redirectHeroku);
		app.use(forceSsl);
	}
	
	for (var i = 0; i < this.gets.length; i++) {
		app.get(this.gets[i][0], this.gets[i][1]);
	}
	
	this.posts.forEach(function(post) {
		app.post(post[0], post[1]);
	});
	
	app.use(this.Express.static(__dirname + '/../_www/public'));
	app.set('views', __dirname + '/../_www/views');
	app.set('view engine', 'ejs');
	app.use(handle404);
	
	return app.listen(app.get('port'), function() {
	  console.log('Web server running on port', app.get('port'));
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

Http.prototype.addGet = function(path, callback) {
	this.gets.push([path, callback]);
};

Http.prototype.addPost = function(path, callback) {
	this.posts.push([path, callback]);
};

module.exports = Http;