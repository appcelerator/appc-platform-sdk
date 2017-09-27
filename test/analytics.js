'use strict';

/* eslint-disable no-unused-expression ignore */

const fs = require('fs');

const bodyparser = require('body-parser');
const express = require('express');
const request = require('request');
const should = require('should');
const wrench = require('wrench');

const helper = require('./lib/helper');

const Appc = require('../');

let app;
let notifier;
let originalUrl;
let originalInterval;

describe('Appc.Analytics', function () {

	this.timeout(30000);

	function cleanup() {
		if (fs.existsSync(Appc.Analytics.dir)) {
			wrench.rmdirSyncRecursive(Appc.Analytics.dir);
		}
	}

	function proxy() {
		Appc.Analytics.configure({ url: 'http://127.0.0.1:' + app.get('port') + '/track' });
	}

	before(function (done) {
		app = express();
		app.set('port', 4000 + parseInt(1000 * Math.random()));
		app.use(bodyparser.json());
		app.post('/track', function (req, resp) {
			resp.status(204).end();
			notifier && setImmediate(notifier.bind(notifier, null, req.body));
		});
		app.listen(app.get('port'), function () {
			originalUrl = Appc.Analytics.url;
			originalInterval = Appc.Analytics.flushInterval;
			proxy();
			done();
		});
	});

	after(function () {
		Appc.Analytics.configure({
			url: originalUrl,
			interval: originalInterval
		});
	});

	beforeEach(cleanup);
	afterEach(function () {
		proxy();
		cleanup();
	});

	it('should send analytics data with guid and event only', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.sendEvent('guid', 'app.feature', null, function (err, result, sent) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(sent).be.true;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('mid');
			should(result[0]).have.property('aguid', 'guid');
			should(result[0]).have.property('deploytype', 'production');
			should(result[0]).have.property('ts');
			should(result[0]).have.property('event', 'app.feature');
			should(result[0]).have.property('data');
			should(result[0]).have.property('ver', '3');
			should(Date.parse(result[0].ts)).be.a.Date;
			should(result[0].id).match(/^[\w-]{16,}$/);
			should(result[0].data).be.eql({});
			done();
		});
	});

	it('should send analytics data with guid, event and mid', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.sendEvent('guid', 'app.feature', { mid: 'mid' }, function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('mid', 'mid');
			should(result[0]).have.property('aguid', 'guid');
			should(result[0]).have.property('deploytype', 'production');
			should(result[0]).have.property('ts');
			should(result[0]).have.property('event', 'app.feature');
			should(result[0]).have.property('data');
			should(result[0]).have.property('ver', '3');
			should(Date.parse(result[0].ts)).be.a.Date;
			should(result[0].id).match(/^[\w-]{16,}$/);
			should(result[0].data).be.eql({});
			done();
		});
	});

	it('should send analytics data with guid, mid, event, data', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.sendEvent('guid', 'app.feature', { mid: 'mid', data: { a: 1 } }, function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('mid', 'mid');
			should(result[0]).have.property('aguid', 'guid');
			should(result[0]).have.property('deploytype', 'production');
			should(result[0]).have.property('ts');
			should(result[0]).have.property('event', 'app.feature');
			should(result[0]).have.property('data');
			should(result[0]).have.property('ver', '3');
			should(Date.parse(result[0].ts)).be.a.Date;
			should(result[0].id).match(/^[\w-]{16,}$/);
			should(result[0].data).be.eql({ a:1 });
			done();
		});
	});

	it('should send analytics data with guid, mid, data, event, deploytype', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.sendEvent('guid', 'event', { mid: 'mid', deploytype: 'deploytype', data: { a: 1 } }, function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('mid', 'mid');
			should(result[0]).have.property('aguid', 'guid');
			should(result[0]).have.property('deploytype', 'deploytype');
			should(result[0]).have.property('ts');
			should(result[0]).have.property('event', 'event');
			should(result[0]).have.property('data');
			should(result[0]).have.property('ver', '3');
			should(Date.parse(result[0].ts)).be.a.Date;
			should(result[0].id).match(/^[\w-]{16,}$/);
			should(result[0].data).be.eql({ a:1 });
			done();
		});
	});

	it('should send analytics data with guid, mid, data, event, deploytype and sid', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.sendEvent('guid', 'event', { mid: 'mid', deploytype: 'deploytype', sid: 'sid-sid-sid-sid-sid-sid', data: { a: 1 } }, function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('sid', 'sid-sid-sid-sid-sid-sid');
			should(result[0]).have.property('mid', 'mid');
			should(result[0]).have.property('aguid', 'guid');
			should(result[0]).have.property('deploytype', 'deploytype');
			should(result[0]).have.property('ts');
			should(result[0]).have.property('event', 'event');
			should(result[0]).have.property('data');
			should(result[0]).have.property('ver', '3');
			should(Date.parse(result[0].ts)).be.a.Date;
			should(result[0].id).match(/^[\w-]{16,}$/);
			should(result[0].data).be.eql({ a:1 });
			done();
		});
	});

	it('should send analytics data with no callback', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.configure({ interval: 1000 });
		notifier = function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('aguid', 'guid');
			should(result[0]).have.property('data');
			should(result[0].data).be.eql({ a: 1 });
			done();
		};
		Appc.Analytics.sendEvent('guid', 'event', { data: { a: 1 } });
	});

	it('should send analytics data immediate', function (done) {
		should(Appc.Analytics).be.an.object;
		notifier = null;
		Appc.Analytics.sendEvent('guid', 'event', {}, function (err, result, sent) {
			should(err).not.be.ok();
			should(result).be.an.Array();
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('aguid', 'guid');
			should(sent).equal(true);
			done();
		}, true);
	});

	it('should send analytics to real url and get back result', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.configure({ url: originalUrl });
		Appc.Analytics.sendEvent(global.$config.apps.enterprise.app_guid, 'app.feature', {}, function (err, result, sent) {
			should(err).not.be.ok();
			should(result).be.an.Array();
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('mid');
			should(result[0]).have.property('aguid', global.$config.apps.enterprise.app_guid);
			should(result[0]).have.property('deploytype', 'production');
			should(result[0]).have.property('ts');
			should(result[0]).have.property('event', 'app.feature');
			should(result[0]).have.property('data', {});
			should(result[0]).have.property('ver', '3');
			should(Date.parse(result[0].ts)).be.a.Date;
			should(result[0].id).match(/^[\w-]{16,}$/);
			should(sent).be.true;
			done();
		});
	});

	it('should send analytics after queuing', function (done) {
		should(Appc.Analytics).be.an.Object();
		notifier = function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.Array();
			should(result).have.length(4);
			should(result[0].data).be.eql({ a: 1 });
			should(result[1].data).be.eql({ a: 2 });
			should(result[2].data).be.eql({ a: 3 });
			should(result[3].data).be.eql({ a: 4 });
			done();
		};
		Appc.Analytics.configure({ interval: 100 });
		function triggerSend(order) {
			setTimeout(() => Appc.Analytics.sendEvent('guid', 'event', { data: { a: order } }), order * 5);
		};
		triggerSend(1);
		triggerSend(2);
		triggerSend(3);
		triggerSend(4);
	});

	it('should send session start and end', function (done) {
		should(Appc.Analytics).be.an.Object();
		Appc.Analytics.configure({ interval: 100 });
		var session;
		notifier = function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.Array();
			should(result).have.length(3);
			should(result[0]).have.property('event', 'ti.start');
			should(result[1]).have.property('event', 'app.feature');
			should(result[2]).have.property('event', 'ti.end');
			should(result[0]).have.property('sid', session.sid);
			should(result[1]).have.property('sid', session.sid);
			should(result[2]).have.property('sid', session.sid);
			done();
		};
		session = Appc.Analytics.createSession('guid');
		should(session).be.an.object;
		should(session.end).be.a.function;
		setTimeout(() => session.send('app.feature', { a: 1 }), 5);
		setTimeout(() => session.end(), 10);
	});
});
