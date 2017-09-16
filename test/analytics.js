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

	before(function (done) {
		app = express();
		app.set('port', 4000 + parseInt(1000 * Math.random()));
		app.use(bodyparser.json());
		app.post('/track', function (req, resp, next) {
			resp.json(req.body);
			notifier && notifier(null, req.body);
		});
		fs.existsSync(Appc.Analytics.analyticsDir) && wrench.rmdirSyncRecursive(Appc.Analytics.analyticsDir);
		app.listen(app.get('port'), function () {
			originalUrl = Appc.Analytics.url;
			originalInterval = Appc.Analytics.flushInterval;
			Appc.Analytics.url = 'http://127.0.0.1:' + app.get('port') + '/track';
			done();
		});
	});

	after(function (done) {
		Appc.Analytics.url = originalUrl;
		Appc.Analytics.flushInterval = originalInterval;
		fs.existsSync(Appc.Analytics.analyticsDir) && wrench.rmdirSyncRecursive(Appc.Analytics.analyticsDir);
		done();
	});

	afterEach(function () {
		Appc.Analytics.stopFlush();
		Appc.Analytics.url = 'http://127.0.0.1:' + app.get('port') + '/track';
		notifier = null;
		fs.existsSync(Appc.Analytics.analyticsDir) && wrench.rmdirSyncRecursive(Appc.Analytics.analyticsDir);
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

	it.skip('should send analytics data with no callback', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.flushInterval = 1000;
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
		Appc.Analytics.sendEvent('guid', { data: { a: 1 } });
	});

	it.skip('should send analytics data immediate', function (done) {
		should(Appc.Analytics).be.an.object;
		notifier = function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(1);
			should(result[0]).have.property('id');
			should(result[0]).have.property('aguid', 'guid');
			done();
		};
		Appc.Analytics.sendEvent('guid', null, null, true);
	});

	it('should send analytics to real url and get back result', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.url = originalUrl;
		Appc.Analytics.sendEvent(global.$config.apps.enterprise.app_guid, 'app.feature', {}, function (err, result, sent) {
			should(err).not.be.ok();
			should(result).be.an.array;
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

	it.skip('should send analytics after queuing', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.flushInterval = 10;
		notifier = function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
			should(result).have.length(4);
			should(result[0].data).be.eql({ a: 1 });
			should(result[1].data).be.eql({ a: 2 });
			should(result[2].data).be.eql({ a: 3 });
			should(result[3].data).be.eql({ a: 4 });
			done();
		};
		Appc.Analytics.sendEvent('guid', { data: { a: 1 } });
		Appc.Analytics.sendEvent('guid', { data: { a: 2 } });
		Appc.Analytics.sendEvent('guid', { data: { a: 3 } });
		Appc.Analytics.sendEvent('guid', { data: { a: 4 } });
	});

	it.skip('should send session start and end', function (done) {
		should(Appc.Analytics).be.an.object;
		Appc.Analytics.flushInterval = 10;
		var session;
		notifier = function (err, result) {
			should(err).not.be.ok();
			should(result).be.an.array;
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
		session.send({ a: 1 });
		session.end();
	});

});
