var Cache = {
	cache: {},
	get: function(key) {
		return Cache.cache[key];
	},
	set: function(key, val) {
		Cache.cache[key] = val;
	}
};

module.exports = Cache;