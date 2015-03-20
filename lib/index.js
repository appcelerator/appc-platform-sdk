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
AppC.userAgent = pkg.name + '/' + pkg.version;

/**
 * set the base url to use production
 */
AppC.setProduction = function setProduction() {
	AppC.baseurl = 'https://platform.appcelerator.com';
	AppC.registryurl = 'https://4db53bb79d364bf3ea0595f95cb2bd1d55f355cb.cloudapp-enterprise.appcelerator.com';
	AppC.securityurl = 'https://4503ef0cc4daae71d3bb898f66c72b886c9f6d61.cloudapp-enterprise.appcelerator.com';
	AppC.isProduction = true;
	AppC.supportUntrusted = false;
	debug('set production to ' + AppC.baseurl);
};

/**
 * set the base url to use development
 */
AppC.setDevelopment = function setDevelopment() {
	AppC.baseurl = 'https://360-preprod.cloud.appctest.com';
	AppC.registryurl = 'https://8d2938f67044d8367d468453b5a6c2536185bcea.cloudapp-enterprise-preprod.appctest.com';
	AppC.securityurl = 'https://de7a3ab4b12bf1d3d4b7fde7f306c11bc2b98f67.cloudapp-enterprise-preprod.appctest.com';
	AppC.isProduction = false;
	AppC.supportUntrusted = true;
	debug('set dev to ' + AppC.baseurl);
};
AppC.setPreproduction = AppC.setDevelopment;

/**
 * set the base url to use local development
 */
AppC.setLocal = function setLocal() {
	AppC.setDevelopment();
	AppC.baseurl = 'https://360-local.appcelerator.com:8443';
	AppC.isProduction = false;
	debug('set local to ' + AppC.baseurl);
};

/**
 * set a custom environment, use local config as defaults
 */
AppC.setEnvironment = function setEnvironment(opts) {
	opts = opts || {};
	AppC.baseurl = opts.baseurl || 'https://360-local.appcelerator.com:8443';
	AppC.registryurl = opts.registry || AppC.registryurl;
	AppC.securityurl = opts.security || AppC.securityurl;
	AppC.isProduction = typeof opts.isProduction !== 'undefined' ? opts.isProduction : false;
	AppC.supportUntrusted = typeof opts.supportUntrusted !== 'undefined' ? opts.supportUntrusted : true;
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
	debug('fetching', url);
	return opts;

}

/**
 * create APIResponseHandler
 */
function createAPIResponseHandler(callback, mapper) {
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
				error.code = body.code;
				error.internalCode = body.internalCode;
				typeof(body) === 'string' && (error.content = body);
				return callback(error);
			}
			if (mapper) {
				return mapper(body.result, callback);
			}
			return callback(null, body.result || body);
		}
		catch (E) {
			return callback(E, body);
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
	var responseHandler = createAPIResponseHandler(callback || function () {}, mapper || null);
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
	var request = require('appc-request-ssl');
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
