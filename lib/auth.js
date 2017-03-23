'use strict';

/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2017 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

const fs = require('fs');

const debug = require('debug')('appc:sdk:auth');
const mac = require('getmac');
const tc = require('tough-cookie');

const Appc = require('.');
const Session = require('./session');

const ERROR_CONNECTION_SERVER_ERROR = 'com.appcelerator.auth.connection.server.error';
const ERROR_CONNECTION_REFUSED = 'com.appcelerator.auth.connection.refused';
const ERROR_CONNECTION_RESET = 'com.appcelerator.auth.connection.reset';
const ERROR_CONNECTION_INVALID_SSL = 'com.appcelerator.auth.connection.ssl.invalid';
const ERROR_TWOFACTOR_DISABLED = 'com.appcelerator.auth.code.disable_2fa';
const ERROR_NO_PHONE_CONFIGURED = 'com.appcelerator.auth.code.nophone';
const ERROR_AUTH_CODE_EXPIRED = 'com.appcelerator.auth.code.expired';
const ERROR_AUTH_CODE_INVALID = 'com.appcelerator.auth.code.invalid';
const ERROR_NOT_AUTHORIZED = 'com.appcelerator.auth.not.authorized';

let Auth = exports = module.exports = {
	ERROR_CONNECTION_SERVER_ERROR,
	ERROR_CONNECTION_REFUSED,
	ERROR_CONNECTION_RESET,
	ERROR_CONNECTION_INVALID_SSL,
	ERROR_TWOFACTOR_DISABLED,
	ERROR_NO_PHONE_CONFIGURED,
	ERROR_AUTH_CODE_EXPIRED,
	ERROR_AUTH_CODE_INVALID,
	ERROR_NOT_AUTHORIZED,
	cacheSession,
	createSessionFromID,
	createSessionFromRequest,
	getUniqueMachineID,
	invalidCachedSession,
	login,
	logout,
	requestLoginCode,
	switchLoggedInOrg,
	validateSession,
	verifyLoginCode
};

let cachedMac;
let cachedSessionKey;
let cachedSession;
let cachedUser;
let cachedUserKey;

/**
 * return a unique machine id
 */
function getUniqueMachineID(callback) {
	if (cachedMac) {
		return callback(null, cachedMac);
	}
	return mac.getMac(function (err, macAddress) {
		if (!macAddress) {
			let crypto = require('crypto');
			macAddress = crypto.randomBytes(18).toString('hex');
		}
		cachedMac = macAddress;
		return callback(null, cachedMac);
	});
};

/**
 * login
 */
function login(params, callback) {
	let username, password, deviceid,
		from = 'cli';
	if (typeof callback === 'function') {
		username = params.username;
		password = params.password;
		deviceid = params.fingerprint || callback;
		from = params.from || from;
	} else {
		// backward compatibility for login(username, password, [deviceid], callback)
		username = arguments[0];
		password = arguments[1];
		deviceid = arguments[2];
		if (typeof deviceid !== 'function') {
			callback = arguments[3];
		}
	}
	if (typeof deviceid === 'function') {
		return getUniqueMachineID(function (err, mid) {
			params = { username: username, password: password, fingerprint: mid };
			login(params, deviceid);
		});
	}

	function checkError(err, result, resp) {
		if (err) {
			debug('login error %o', err);
			if (err.code) {
				switch (err.code) {
					case 'ECONNREFUSED':
						return callback(_makeError('Connection refused to ' + Appc.baseurl, ERROR_CONNECTION_REFUSED), null, resp);
					case 'ECONNRESET':
						return callback(_makeError('Connection reset to ' + Appc.baseurl, ERROR_CONNECTION_RESET), null, resp);
					case 'CERT_HAS_EXPIRED':
						return callback(_makeError('The servers SSL certificate at ' + Appc.baseurl + ' has expired. Refusing to connect.', ERROR_CONNECTION_INVALID_SSL), null, resp);
					case 400:
						return callback(_makeError(err, ERROR_CONNECTION_SERVER_ERROR), null, resp);
					default:
						break;
				}
			}
			return callback(_makeError(err, ERROR_CONNECTION_SERVER_ERROR));
		}
		callback(null, result, resp);
	}

	function mapper(obj, next) {
		let raw = obj;
		session._set(obj);
		_resolveUserOrg(session, function (err, data) {
			if (data && !data.key) {
				data.key = 'login';
				data.login = raw;
			}
			next(err, data);
		});
	}

	let session = new Session();
	let r = Appc.createRequest(session, '/api/v1/auth/login', 'post', checkError, mapper);
	let form = r.form();
	let fields = { username, password, from, deviceid, keepMeSignedIn: 'true' };
	Object.keys(fields).forEach(function (field) {
		form.append(field, fields[field]);
	});
	debug('form parameters for %s, %o', r.url, Object.assign({}, fields, { password: '[REDACTED]' }));
};

