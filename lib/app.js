/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

/**
 * make a request to AppC platform for fetching app information
 */
var fs = require('fs'),
	debug = require('debug')('appc:sdk'),
	AppC = require('./index');

module.exports = App;

/**
 * App object
 */
function App() {
}

/**
 * find the apps that the logged in has access to
 *
 * @param {Object} session
 * @param {string} org id
 * @param {Function} callback
 */
App.findAll = function findAll(session, orgId, callback) {
	if (orgId && typeof(orgId) === 'function') {
		callback = orgId;
		orgId = null;
	}
	AppC.createRequest(session, '/api/v1/app' + (orgId ? ('?org_id=' + orgId) : ''), callback);
};

/**
 * find a specific app by id
 *
 * @param {Object} session
 * @param {string} app id
 * @param {Function} callback
 */
App.find = function find(session, appId, callback) {
	AppC.createRequest(session, '/api/v1/app/' + appId, callback);
};

/**
 * update an app
 *
 * @param {Object} session
 * @param {Object} app object to update
 * @param {Function} callback
 */
App.update = function update(session, app, callback) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var guid = app.app_guid;
	if (!guid) {
		return callback(new Error('no app_guid property found'));
	}
	AppC.createRequest(session, '/api/v1/app/' + guid, 'put', callback, app);
};

/**
 * create or update an application from tiapp.xml file
 *
 * @param {Object} session
 * @param {string} file location (path) to tiapp.xml
 * @param {string} orgId if not supplied, use the current logged in org
 * @param {Function} callback
 */
App.create = function create(session, tiappxml, orgId, callback) {
	if (typeof(orgId) === 'function' || orgId === null) {
		if (!!orgId) {
			callback = orgId;
		}
		// use the current session
		// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
		if (session && session.user && session.user.org_id) {
			orgId = session.user.org_id;
		} else {
			return callback(new Error('session is not valid'));
		}
	}
	if (!fs.existsSync(tiappxml)) {
		return callback(new Error('tiapp.xml file does not exist'));
	}
	// jscs:disable jsDoc
	fs.readFile(tiappxml, function (err, data) {
		if (err) {
			return callback(err);
		}
		App.updateTiApp(session, orgId, data, callback);
	});
};

App.crittercismID = function crittercismID(session, guid, callback) {
	AppC.createRequest(session, '/api/v1/app/' + guid + '/crittercism_id', callback);
};

App.updateTiApp = function (session, orgId, tiappxml, callback) {
	var req = AppC.createRequest(session, '/api/v1/app/saveFromTiApp?org_id=' + orgId, 'post', callback);
	if (req) {
		var form = req.form();
		form.append('tiapp', tiappxml, {filename: 'tiapp.xml'});
		debug('form parameters for %s, %o', req.url, form);
	}
};

/**
 * find an application package by application guid
 * can be called with token or session
 * INTERNAL ONLY
 */
App.findPackage = function findPackage(session, guid, token, callback) {
	if (typeof(session) === 'string') {
		callback = token;
		token = guid;
		guid = session;
		session = null;
	} else if (typeof(token) === 'function') {
		callback = token;
	}
	AppC.createRequest(session || token, '/api/v1/app/' + guid + '/package', callback);
};

/**
 * for a given application guid, find the configuration application teams
 */
App.findTeamMembers = function findTeamMembers(session, guid, callback) {
	AppC.createRequest(session, '/api/v1/app/' + guid + '/team', callback);
};

/**
 * delete a specific app by id
 * @param {Object} session
 * @param {String} app id
 * @param {Function} callback
 */
App.delete = function (session, appId, callback) {
	AppC.createRequest(session, '/api/v1/app/' + appId, 'del', callback);
};
