/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

/**
 * make a request to AppC platform for authentication
 */
var AppC = require('./index'),
	Session = require('./session'),
	tough = require('tough-cookie'),
	Mac = require('getmac'),
	debug = require('debug')('appc:sdk'),
	cachedSession,
	cachedSessionKey;

module.exports = Auth;

/**
 * Auth object
 */
function Auth() {
}

Auth.ERROR_CONNECTION_SERVER_ERROR = 'com.appcelerator.auth.connection.server.error';
Auth.ERROR_CONNECTION_REFUSED = 'com.appcelerator.auth.connection.refused';
Auth.ERROR_CONNECTION_RESET = 'com.appcelerator.auth.connection.reset';
Auth.ERROR_CONNECTION_INVALID_SSL = 'com.appcelerator.auth.connection.ssl.invalid';
Auth.ERROR_TWOFACTOR_DISABLED = 'com.appcelerator.auth.code.disable_2fa';
Auth.ERROR_NO_PHONE_CONFIGURED = 'com.appcelerator.auth.code.nophone';
Auth.ERROR_AUTH_CODE_EXPIRED = 'com.appcelerator.auth.code.expired';
Auth.ERROR_AUTH_CODE_INVALID = 'com.appcelerator.auth.code.invalid';
Auth.ERROR_NOT_AUTHORIZED = 'com.appcelerator.auth.not.authorized';

/**
 * logout. once this method completes the session will no longer be valid
 */
Auth.logout = function logout(session, callback) {
	AppC.createRequest(session, '/api/v1/auth/logout', 'post', function (e) {
		session._invalidate();
		callback && callback(e);
	});
};

/**
 * Resolve user organization
 * @param  {Object}   session - session
 * @param  {Function} next - next
 */
function resolveUserOrg(session, next) {
	// find our orgs
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	AppC.Org.find(session, function (err, orgs) {
		if (err) { return next(err); }
		session.orgs = {};
		// map in our orgs
		orgs && orgs.forEach(function (org) {
			session.orgs[org.org_id] = org;
		});
		if (session.user.org_id) {
			// set our org to the logged in org
			session.user.org_id && (session.user.org = session.orgs[session.user.org_id]);
		} else if (session.user.last_logged_in_org) {
			// get the last logged in org to set it
			session.user.org_id = session.user.last_logged_in_org;
			session.user.org = session.orgs[session.user.org_id];
		} else if (session.user.last_accessed_orgs) {
			// get the last accessed org in this case
			session.user.org_id = session.user.last_accessed_orgs[session.user.last_accessed_orgs.length - 1].org_id;
			session.user.org = session.orgs[session.user.org_id];
		} else if (session.user.default_org) {
			// try and set the default org
			session.user.org_id = orgs.filter(function (org) { return org.guid === session.user.default_org;})[0].org_id;
			session.user.org = session.orgs[session.user.org_id];
		}
		next(null, session);
	});
}

/**
 * Make an error object
 * @param  {string} msg - error message
 * @param  {number} code - error code
 * @return {Object} - error object
 */
function makeError(msg, code) {
	if (msg instanceof Error) {
		msg.error = code;
		return msg;
	}
	var error = new Error(msg);
	error.code = code;
	return error;
}

/**
 * login
 */
Auth.login = function login(username, password, callback) {
	Mac.getMac(function (err, macAddress) {
		var session = new Session(),
			// jscs:disable jsDoc
			checkError = function (err, result) {
				if (err) {
					debug('login error %o', err);
					if (err.code) {
						switch (err.code) {
							case 'ECONNREFUSED':
								return callback(makeError('Connection refused to ' + AppC.baseurl, Auth.ERROR_CONNECTION_REFUSED));
							case 'ECONNRESET':
								return callback(makeError('Connection reset to ' + AppC.baseurl, Auth.ERROR_CONNECTION_RESET));
							case 'CERT_HAS_EXPIRED':
								return callback(makeError('The servers SSL certificate at ' + AppC.baseurl + ' has expired. Refusing to connect.', Auth.ERROR_CONNECTION_INVALID_SSL));
							case 400:
								return callback(makeError(err, Auth.ERROR_CONNECTION_SERVER_ERROR));
						}
					}
					return callback(makeError(err, Auth.ERROR_CONNECTION_SERVER_ERROR));
				}
				callback(null, result);
			};
		var r = AppC.createRequest(session, '/api/v1/auth/login', 'post', checkError, function mapper(obj, next) {
			session._set(obj);
			resolveUserOrg(session, next);
		}),
		form = r.form();
		form.append('username', username);
		form.append('password', password);
		form.append('keepMeSignedIn', 'true');
		form.append('from', AppC.userAgent);
		form.append('deviceid', macAddress || '00-00-00-00-00-00');
		debug('device id is %s', macAddress);
		debug('form parameters for %s, %o', r.url, form);
	});
};

/**
 * Set cookie for domain
 */
function setCookieForDomain(session, name, value, domain, callback) {
	var cookie = new tough.Cookie();
	cookie.key = name;
	cookie.value = value;
	cookie.secure = true;
	cookie.httpOnly = true;
	cookie.path = '/';
	cookie.domain = domain;
	cookie.expires = Infinity;
	cookie.hostOnly = false;
	cookie.creation = new Date();
	cookie.lastAccessed = new Date();
	session.jar.setCookie(cookie.toString(), AppC.baseurl, function (err, cookie) {
		if (err) { return callback(err); }
		if (!cookie) { return callback(new Error('session cookie not set')); }
		callback(null, cookie);
	});
}