/**
 * logout. once this method completes the session will no longer be valid
 */
function logout(session, callback) {
	Appc.createRequest(session, '/api/v1/auth/logout', function (e) {
		session._invalidate();
		callback && callback(e);
	});
};

/**
 * switch the user's logged in user
 *
 * @param  {Object}   session - session
 * @param  {Object}   orgId - orgId
 * @param  {Function} callback - callback
 */
function switchLoggedInOrg(session, orgId, callback) {
	Appc.Org.getById(session, orgId, function (err, org) {
		if (err) {
			return callback(err);
		}

		let req = Appc.createRequest(session, '/api/v1/auth/switchLoggedInOrg', 'post', callback, function mapper(obj, next, resp) {
			let cookies;

			// switch will invalidate previous session so we need to get the new session id
			if (resp.headers['set-cookie'] instanceof Array) {
				cookies = resp.headers['set-cookie'].map(function (c) {
					return (tc.parse(c));
				});
			} else {
				cookies = [ tc.parse(resp.headers['set-cookie']) ];
			}

			let sid;
			if (cookies) {
				for (let c = 0; c < cookies.length; c++) {
					let cookie = cookies[c];
					if (cookie.key === 'connect.sid') {
						session.id = sid = decodeURIComponent(cookie.value);
						break;
					}
				}
			}

			cachedUser = null;
			cachedUserKey = null;
			Appc.Auth.createSessionFromID(sid, function (err, newsession) {
				if (err) {
					return next(err);
				}

				if (newsession) {
					Appc.Auth.cacheSession(newsession);
				}

				next(null, obj, newsession);
			});
		});

		if (req) {
			let form = req.form();
			form.append('org_id', orgId);
			debug('form parameters for %s, %o', req.url, form);
		}
	});
};

/**
 * from a current logged in authenticated request, return a new Session object
 * or return ERROR_NOT_AUTHORIZED if not logged in (no valid session cookie)
 */
function createSessionFromRequest(req, callback) {
	if (!req.cookies) {
		return callback(_makeError('not logged in', ERROR_NOT_AUTHORIZED));
	}
	let id = req.cookies['dashboard.sid'] || req.cookies['connect.sid'];
	if (!id) {
		return callback(_makeError('not logged in', ERROR_NOT_AUTHORIZED));
	}
	return createSessionFromID(id, callback);
};

/**
 * from an existing authenticated session, create a new Session object
 */
