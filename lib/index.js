/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */
var pkg = require('../package.json'),
	debug = require('debug')('appc:sdk');

/**
 * Appc object
 */
function AppC() {
}

exports = module.exports = AppC;

var props = [
	['Auth', './auth'],
	['Org', './org'],
	['User', './user'],
	['App', './app'],
	['Notification', './notification'],
	['Feed', './feed'],
	['Cloud', './cloud']
];

// lazy load modules
props.forEach(function (tuple) {
	Object.defineProperty(AppC, tuple[0], {
		configurable: true,
		enumerable: true,

		// jscs:disable jsDoc
		get: function () {
			if (tuple.length > 2) {
				return tuple[2];
			}
			return (tuple[2] = require(tuple[1]));
		},
		// jscs:disable jsDoc
		set: function (v) {
			tuple[2] = v;
		}
	});
});

AppC.version = pkg.version;

// set the default user agent which looks more like a browser user agent and provides
// some basic platform information to aid in debugging
var os = require('os'),
	ua,
	lang = (process.env.LANG && ('; ' + process.env.LANG.split('.')[0])) || '';

/*jshint indent: false */
switch (process.platform) {
	case 'darwin': {
		ua = 'Macintosh; Intel Mac OS X ' + os.release().replace(/\./g, '_');
		break;
	}
	case 'win':
	case 'win32': {
		ua = 'Windows ' + os.release();
		if (process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) {
			ua += ' x64';
		}
		break;
	}
	case 'linux': {
		ua = 'Linux ' + os.release();
		break;
	}
	default: {
		ua = process.platform + ' ' + os.release();
		break;
	}
}
AppC.userAgent = 'Appcelerator/' + pkg.version + ' (' + ua + lang + ') Version/1.1.1 Safari/0.0.0';

var DEFAULTS = {
	PRODUCTION: {
		baseurl: 'https://platform.appcelerator.com',
		registryurl: 'https://software.appcelerator.com',
		securityurl: 'https://security.appcelerator.com',
		pubsuburl: 'https://pubsub.appcelerator.com',
		webeventurl: 'https://webevent.appcelerator.com',
		isProduction: true,
		supportUntrusted: false,
		secureCookies: true
	},
	PREPRODUCTION: {
		baseurl: 'https://360-preprod.cloud.appctest.com',
		registryurl: 'https://software-preprod.cloud.appctest.com',
		securityurl: 'https://security-preprod.cloud.appctest.com',
		pubsuburl: 'https://pubsub-preprod.cloud.appctest.com',
		webeventurl: 'https://webevent-preprod.cloud.appctest.com',
		isProduction: false,
		supportUntrusted: true,
		secureCookies: true
	},
	PREPRODONPROD: {
		baseurl: this.PRODUCTION.baseurl,
		registryurl: 'https://software-preprodonprod.appcelerator.com'|| 'https://software-preprodonprod.appcelerator.com',
		securityurl: this.PRODUCTION.securityurl,
		pubsuburl: this.PRODUCTION.pubsuburl,
		webeventurl: this.PRODUCTION.webeventurl,
		isProduction: false,
		supportUntrusted: true,
		secureCookies: true
	}
};

/**
 * set the base url to use production
 */
AppC.setProduction = function setProduction() {
	AppC.baseurl = DEFAULTS.PRODUCTION.baseurl;
	AppC.registryurl = DEFAULTS.PRODUCTION.registryurl;
	AppC.securityurl = DEFAULTS.PRODUCTION.securityurl;
	AppC.pubsuburl = DEFAULTS.PRODUCTION.pubsuburl;
	AppC.webeventurl = DEFAULTS.PRODUCTION.webeventurl;
	AppC.isProduction = DEFAULTS.PRODUCTION.isProduction;
	AppC.supportUntrusted = DEFAULTS.PRODUCTION.supportUntrusted;
	AppC.secureCookies = DEFAULTS.PRODUCTION.secureCookies;
	debug('set production to ' + AppC.baseurl);
};

/**
 * set the base url to use development
 */
