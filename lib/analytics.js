'use strict';

/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2017 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const async = require('async');
const debug = require('debug')('Appc:sdk:analytics');
const request = require('request');
const uuid = require('uuid/v4');

const Appc = require('.');

/**
 * default location of the analytics cache
 */
let ANALYTICS_DIR = path.join(os.homedir && os.homedir() || process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE || '/tmp', '.appc-analytics');

/**
 * URL for sending data
 */
let ANALYTICS_URL = Appc.analyticsurl;

/**
 * The interval in ms to send analytics.
 *
 * This should not be set to a lower number, as we're using
 * an interval which does not wait for flush completion.
 */
let FLUSH_INTERVAL = 10000;

// exports definitions, other stuff is private
let Analytics = exports = module.exports = {
	configure,
	createSession,
	flush: flushEvents,
	sendEvent,
	startFlush,
	stopFlush
};

// define read only props to avoid modification
Object.defineProperties(module.exports, {
	dir: { get: () => ANALYTICS_DIR },
	url: { get: () => ANALYTICS_URL },
	flushInterval: { get: () => FLUSH_INTERVAL }
});

// global timeout ref
let timeout;

/**
 * Configuration hook to allow modifying state.
 *
 * @param {*} opts
 * 		the options to override internally.
 */
function configure(opts = {}) {
	ANALYTICS_DIR = opts.dir || ANALYTICS_DIR;
	ANALYTICS_URL = opts.url || ANALYTICS_URL;

	if (opts.interval) {
		FLUSH_INTERVAL = opts.interval;
		stopFlush();
		startFlush();
	}
}

/**
 * Creates a new analytics session and triggers the
 * session start event.
 *
 * This will return a new Session object which contains
 * the `end` method to invoke when the session is over.
 *
 * @param {string} app_guid
 * 		the application guid identifier.
 * @param {string} mid
 * 		the machine identifier for this device.
 * @param {string} deploytype
 * 		the deployment environment for this session.
 * @param {string} platform
 *		the platform this session is running on.
 * @param {object} data
 * 		arbitrary data to store alongside the session.
 * @returns
 * 		a new Session instance.
 */
function createSession(app_guid, mid, deploytype, platform, data) {
	return new Session(app_guid, mid, deploytype, platform).start(data);
}

/**
 * Sends a new event payload to the analytics endpoint.
 *
 * Accepts a flag to send immediately, otherwise fired
 * on interval.
 *
 * @param {string} app_guid
 * 		the application guid identifier.
 * @param {string} event_name
 * 		the event name to set against the event.
 * @param {object} props
 * 		arbitrary properties to attach to the payload.
 * @param {function} [callback]
 * 		optional callback to fire on completion.
 * @param {boolean} [immediate=false]
 * 		optional flag to fire events immediately.
 * @return {undefined}
 */
function sendEvent(app_guid, event_name, props, callback, immediate) {
	// assign at least a logging handler as the finished callback
	let finished = callback || function defaultCallback(err) {
		err && debug('sendEvent error', err);
	};

	// enforce aguid
	if (!app_guid) {
		return finished(new Error('missing required guid'));
	}

	// enforce event
	if (!event_name) {
		return finished(new Error('missing required event name'));
	}

	// Cast props if not passed as object.
	if (!props || typeof props !== 'object') {
		props = {};
	}

	if (!props.mid) {
		// get the unique machine id
		return Appc.Auth.getUniqueMachineID(function (err, machineId) {
			if (err) {
				return finished(err);
			}
			sendEvent(app_guid, event_name, Object.assign({}, props, { mid: machineId }), callback, immediate);
		});
	}

	// base event
	let event = {
		ver: '3',
		id: uuid(),
		mid: props.mid,
		aguid: app_guid,
		event: event_name,
		data: props.data || {},
		ts: new Date().toISOString(),
		deploytype: props.deploytype || 'production'
	};

	// attach optional fields
	props.sid && (event.sid = props.sid);
	props.platform && (event.platform = props.platform);

	// store the event on disk
	storeEvent(event, function (err) {
		if (err) {
			return finished(err);
		}

		// immediately send if needed (if immediate was originally
		// set to true, or a callback was provided).
		if (immediate) {
			return flushEvents(finished);
		}

		// start sending events (if not already running)
		startFlush();

		// pass back payload, false means not immediately sent
		finished(null, [ event ], false);
	});
}

/**
 * Triggers a flush schedule if one is not running.
 *
 * This is a timeout rather than an interval to control
 * the async behaviour of the triggered flush.
 */
function startFlush() {
	debug('startFlush');
	!timeout && (timeout = setTimeout(flushEvents, FLUSH_INTERVAL));
}

/**
 * Cancels a flush schedule if one is running.
 */
function stopFlush() {
	debug('stopFlush');
	timeout && clearTimeout(timeout);
	timeout = undefined;
}

/**
 * Stores an event in the internal store, before being
 * sent by the flush interval.
 *
 * @param {object} payload
 * 		an event payload to send.
 * @param {function} [callback]
 * 		an optional callback to fire on completion.
 * @private
 */
