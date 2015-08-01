/**
 * This source code is the intellectual property of Appcelerator, Inc.
 * Copyright (c) 2014-2015 Appcelerator, Inc. All Rights Reserved.
 * See the LICENSE file distributed with this package for
 * license restrictions and information about usage and distribution.
 */

/**
 * make a request to AppC platform for fetching feeds
 */
var querystring = require('querystring'),
	AppC = require('./index');

module.exports = Feed;

/**
 * Feed object
 */
function Feed() {
}

/**
 * find all the feeds for the logged in user
 *
 * opts can be:
 *
 * - org_id: The ID of the org that the messages were sent to
 * - app_guid: The guid of the app that the messages were sent to
 * - limit: A number of records to limit the result to
 * - since: A unix timestamp to get new messages from
 * - before: A unix timestamp to get old messages from before
 */
Feed.findAll = function findAll(session, opts, callback) {
	if (typeof(opts) === 'function') {
		callback = opts;
		opts = {};
	}
	AppC.createRequest(session, '/api/v1/feed?' + querystring.stringify(opts), callback);
};
