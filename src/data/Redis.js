var Redis_ = function() {
	this.Redis = require("redis");
	this.cache = require("../util/Cache");
	this.redisClient = getRedisClientFromCache(this);
};

function getRedisClientFromCache(that) {
	if (typeof(that.cache.get("redisClient")) !== "undefined")
		return that.cache.get("redisClient");
	var redisClient = that.Redis.createClient(process.env.REDIS_URL);
	that.cache.set("redisClient", redisClient);
	return redisClient;
}

Redis_.prototype.getClient = function(callback) {
	return callback(this.redisClient);
};

Redis_.prototype.get = function(key, callback) {
	return this.redisClient.get(key, function(err, reply) {
		callback(err, JSON.parse(reply));
	});
};

Redis_.prototype.set = function(key, value, callback) {
	return this.redisClient.set(key, JSON.stringify(value), callback);
};

Redis_.prototype.clear = function() {
	return this.redisClient.flushdb();
};

module.exports = Redis_;