function storeEvent(payload, callback) {
	// assign a default callback in case of missing
	callback = callback || function defaultCallback(err) {
		err && debug('storeEvent failure', err);
	};

	// check the directory exists
	fs.stat(ANALYTICS_DIR, function (err, stat) {
		if (err) {
			// fs error, exit early
			if (err.code !== 'ENOENT') {
				return callback(err);
			}

			// create the missing directory structure
			return fs.mkdir(ANALYTICS_DIR, function (err) {
				if (err && err.code !== 'EEXIST') {
					return callback(err);
				}
				// add the payload
				appendPayload(payload, callback);
			});
		}

		// has to be a directory
		if (!stat.isDirectory()) {
			return callback(new Error('Analytics directory is invalid'));
		}

		// append the payload if all good
		appendPayload(payload, callback);
	});
}

/**
 * Appends a payload to the event store on disk.
 *
 * @param {object} payload
 * 		the event payload to store on disk.
 * @param {function} [callback]
 * 		an optional callback to fire on completion.
 * @private
 */
function appendPayload(payload, callback) {
	let file = path.join(ANALYTICS_DIR, Date.now() + '-' + payload.id + '.json');
	debug('appendPayload', payload, file);
	fs.writeFile(file, JSON.stringify(payload), function (err) {
		debug('appendPayload result', err);
		return err ? callback(err) : callback();
	});
}

/**
 * Flush handler for the internal events.
 *
 * This is called (typically) on interval.
 *
 * @param {function} [callback]
 * 		an optional callback to fire on completion.
 * @private
 */
function flushEvents(callback) {
	// create a default callback for debugging
	callback = callback || function defaultCallback(err) {
		err && debug('flushEvents failure', err);
	};

	// attach a hook to log errors if missing callback
	function finished(err, data, sent, cancel) {
		!cancel && startFlush();
		if (callback) {
			return callback(err, data, sent);
		}
		err && debug('flushEvents failure', err);
	}

	// read all files in the analytics directory
	fs.readdir(ANALYTICS_DIR, function (err, files) {
		if (err) {
			// return error on fs error
			debug('flushEvents error', err);
			if (err.code !== 'ENOENT') {
				return finished(err);
			}

			// stop the interval from continuing
			return finished(null, [], false, true);
		}

		// no events means we stop polling
		if (files.length === 0) {
			return callback(null, [], false, true);
		}

		// map files to ensure full path
		files = files.map(function (file) {
			return path.join(ANALYTICS_DIR, file);
		});

		async.map(
			files,
			function (file, next) {
				// read in each file and parse it as JSON
				fs.readFile(file, function (err, contents) {
					if (err) {
						return next(err);
					}
					next(null, JSON.parse(contents));
				});
			},
			function (err, data) {
				if (err) {
					return callback(err);
				}

				// req opts
				let opts = {
					url: ANALYTICS_URL,
					method: 'POST',
					json: data,
					timeout: 30000
				};

				// send the data to the analytics nedpoint
				debug('flushEvents sending', opts);
				request(opts, function (err, res) {
					// debug everything for better logging
					debug('flushEvents response', err, res.statusCode);

					// pass errors back
					if (err) {
						return callback(err);
					}

					// expect 204, error if not
					if (res.statusCode !== 204) {
						return callback(new Error('Bad response from analytics endpoint'));
					}

					// clean up all files originally read in
					debug('flushEvents cleanup');
					async.each(files, fs.unlink, function (err) {
						err && debug('flushEvents cleanup error', err);
						return err ? callback(err) : callback(null, opts.json , true);
					});
				});
			}
		);
	});
}

/**
 * Session class to represent user interaction across time.
 *
 * @param {string} guid
 * 		the guid associated with the session.
 * @param {string} mid
 * 		the machine identifier for this device.
 * @param {string} deploytype
 * 		the environment this app is deployed in.
 * @param {string} platform
 * 		the platform this app is running on.
 * @constructor
 */
function Session(guid, mid, deploytype, platform) {
	this.guid = guid;
	this.mid = mid;
	this.sid = uuid();
	this.deploytype = deploytype;
	this.platform = platform;
}

/**
 * Sends a session end event.
 *
 * @param {object} [data]
 * 		an optional data payload to send alongside.
 * @return {Session}
 * 		the current Session instance.
 */
Session.prototype.end = function end(data) {
	return this.send('ti.end', data);
};

/**
 * Sends a session event.
 *
 * @param {string} event
 * 		the event name to send.
 * @param {object} [data]
 * 		an optional data payload to send alongside.
 * @return {Session}
 * 		the current Session instance.
 */
Session.prototype.send = function send(event, data) {
	sendEvent(this.guid, event, {
		sid: this.sid,
		mid: this.mid,
		platform: this.platform,
		deploytype: this.deploytype,
		data
	});
	return this;
};

/**
 * Sends a session start event.
 *
 * @param {object} [data]
 * 		an optional data payload to send alongside.
 * @return {Session}
 * 		the current Session instance.
 */
Session.prototype.start = function start(data) {
	return this.send('ti.start', data);
};

// on shutdown, try and send any events if possible
process.once('exit', flushEvents);
