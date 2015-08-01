/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */
exports = module.exports = Session;

var AppC = require('./'),
	request = require('request');

/**
 * Session object
 * @param {string} host - host
 * @param {string} subdomain - subdomain
 */
function Session(host, subdomain) {
	this.jar = request.jar();
	this.host = host;
	this.subdomain = subdomain;
}

/**
 * return true if session is valid
 *
 * @return {boolean} session is valid
 */
Session.prototype.isValid = function isValid() {
	return !!(this.jar && this.user && this.id);
};

/**
 * Invalidate the session
 */
Session.prototype.invalidate = function invalidate(cb) {
	if (this.isValid()) {
		AppC.Auth.invalidCachedSession(this);
		AppC.Auth.logout(this, cb);
	}
};

//---------------------- private methods ---------------------------

/**
 * Set session information
 *
 * @param {Object} body - body
 */
Session.prototype._set = function (body) {
	this.id = body['connect.sid'] || body['dashboard.sid'];
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	this.user = {
		username: body.username,
		email: body.email,
		phone: body.phone,
		guid: body.guid,
		org_id: body.org_id
	};
	this.soastaUrl = body.concerto || 'http://appctest-2.appcelerator.com/concerto';
	this.touchtest = body.touchtest || 'http://appctest-2.appcelerator.com/concerto/touchtest';
	return this;
};

/**
 * Invalidate session
 */
Session.prototype._invalidate = function () {
	delete this.id;
	delete this.jar;
	delete this.user;
	delete this.orgs;
};
