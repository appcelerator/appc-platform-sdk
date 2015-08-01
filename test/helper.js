var ConfigLoader = require('./conf/loader').load(),
	_ = require('underscore'),
	registry = require('appc-registry-sdk'),
	should = require('should'),
	gm = require('gmail'),
	mailParser = require('mailparser').MailParser,
	gmStart = new Date(),
	gmail = new gm.GMailInterface(),
	twilio = require('twilio'),
	twclient = twilio(global.$config.twilio.account_sid, global.$config.twilio.auth_token),
	AppC = require('../');

exports.fakeUser = getFakeUser();
exports.cloneSession = cloneSession;
exports.getCloudEnvironment = getCloudEnvironment;
exports.registryLogin = registryLogin;
exports.getAuthCode = getAuthCode;
exports.getRequest = getRequest;

/**
 * Performs a try/catch on the Cloud.getEnvironment function so that it cleans up the unit tests
 * @param session
 * @param type
 * @param name
 * @param callback
 * @returns {*}
 */
function getCloudEnvironment(session, type, name, callback) {
	try {
		return callback(null, AppC.Cloud.getEnvironment(session, type, name));
	} catch (err) {
		return callback(err);
	}
}

/**
 * Helper function to log into the registry
 * @param username    platform username
 * @param password    platform password
 * @param callback    called after login finishes
 */
function registryLogin(username, password, callback) {
	var api = new registry('login');
	api.baseurl = AppC.registryurl;
	api.body({
		username: username,
		password: password,
		ipaddress: '0.0.0.0',
		fingerprint: 'unittest',
		fingerprint_description: 'unittest'
	});
	api.send(function (err, res) {
		if (err) { return callback(err); }
		if (res && res.body && res.body.session) {
			return callback(null, res.body.session);
		} else {
			return callback(new Error('Malformed response from registry'));
		}
	});
}

/**
 * returns credentials for a unique fake user
 * @returns {{username: string, password: string}}
 */
function getFakeUser() {
	return {
		'username' : 'fake_' + Date.now(),
		'password' : 'test'
	};
}

/**
 * Returns a duplicate of the session object passed in
 * @param session
 */
function cloneSession(session) {
	var clone = _.map(clone, _.clone(session));
	clone._invalidate = session._invalidate;
	clone._set = session._set;
	clone.invalidate = session.invalidate;
	clone.isValid = session.isValid;
	return clone;
}

/**
 * Fetch the auth code which was sent via email or sms
 * @param method     email or sms
 * @param callback   The callback to fire when finished
 */
function getAuthCode(method, callback) {
	switch (method) {
		case 'sms':
			getLastSMS(callback);
			break;
		case 'email':
			loginGmail(global.$config.gmail.email, global.$config.gmail.password, function (err) {
				if (err) { return callback (err); }
				retryGetLastEmail(15000, 20, function (err, email) {
					if (email && email.html && email.html.match(/Authorization Code: <b>([0-9]{4})/)) {
						return callback(null, email.html.match(/Authorization Code: <b>([0-9]{4})/)[1]);
					} else {
						return callback (err || 'No email found');
					}
				});
			});
			break;
		default:
			callback(new Error('Invalid method specified'));
	}
}

/**
 * Log in to gmail using the provided email and password.
 *
 * @param email     Email address to log in to
 * @param password  Password to use during log in
 * @param callback  The callback to fire when finished
 *
 * @returns         Any errors that occurred during login
 */
function loginGmail(email, password, callback) {
	gmail.connect(email, password, function (err) {
		callback(err);
	});
}

/**
 * Retrieve the most recent email in the inbox.
 *
 * @param callback  The callback to fire when finished
 *
 * @returns {Error} No emails could be found
 * @returns {JSON}  The most recent email in the inbox
 */
function getLastEmail(callback) {
	var fetcher = gmail.get({
			since: gmStart
		}),
		lastMessageId,
		lastMessage;

	fetcher.on('fetching', function (ids, cancel) {
		if (ids.length === 0) {
			cancel();
			return callback(new Error('No emails in the inbox'), null);
		} else {
			lastMessageId = ids[ids.length - 1];
		}
	});

	fetcher.on('fetched', function (message) {
		message.should.have.property('uid');
		// we are interested in the last message
		if (+message.uid === +lastMessageId) {
			lastMessage = message.eml;
		}
	});

	fetcher.on('end', function () {
		// Parse the email after it has been received
		var parser = new mailParser();
		parser.on('end', function (mail) {
			callback(null, mail);
		});
		parser.write(lastMessage);
		parser.end();
	});
}

/**
 * a basic method to re-call a function until no error occurs or .
 * @param fn
 * @param timeout
 * @param times
 * @param cb
 */
function retryGetLastEmail(timeout, times, cb) {
	setTimeout(function () {
		getLastEmail(function (err, res) {
			if (err) {
				if (!--times) {
					return cb(err);
				}
				retryGetLastEmail(timeout, times, cb);
			} else {
				return cb(err, res);
			}
		});
	}, timeout);
}

/**
 * A function to fetch the last SMS with an auth code recieved from twilio
 * @param callback
 */
function getLastSMS(callback) {
	twclient.sms.messages.list(function (err, results) {
		for (var c = 0; c < results.sms_messages.length; c++) {
			var message = results.sms_messages[c];
			if (message.direction === 'inbound') {
				var match = /Appcelerator (device|phone) (authorization|verification) code: (\d{4})/.exec(message.body);
				if (match && match.length) {
					callback(null, match[3]);
					break;
				}
			}
		}
	});
}

/**
 * A function to get a request object
 * @param session
 * @returns {Object}
 */
function getRequest(session) {
	return AppC.createRequest(session, '/api/v1/auth/checkSession');
}
