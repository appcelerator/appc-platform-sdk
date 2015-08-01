/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

/**
 * make a request to AppC platform for fetching org information
 */
var AppC = require('./index'),
	cachedOrgKey,
	cachedOrg;

module.exports = Org;

/**
 * Org object
 */
function Org() {
}

/**
 * Find the orgs that the logged in user belongs to
 *
 * @param  {Object}   session - session
 * @param  {Function} callback - callback
 * @return {Function} - callback function
 */
Org.find = function find(session, callback) {

	if (!session || !session.id || !session.user) {
		return callback(new Error('session is not valid'));
	}

	if (cachedOrg && cachedOrgKey === session.id) {
		return callback(null, cachedOrg);
	}
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var params = '?include_created=true&include_inactive=false';
	AppC.createRequest(session, '/api/v1/user/organizations' + params, function (err, org) {
		if (err) {
			return callback(err);
		}
		cachedOrg = org;
		cachedOrgKey = session.id;
		return callback(null, org);
	});
};

/**
 * Return an organization by checking the session
 *
 * @param  {Object}   session - session
 * @param  {number}   id - id
 * @param  {Function} callback - callback
 * @return {Function} - callback function
 */
Org.getById = function getById(session, id, callback) {
	try {
		var orgId = session.orgs[id];
		if (!orgId) {
			return callback(new Error('id is not valid'));
		}
		return callback(null, orgId);
	} catch (e) {
		return callback(new Error('session is not valid'));
	}
};

/**
 * Find organization for a given org id
 *
 * @param  {Object}   session - session
 * @param  {number}   id - id
 * @param  {Function} callback - callback
 */
Org.findById = function findById(session, id, callback) {
	if (!id) {
		return callback(new Error('id is not valid'));
	}
	AppC.createRequest(session, '/api/v1/org/' + id, callback);
};

/**
 * Get an organization by name
 *
 * @param  {Object}   session - session
 * @param  {string}   name - name
 * @param  {Function} callback - callback
 * @return {Function} - callback function
 */
Org.getByName = function getByName(session, name, callback) {
	try {
		var keys = Object.keys(session.orgs || {}),
			length = keys.length;
		for (var c = 0; c < length; c++) {
			var orgId = keys[c],
				org = session.orgs[orgId];
			if (org.name === name) {
				return callback(null, org);
			}
		}
		return callback(new Error('Org not found'));
	} catch (e) {
		return callback(new Error('session is not valid'));
	}
};

/**
 * Return the current logged in organization
 *
 * @param  {Object}   session - session
 * @return {Function} - callback function
 */
Org.getCurrent = function getCurrent(session, callback) {
	if (session && session.user && session.user.org) {
		return callback(null, session.user.org);
	} else {
		return callback(new Error('session is not valid'));
	}
};