AppC.setPreproduction = function setPreproduction() {
	AppC.baseurl = DEFAULTS.PREPRODUCTION.baseurl;
	AppC.registryurl = DEFAULTS.PREPRODUCTION.registryurl;
	AppC.securityurl = DEFAULTS.PREPRODUCTION.securityurl;
	AppC.pubsuburl = DEFAULTS.PREPRODUCTION.pubsuburl;
	AppC.webeventurl = DEFAULTS.PREPRODUCTION.webeventurl;
	AppC.isProduction = DEFAULTS.PREPRODUCTION.isProduction;
	AppC.supportUntrusted = DEFAULTS.PREPRODUCTION.supportUntrusted;
	AppC.secureCookies = DEFAULTS.PREPRODUCTION.secureCookies;
	debug('set preproduction to ' + AppC.baseurl);
};
AppC.setDevelopment = AppC.setPreproduction;

/**
 * set the base url to use production
 */
AppC.setPreprodonprod = function setProduction() {
	AppC.baseurl = DEFAULTS.PREPRODONPROD.baseurl;
	AppC.registryurl = DEFAULTS.PREPRODONPROD.registryurl;
	AppC.securityurl = DEFAULTS.PREPRODONPROD.securityurl;
	AppC.pubsuburl = DEFAULTS.PREPRODONPROD.pubsuburl;
	AppC.webeventurl = DEFAULTS.PREPRODONPROD.webeventurl;
	AppC.isProduction = DEFAULTS.PREPRODONPROD.isProduction;
	AppC.supportUntrusted = DEFAULTS.PREPRODONPROD.supportUntrusted;
	AppC.secureCookies = DEFAULTS.PREPRODONPROD.secureCookies;
	debug('set preprodonprod to ' + AppC.baseurl);
};

/**
 * set the base url to use local development
 */
AppC.setLocal = function setLocal() {
	AppC.setPreproduction();
	AppC.baseurl = 'http://360-local.appcelerator.com:8443';
	AppC.secureCookies = false;
	AppC.isProduction = false;
	debug('set local to ' + AppC.baseurl);
};

/**
 * set a custom environment, use local config as defaults
 */
AppC.setEnvironment = function setEnvironment(opts) {
	opts = opts || {};
	var base = DEFAULTS[isRunningInPreproduction() ? 'PREPRODUCTION' : 'PRODUCTION'];
	AppC.baseurl = opts.baseurl || base.baseurl;
	AppC.registryurl = opts.registry || base.registryurl;
	AppC.securityurl = opts.security || base.securityurl;
	AppC.pubsuburl = opts.pubsub || base.pubsuburl;
	AppC.webeventurl = opts.webevent || base.webeventurl;
	AppC.isProduction = typeof opts.isProduction !== 'undefined' ? opts.isProduction : base.isProduction;
	AppC.supportUntrusted = typeof opts.supportUntrusted !== 'undefined' ? opts.supportUntrusted : base.supportUntrusted;
	AppC.secureCookies = typeof opts.secureCookies !== 'undefined' ? opts.secureCookies : base.secureCookies;
	debug('set custom environment ' + JSON.stringify(opts) + ' to ' + AppC.baseurl);
};

/**
 * Are we running in preproduction
 * @return {boolean} - true if yes
 */
function isRunningInPreproduction() {
	return process.env.NODE_ACS_URL &&
		process.env.NODE_ACS_URL.indexOf('.appctest.com') > 0 ||
		process.env.NODE_ENV === ' preproduction' ||
		process.env.APPC_ENV === 'preproduction' ||
		process.env.NODE_ENV === 'development' ||
		process.env.APPC_ENV === 'development';
}

// if running in pre-production, assume by default we want preproduction setup
// if actually running locally, the logic assumes production though
if (isRunningInPreproduction()) {
	AppC.setPreproduction();
} else {
	AppC.setProduction();
}

/**
 * Wrapper for existing functions which use createRequestObject.
 * This allows xauth token or session to be specified when creating an object
 */
function createRequestObject(auth, url) {
	if (typeof(auth) === 'object') {
		if (!auth.jar) {
		}
		// auth is a session
		return _createRequestObject(auth, url);
	}
	if (typeof(auth) === 'string') {
		//auth is a token
		return _createRequestObject(url, auth);
	}
}

