/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */
/* global unescape: true*/

/**
 * make a request to AppC platform for fetching user information
 */
var AppC = require('./index'),
	debug = require('debug')('appc:sdk'),
	tough = require('tough-cookie'),
	cachedUser,
	cachedUserKey;

module.exports = User;

/**
 * User object
 */
function User() {
}

/**
 * find a specific user or if not userId is supplied, the sessions logged
 * in user
 *
 * @param  {Object}   session - session
 * @param  {Object}   orgId - orgId
 * @param  {Function} callback - callback
 */
User.find = function find(session, userId, callback) {
	var cache = userId && userId !== 'current';
	if (typeof(userId) === 'function') {
		callback = userId;
		if (session && session.user && session.user.guid) {
			userId = session.user.guid;
		} else {
			// don't cache if using current
			userId = 'current';
			cache = false;
		}
	}
	var key = cache && (session.id + userId);
	// if we already have it cached, just return it
	if (key && cachedUser && cachedUserKey === key) {
		debug('found cached user %s', key);
		return callback(null, cachedUser);
	}

	// jscs:disable jsDoc
	AppC.createRequest(session, '/api/v1/user/' + userId, function (err, user) {
		if (err) { return callback(err); }
		if (key) {
			cachedUserKey = key;
			cachedUser = user;
		}
		return callback(null, user);
	});
};

/**
 * switch the user's logged in user
 *
 * @param  {Object}   session - session
 * @param  {Object}   orgId - orgId
 * @param  {Function} callback - callback
 */
User.switchLoggedInOrg = function switchLoggedInOrg(session, orgId, callback) {
	AppC.Org.getById(session, orgId, function (err, org) {
		if (err) { return callback(err); }
		var req = AppC.createRequest(session, '/api/v1/auth/switchLoggedInOrg', 'post', callback, function mapper(obj, next, resp) {
			var cookies;
			// switch will invalidate previous session so we need to get the new session id
			if (resp.headers['set-cookie'] instanceof Array) {
				cookies = resp.headers['set-cookie'].map(function (c) { return (tough.parse(c)); });
			} else {
				cookies = [tough.parse(resp.headers['set-cookie'])];
			}
			var sid;
			if (cookies) {
				for (var c = 0; c < cookies.length; c++) {
					var cookie = cookies[c];
					if (cookie.key === 'connect.sid') {
						session.id = sid = decodeURIComponent(cookie.value);
						break;
					}
				}
			}
			cachedUser = null;
			cachedUserKey = null;
			AppC.Auth.createSessionFromID(sid, function (err, newsession) {
				if (err) { return next(err); }
				if (newsession) { AppC.Auth.cacheSession(newsession); }
				next(null, obj, newsession);
			});
		});
		if (req) {
			var form = req.form();
			form.append('org_id', orgId);
			debug('form parameters for %s, %o', req.url, form);
		}
	});
};
