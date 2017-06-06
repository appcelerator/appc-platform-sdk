'use strict';

/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2017 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

const fs = require('fs');
const urllib = require('url');

const debug = require('debug')('Appc:sdk');
const request = require('request');

const version = require('../package.json').version;
const userAgent = require('./useragent');

// Init and export, setting module version and user-agent.
let Appc = exports = module.exports = { version, userAgent };

// Provide env accessor methods and set default env.
const Env = require('./env');
Object.assign(Appc, Env);

// Add accessors for static env props.
Env.props.forEach(function (prop) {
	Object.defineProperty(Appc, prop, {
		configurable: true,
		enumerable: true,
		get: function () {
			return Env[prop];
		},
		set: function (v) {
			Env[prop] = v;
		}
	});
});

// Load remaining modules and provide setters.
const modules = [
	'Analytics',
	'App',
	'Auth',
	'Cloud',
	'Feed',
	'Middleware',
	'Notification',
	'Org',
	'User'
];
const props = modules.map(module => [ module, `./${module.toLowerCase()}` ]);
props.forEach(function (tuple) {
	Object.defineProperty(Appc, tuple[0], {
		configurable: true,
		enumerable: true,
		get: function () {
			if (tuple.length > 2) {
				return tuple[2];
			}
			return (tuple[2] = require(tuple[1]));
		},
		set: function (v) {
			tuple[2] = v;
		}
	});
});

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
Appc.createRequest = function (session, path, method, callback, mapper, json) {
	if (typeof method === 'function') {
		json = mapper;
		mapper = callback;
		callback = method;
		method = 'get';
	}
	if (typeof mapper === 'object') {
		json = mapper;
		mapper = null;
	}
	let responseHandler = createAPIResponseHandler(callback || function () {}, mapper || null, path);
	return _createRequest(session, path, method, responseHandler, json);
};

/**
 * create APIResponseHandler
 */
Appc.createAPIResponseHandler = createAPIResponseHandler;
function createAPIResponseHandler(callback, mapper, path) {
	return function (err, resp, body) {
		debug('api response, err=%o, body=%o', err, body);
		if (err) {
			return callback(err);
		}
		let ct = resp.headers['content-type'],
			isJSON = ct && ct.indexOf('/json') > 0;
		body = typeof body === 'object' ? body : isJSON && JSON.parse(body) || body;
		if (!body.success) {
			debug('api body failed, was: %o', body);
			let description = typeof body.description === 'object' ? body.description.message : body.description || 'unexpected response from the server';
			let error = new Error(description);
			error.success = false;
			error.description = description;
			error.code = body.code;
			error.internalCode = body.internalCode;
			typeof body === 'string' && (error.content = body);
			return callback(error);
		}
		if (!body.result && body.key) {
			body.result = body[body.key];
		}
		if (mapper) {
			return mapper(body.result || body, callback, resp);
		}
		return callback(null, body.result || body, resp);
		try {
		}
		catch(E) {
			return callback(E, body, resp);
		}
	};
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
Appc.createRequestCustomResponseHandler = function (session, path, method, responseHandler, json) {
	if (typeof method === 'function') {
		json = responseHandler;
		responseHandler = method;
		method = 'get';
	}
	return _createRequest(session, path, method, responseHandler, json);
};

/**
 * Create request options.
 *
 * @param  {Object} session - session object
 * @param  {string} url - url or path
 * @param  {string} authToken - authToken
 * @return {Object} - request options
 */
Appc.createRequestOpts = function (session, url, authToken) {
	if (typeof session === 'object') {
		if (!session || !session.jar) {
			throw new Error('session is not valid');
		}
		if (!url) {
			url = session;
		}
	}

	let opts = {
		url: url,
		headers: {
			'User-Agent': Appc.userAgent
		}
	};

	if (typeof process.env.APPC_CONFIG_PROXY !== 'undefined') {
		opts.proxy = process.env.APPC_CONFIG_PROXY;
	}

	if (process.env.APPC_CONFIG_CAFILE) {
		opts.ca = fs.readFileSync(process.env.APPC_CONFIG_CAFILE);
	}

	if (process.env.APPC_CONFIG_STRICTSSL === 'false') {
		opts.strictSSL = false;
	}

	// support self-signed certificates
	if (Appc.supportUntrusted) {
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
	try {
		if (path[0] === '/') {
			path = urllib.resolve(Appc.baseurl, path);
		}

		let opts = Appc.createRequestOpts(session, path);
		if (json) {
			opts.json = json;
		}

		return request[method.toLowerCase()](opts, responseHandler);
	} catch(e) {
		// don't return the callback since it expects a request object
		responseHandler(e);
	}
}