/**
 * Create request object
 */
function _createRequestObject(session, url, authToken) {
	if (typeof(session) === 'object') {
		if (!session || !session.jar) {
			throw new Error('session is not valid');
		}
		if (!url) {
			url = session;
		}
	}
	if (typeof(session) === 'string') {
		authToken = url;
		url = session;
		session = null;
	}
	var opts = {
		url: url,
		headers: {
			'User-Agent': AppC.userAgent
		}
	};

	if (process.env.APPC_CONFIG_PROXY && process.env.APPC_CONFIG_PROXY !== 'undefined') {
		opts.proxy = process.env.APPC_CONFIG_PROXY;
	}

	// support self-signed certificates
	if (AppC.supportUntrusted) {
		opts.agent = false;
		opts.rejectUnauthorized = false;
	}
	if (authToken) {
		opts.headers['x-auth-token'] = authToken;
	}
	if (session) {
		opts.jar = session.jar;
	}
	debug('fetching', url, 'sid=', session && session.id, 'userAgent=', opts.headers['User-Agent']);
	return opts;

}

/**
 * create APIResponseHandler
 */
function createAPIResponseHandler(callback, mapper, path) {
	return function (err, resp, body) {
		debug('api response, err=%o, body=%o', err, body);
		if (err) { return callback(err); }
		try {
			var ct = resp.headers['content-type'],
				isJSON = ct && ct.indexOf('/json') > 0;
			body = typeof(body) === 'object' ? body : isJSON && JSON.parse(body) || body;
			if (!body.success) {
				debug('api body failed, was: %o', body);
				var description = typeof(body.description) === 'object' ? body.description.message : body.description || 'unexpected response from the server';
				var error = new Error(description);
				error.success = false;
				error.description = description;
				error.code = body.code;
				error.internalCode = body.internalCode;
				typeof(body) === 'string' && (error.content = body);
				return callback(error);
			}
			if (mapper) {
				return mapper(body.result, callback, resp);
			}
			return callback(null, body.result || body, resp);
		}
		catch (E) {
			return callback(E, body, resp);
		}
	};
}

AppC.createAPIResponseHandler = createAPIResponseHandler;

/**
 * Create a request to the platform and return the request object
 *
 * @param  {Object} session - session
 * @param  {string} path - path
 * @param  {string} method - method
 * @param  {Function} callback - callback
 * @param  {Function} mapper - mapper
 * @param  {Object} json - json
 * @return {Object} - request object
 */
AppC.createRequest = function (session, path, method, callback, mapper, json) {
	if (typeof(method) === 'function') {
		json = mapper;
		mapper = callback;
		callback = method;
		method = 'get';
	}
	if (typeof(mapper) === 'object') {
		json = mapper;
		mapper = null;
	}
	var responseHandler = createAPIResponseHandler(callback || function () {}, mapper || null, path);
	return _createRequest(session, path, method, responseHandler, json);
};

/**
 * Create a request to the platform and return the request object. this time with a custom handler
 *
 * @param  {Object} session - session
 * @param  {string} path - path
 * @param  {string} method - method
 * @param  {string} responseHandler - responseHandler
 * @param  {Object} json - json
 * @return {Object} - request object
 */
AppC.createRequestCustomResponseHandler = function (session, path, method, responseHandler, json) {
	if (typeof(method) === 'function') {
		json = responseHandler;
		responseHandler = method;
		method = 'get';
	}
	return _createRequest(session, path, method, responseHandler, json);
};

/**
 * Create a request
 *
 * @param  {Object} session - session
 * @param  {string} path - path
 * @param  {string} method - method
 * @param  {string} responseHandler - responseHandler
 * @param  {Object} json - json
 * @return {Object} - request object
 */
function _createRequest(session, path, method, responseHandler, json) {
	var request = require('request');
	try {
		if (path[0] === '/') {
			path = require('url').resolve(AppC.baseurl, path);
		}
		var obj = createRequestObject(session, path);
		if (json) {
			obj.json = json;
		}
		return request[method.toLowerCase()](obj, responseHandler);
	} catch (e) {
		responseHandler(e);
		// don't return the callback since it expects a request
	}
}
