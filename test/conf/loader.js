var fs = require('fs'),
	path = require('path');

/**
 * Loads up the configuration files in to the global $config object.
 */
exports.load = function (env) {
	env = env || process.env.NODE_ENV || process.env.APPC_ENV || 'development';

	global.$config = {
		env: env
	};

	[ 'default', env ].forEach(function (env) {
		var file = path.join(__dirname, env + '.js');
		if (fs.existsSync(file)) {
			(function mix(dest, src) {
				Object.keys(src).forEach(function (p) {
					if (dest.hasOwnProperty(p) && Object.prototype.toString.call(dest[p]) == '[object Object]') {
						mix(dest[p], src[p]);
					} else {
						dest[p] = src[p];
					}
				});
			}(global.$config, require(file)));
		}
	});
};