/**
 * from a current logged in authenticated request, return a new Session object
 * or return Auth.ERROR_NOT_AUTHORIZED if not logged in (no valid session cookie)
 */
Auth.createSessionFromRequest = function (req, callback) {
	if (!req.cookies) {
		return callback(makeError('not logged in', Auth.ERROR_NOT_AUTHORIZED));
	}
	var id = req.cookies['dashboard.sid'] || req.cookies['connect.sid'];
	if (!id) {
		return callback(makeError('not logged in', Auth.ERROR_NOT_AUTHORIZED));
	}
	// check to see if we have a cached session
	if (cachedSession && cachedSessionKey === id) {
		debug('found cached session %s', id);
		return callback(null, cachedSession);
	}
	return Auth.createSessionFromID(id, callback);
};

/**
 * from an existing authenticated session, create a new Session object
 */
Auth.createSessionFromID = function createSessionFromID(id, callback) {
	// if we already have it, continue to use it
	if (cachedSession && cachedSessionKey === id) {
		debug('found cached session %s', id);
		return callback(null, cachedSession);
	}
	var url = require('url'),
		async = require('async'),
		parse = url.parse(AppC.baseurl),
		host = parse.host,
		tok = host.split('.'),
		subdomain = tok.splice(tok.length - 2, 2).join('.'),
		session = new Session(host, subdomain);

	session.id = id;

	// for now, since we are transitioning cookies both from FQDN to base domain
	// AND we are renaming the cookie, we need to go ahead and set for all cases
	// to work across both production and pre-production until it's fully rolled out
	async.series([
		function (cb) {
			setCookieForDomain(session, 'connect.sid', id, host, cb);
		},
		function (cb) {
			setCookieForDomain(session, 'connect.sid', id, subdomain, cb);
		},
		function (cb) {
			setCookieForDomain(session, 'dashboard.sid', id, host, cb);
		},
		function (cb) {
			setCookieForDomain(session, 'dashboard.sid', id, subdomain, cb);
		}
	], function (err) {
		if (err) { return callback(err); }
		// fetch the current user and set it on the session
		AppC.User.find(session, function (err, user) {
			if (err && err.code === 403) {
				return callback(makeError('invalid session', Auth.ERROR_NOT_AUTHORIZED));
			}
			if (err) { return callback(err); }
			session.user = user;
			resolveUserOrg(session, function (err) {
				cachedSession = session;
				cachedSessionKey = id;
				callback(err, session);
			});
		});
	});
};

/**
 * request a login code
 *
 * @param {Object} session object
 * @param {boolean} if true, send via SMS (only if configured). otherwise, email
 * @param {Function} callback returns true (as 2nd parameter) if success
 */
Auth.requestLoginCode = function requestLoginCode(session, sms, callback) {
	AppC.User.find(session, function (err, user) {
		if (err) { return callback(err); }
		if (user.disable_2fa) {
			return callback(makeError('Two-factor authentication is disabled', Auth.ERROR_TWOFACTOR_DISABLED));
		}
		if (sms && !user.phone) {
			return callback(makeError('No SMS number configured. Please configure your SMS number in your profile to use SMS verification.', Auth.ERROR_NO_PHONE_CONFIGURED));
		}
		var r = AppC.createRequest(session, '/api/v1/auth/deviceauth/resend', 'post', function (err, body) {
			if (err) { return callback(err); }
			callback(null, body);
		});
		if (r) {
			var form = r.form();
			form.append('sendby', sms ? 'sms' : 'email');
			form.append('sendto', sms ? user.phone : user.email);
		}
	});
};

/**
 * validate a session with platform, returns basic user identity if success or
 * error if invalid session
 *
 * @param {Object|String} request object or String (sid)
 * @param {Function} callback returns session details (as 2nd parameter) if valid
 */
Auth.validateSession = function validateSession(object, callback) {
	// pass any of the following:
	// - session object
	// - http request object
	// - sid as string
	var sid = object.jar && object.id || (object.cookies && (object.cookies['connect.sid'] || object.cookies['dashboard.sid'])) || object,
		request = require('appc-request-ssl'),
		cookie = 'connect.sid=' + sid + '; dashboard.sid=' + sid,
		opts = {
			method: 'get',
			url: require('url').resolve(AppC.baseurl, '/api/v1/auth/checkSession'),
			headers: {
				'Accept': 'text/json, application/json',
				'Cookie': object.headers && object.headers.cookie || cookie,
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
	request(opts, AppC.createAPIResponseHandler(callback));
};

/**
 * given a user code, check for validation of this code
 *
 * @param {Object} session object
 * @param {String} code for verification
 * @parma {Function} callback returns true (as 2nd parameter) if valid
 */
Auth.verifyLoginCode = function verifyLoginCode(session, code, callback) {
	var r = AppC.createRequest(session, '/api/v1/auth/deviceauth', 'post', function (err, result) {
		if (err) { return callback(err); }
		if (result) {
			if (result.expired) {
				return callback(makeError('Your authorization code has expired.', Auth.ERROR_AUTH_CODE_EXPIRED));
			}
			return callback(null, result.valid);
		}
		return callback(makeError('Your authorization code was invalid.', Auth.ERROR_AUTH_CODE_INVALID));
	});
	if (r) {
		var form = r.form();
		form.append('code', code);
	}

};