function createSessionFromID(id, callback) {
	// if we already have it, continue to use it
	if (cachedSession && cachedSessionKey === id) {
		debug('found cached session %s', id);
		return callback(null, cachedSession);
	}
	let url = require('url'),
		async = require('async'),
		parse = url.parse(Appc.baseurl),
		isIP = (/^\d{1,3}(?:\.\d{1,3}){3}/).test(parse.hostname),
		host = isIP ? parse.hostname : parse.host,
		tok = host.split('.'),
		subdomain = isIP ? null : tok.splice(tok.length - 2, 2).join('.'),
		session = new Session(host, subdomain);

	session.id = id;

	// for now, since we are transitioning cookies both from FQDN to base domain
	// AND we are renaming the cookie, we need to go ahead and set for all cases
	// to work across both production and pre-production until it's fully rolled out
	async.series([
		function (cb) {
			_setCookieForDomain(session, 'connect.sid', id, host, cb);
		},
		function (cb) {
			_setCookieForDomain(session, 'connect.sid', id, subdomain, cb);
		}
	], function (err) {
		if (err) {
			return callback(err);
		}
		// fetch the current user and org docs and set it on the session
		Appc.createRequest(session, '/api/v1/auth/findSession', function (err, body, res) {
			if (err) {
				return callback(err);
			}
			if (!body || !body.user || !body.org) {
				return callback(_makeError('invalid session', ERROR_NOT_AUTHORIZED));
			}
			session.user = body.user;
			session.org = {
				name: body.org.name,
				guid: body.org.guid,
				org_id: body.org.org_id,
				package: body.org.package,
				packageId: body.org.packageId
			};

			let entitlements = body.org.entitlements;
			entitlements.id = body.org.packageId;
			entitlements.name = body.org.package;
			if (!entitlements.partners) {
				entitlements.partners = [];
			}

			!!body.org.limit_performance_users && !~entitlements.partners.indexOf('crittercism') && entitlements.partners.push('crittercism');
			!!body.org.limit_performance_users && !~entitlements.partners.indexOf('crash') && entitlements.partners.push('crash');
			!!body.org.limit_test_users && !~entitlements.partners.indexOf('soasta') && entitlements.partners.push('soasta');

			!~entitlements.partners.indexOf('acs') && entitlements.partners.push('acs');
			!~entitlements.partners.indexOf('analytics') && entitlements.partners.push('analytics');

			session.entitlements = entitlements;
			_resolveUserOrg(session, function (err) {
				cachedSession = session;
				cachedSessionKey = id;
				callback(err, session, res);
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
function requestLoginCode(session, sms, callback) {
	Appc.User.find(session, function (err, user, res) {
		if (err) {
			return callback(err, null, res);
		}
		if (user.disable_2fa) {
			return callback(_makeError('Two-factor authentication is disabled', ERROR_TWOFACTOR_DISABLED));
		}
		if (sms && !user.phone) {
			return callback(_makeError('No SMS number configured. Please configure your SMS number in your profile to use SMS verification.', ERROR_NO_PHONE_CONFIGURED));
		}
		let r = Appc.createRequest(session, '/api/v1/auth/deviceauth/resend', 'post', function (err, body) {
			if (err) {
				return callback(err);
			}
			callback(null, body, res);
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
function validateSession(object, callback) {
	// pass any of the following:
	// - session object
	// - http request object
	// - sid as string
	let sid = typeof object === 'object' ? object.jar && object.id || (object.cookies && (object.cookies['connect.sid'] || object.cookies['dashboard.sid'])) : object,
		request = require('request'),
		cookie = 'connect.sid=' + sid + '; dashboard.sid=' + sid,
		opts = {
			method: 'get',
			url: require('url').resolve(Appc.baseurl, '/api/v1/auth/checkSession'),
			headers: {
				'Accept': 'text/json, application/json',
				'Cookie': object && object.headers && object.headers.cookie || cookie,
				'User-Agent': Appc.userAgent
			},
			timeout: 30000,
			forever: true,
			gzip: true
		};

	if (process.env.APPC_CONFIG_PROXY && process.env.APPC_CONFIG_PROXY !== 'undefined') {
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
		opts.agent = false;
		opts.rejectUnauthorized = false;
	}
	request(opts, Appc.createAPIResponseHandler(callback));
};

/**
 * given a user code, check for validation of this code
 *
 * @param {Object} session object
 * @param {String} code for verification
 * @parma {Function} callback returns true (as 2nd parameter) if valid
 */
function verifyLoginCode(session, code, callback) {
	var r = Appc.createRequest(session, '/api/v1/auth/deviceauth', 'post', function (err, result, resp) {
		if (err) {
			return callback(err, null, resp);
		}
		if (result.expired) {
			return callback(_makeError('Your authorization code has expired.', ERROR_AUTH_CODE_EXPIRED));
		}
		if (!result.valid) {
			return callback(_makeError('Your authorization code was invalid.', ERROR_AUTH_CODE_INVALID));
		}
		return callback(null, !!result.valid, resp);
	});
	if (r) {
		let form = r.form();
		form.append('code', code);
	}
};

/**
 * invalidate any cached sessions
 */
function invalidCachedSession() {
	debug('invalidCachedSession');
	cachedSessionKey = null;
	cachedSession = null;
};

/**
 * cause a new session to be cached
 */
function cacheSession(session) {
	if (session) {
		cachedSessionKey = session.id;
		cachedSession = session;
	}
};

/**
 * Make an error object
 * @param  {string} msg - error message
 * @param  {number} code - error code
 * @return {Object} - error object
 */
function _makeError(msg, code) {
	if (msg instanceof Error) {
		msg.error = code;
		return msg;
	}
	let error = new Error(msg);
	error.code = code;
	return error;
}

/**
 * Resolve user organization
 * @param  {Object}   session - session
 * @param  {Function} next - next
 */
function _resolveUserOrg(session, next) {
	// find our orgs
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	Appc.Org.find(session, function (err, orgs, resp) {
		if (err) {
			return next(err, null, resp);
		}
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
			session.user.org_id = orgs.find(function (org) {
				return org.guid === session.user.default_org;
			}).org_id;
			session.user.org = session.orgs[session.user.org_id];
		}
		next(null, session, resp);
	});
}

/**
 * Set cookie for domain
 */
function _setCookieForDomain(session, name, value, domain, callback) {
	var cookie = new tc.Cookie();
	cookie.key = name;
	cookie.value = value;
	cookie.secure = Appc.secureCookies;
	cookie.httpOnly = true;
	cookie.path = '/';
	cookie.domain = domain;
	cookie.expires = Infinity;
	cookie.hostOnly = false;
	cookie.creation = new Date();
	cookie.lastAccessed = new Date();
	session.jar.setCookie(cookie.toString(), Appc.baseurl, function (err, cookie) {
		if (err) {
			return callback(err);
		}
		if (!cookie) {
			return callback(new Error('session cookie not set'));
		}
		callback(null, cookie);
	});
}
