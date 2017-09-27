'use strict';

const debug = require('debug')('Appc:sdk:env');

const envs = {
	Production: {
		baseurl: 'https://platform.appcelerator.com',
		registryurl: 'https://software.appcelerator.com',
		pubsuburl: 'https://pubsub.appcelerator.com',
		webeventurl: 'https://webevent.appcelerator.com',
		cacheurl: 'https://cache.appcelerator.com',
		isProduction: true,
		supportUntrusted: false,
		secureCookies: true
	},
	Preproduction: {
		baseurl: 'https://360-preprod.cloud.appctest.com',
		registryurl: 'https://software-preprod.cloud.appctest.com',
		pubsuburl: 'https://pubsub-preprod.cloud.appctest.com',
		webeventurl: 'https://webevent-preprod.cloud.appctest.com',
		cacheurl: 'https://cache-preprod.cloud.appctest.com',
		isProduction: false,
		supportUntrusted: true,
		secureCookies: true
	},
	ProductionEU: {
		baseurl: 'https://platform-eu.appcelerator.com',
		registryurl: 'https://software-eu.appcelerator.com',
		pubsuburl: 'https://pubsub.appcelerator.com',
		webeventurl: 'https://webevent.appcelerator.com',
		cacheurl: 'https://cache.appcelerator.com',
		isProduction: true,
		supportUntrusted: false,
		secureCookies: true
	},
	PlatformAxway: {
		baseurl: 'https://portal.cloudapp.axway.com',
		registryurl: 'https://marketplace.cloudapp.axway.com',
		pubsuburl: 'https://pubsub.appcelerator.com',
		webeventurl: 'https://webevent.appcelerator.com',
		cacheurl: 'https://cache.appcelerator.com',
		isProduction: true,
		supportUntrusted: false,
		secureCookies: true
	}
};

const platformMap = {
	baseurl: 'APPC_DASHBOARD_URL',
	registryurl: 'APPC_REGISTRY_SERVER',
	pubsuburl: 'APPC_PUBSUB_URL',
	webeventurl: 'APPC_WEBEVENT_URL',
	cacheurl: 'APPC_CACHE_URL',
	supportUntrusted: 'APPC_SUPPORT_UNTRUSTED',
	secureCookies: 'APPC_SECURE_COOKIES'
};

let Env = exports = module.exports = {};

// List env props to wrap with accessors.
Env.props = Object.keys(envs.Production);

// Set analytics URL.
Env.analyticsurl = 'https://api.appcelerator.net/p/v2/partner-track';

/**
 * Map default envs to setter functions.
 */
Object.keys(envs).forEach(function (env) {
	Env['set' + env] = function () {
		Object.assign(Env, envs[env]);
		debug('set env to', env, ', baseurl is', Env.baseurl);
	};
});

// Alias setPreproduction as setDevelopment.
Env.setDevelopment = Env.setPreproduction;

/**
 * set the base url to use local development
 */
Env.setLocal = function setLocal(opts) {
	Env.setPreproduction();
	Env.baseurl = 'http://localhost:9009';
	Env.secureCookies = false;
	Env.isProduction = false;
	debug('set env to local, baseurl is', Env.baseurl);
};

/**
 * set a custom environment, use local config as defaults
 */
Env.setEnvironment = function setEnvironment(opts) {
	opts = opts || {};
	let baseEnvKey = _getEnvKey();
	let base = envs[baseEnvKey] || envs.Production;
	Env.baseurl = (opts.baseurl || base.baseurl).trim();
	Env.registryurl = (opts.registry || base.registryurl).trim();
	Env.pubsuburl = (opts.pubsub || base.pubsuburl).trim();
	Env.webeventurl = (opts.webevent || base.webeventurl).trim();
	Env.cacheurl = (opts.cache || base.cacheurl).trim();
	Env.isProduction = typeof opts.isProduction !== 'undefined' ? opts.isProduction : base.isProduction;
	Env.supportUntrusted = typeof opts.supportUntrusted !== 'undefined' ? opts.supportUntrusted : base.supportUntrusted;
	Env.secureCookies = typeof opts.secureCookies !== 'undefined' ? opts.secureCookies : base.secureCookies;
	debug('set custom environment ' + JSON.stringify(opts) + ' to ' + Env.baseurl);
};

/**
 * Test NODE_ENV, APPC_ENV, and NODE_ACS_URL values to see if they are preproduction-ish.
 * @return {boolean} - true if yes
 */
function _isPreproduction() {
	return (process.env.NODE_ACS_URL && ~process.env.NODE_ACS_URL.indexOf('.appctest.com'))
		|| _isEnv([ 'preproduction', 'development' ]);
}

/**
 * Test NODE_ENV and APPC_ENV values to see if they match env name(s).
 * @return {boolean} - true if yes
 */
function _isEnv(envs) {
	if (!Array.isArray(envs)) {
		envs = [ envs ];
	}
	return ~envs.indexOf(process.env.NODE_ENV)
		|| ~envs.indexOf(process.env.APPC_ENV);
}

/**
 * Test NODE_ENV and APPC_ENV values to see if they match env name(s).
 * @return {String} - envs key name
 */
function _getEnvKey() {
	if (_isPreproduction()) {
		return 'Preproduction';
	}
	if (_isEnv('production-eu')) {
		return 'ProductionEU';
	}
	if (_isEnv('platform-axway')) {
		return 'PlatformAxway';
	}
	return 'Production';
}

/**
 * Check process.env vars for override values.
 * @return {void}
 */
function _inheritEnvVars() {
	Object.keys(platformMap).forEach(function (prop) {
		let name = platformMap[prop];
		let val = process.env[name];

		if (typeof val !== 'undefined') {
			// Lowercase and handle boolean values.
			val = String(val).toLowerCase();
			val === 'true' && (val = true);
			val === 'false' && (val = false);

			// Override prop if env var differs.
			Env[prop] !== val && (Env[prop] = val);
		}
	});
}

// Set default env based on NODE_ENV/APPC_ENV.
let defaultEnv = _getEnvKey();
Env['set' + defaultEnv]();

// Override props with env vars.
_inheritEnvVars();
