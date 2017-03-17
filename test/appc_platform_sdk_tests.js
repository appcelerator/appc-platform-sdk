// globals $config
var should = require('should'),
	helper = require('./helper'),
	path = require('path'),
	_ = require('underscore'),
	AppC,
	currentSession;

describe('appc-platform-AppC', function () {
	this.timeout(50000);
	describe('setup', function () {
		it('should create successfully', function () {
			AppC = require('../');
			should(AppC).be.an.object;
		});
	});

	describe('environment', function () {

		beforeEach(function () {
			AppC = require('../');
		});

		it('check for default', function () {
			if (process.env.NODE_ENV === 'production' ||
				process.env.APPC_ENV === 'production' ||
				!process.env.NODE_ENV  &&
				!process.env.APPC_ENV) {
				should(AppC.isProduction).be.equal(true);
			} else {
				should(AppC.isProduction).be.equal(false);
			}
		});

		it('should be production', function () {
			AppC.setProduction();
			should(AppC.isProduction).be.equal(true);
		});

		it('should not be production when set to development', function () {
			AppC.setDevelopment();
			should(AppC.isProduction).be.equal(false);
		});

		it('should not be production when set to local', function () {
			AppC.setLocal();
			should(AppC.isProduction).be.equal(false);
		});

		it('should be able to be changed on the fly', function () {
			AppC.setDevelopment();
			should(AppC.isProduction).be.equal(false);
			AppC.setProduction();
			should(AppC.isProduction).be.equal(true);
			AppC.setLocal();
			should(AppC.isProduction).be.equal(false);
		});

		it('should allow a custom environment to be set', function () {

			var customEnv = {
				baseurl: 'http://test.appcelerator.com:8080/AppC',
				isProduction: false,
				supportUntrusted: true,
				security: 'http://security.com',
				registry: 'http://registry.com',
				webevent: 'http://webevent.com',
				cache: 'http://cache.com',
				pubsub: 'http://pubsub.com'
			};

			AppC.setEnvironment(customEnv);

			should(AppC.isProduction).be.equal(false);
			should(AppC.supportUntrusted).be.equal(true);
			should(AppC.baseurl).be.equal('http://test.appcelerator.com:8080/AppC');
			should(AppC.securityurl).be.equal('http://security.com');
			should(AppC.registryurl).be.equal('http://registry.com');
			should(AppC.webeventurl).be.equal('http://webevent.com');
			should(AppC.cacheurl).be.equal('http://cache.com');
			should(AppC.pubsuburl).be.equal('http://pubsub.com');
		});
	});

	describe(global.$config.env + ' environment', function () {

		before(function () {
			currentSession = undefined;
			AppC = require('../');
			AppC.setEnvironment(global.$config.environment);
		});

		describe('auth & session', function () {
			this.timeout(250000);

			it('fake user should not be able to log in', function (done) {
				var fakeuser = helper.fakeUser;
				AppC.Auth.login(fakeuser.username, fakeuser.password, function (err, result) {
					should.not.exist(result);
					should.exist(err);
					done();
				});
			});

			it('user should be able to log in', function (done) {
				var user = global.$config.user;
				AppC.Auth.login(user.username, user.password, function (err, result) {
					should.not.exist(err);
					should.exist(result);
					currentSession = result;
					done();
				});
			});

			it('user should be able to log in using new method signature', function (done) {
				var user = global.$config.user;
				var params = {username: user.username, password: user.password};
				AppC.Auth.login(params, function (err, result) {
					should.not.exist(err);
					should.exist(result);
					currentSession = result;
					done();
				});
			});

			it('session should be valid', function () {
				should.exist(currentSession);
				currentSession.isValid().should.equal(true);
			});

			it('should be able to request an email auth code with a valid session', function (done) {
				should.exist(currentSession);
				AppC.Auth.requestLoginCode(currentSession, false, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					done();
				});
			});

			it('should not be able to request an email auth code with an invalid session', function (done) {

				var invalidSession = helper.cloneSession(currentSession);
				invalidSession.invalidate();
				invalidSession.isValid().should.equal(false);

				AppC.Auth.requestLoginCode(invalidSession, false, function (err) {
					should.exist(err);
					err.should.have.property('message');
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it.skip('should verify the email auth code that was requested earlier', function (done) {
				helper.getAuthCode('email', function (err, res) {
					should.not.exist(err);
					should.exist(res);
					AppC.Auth.verifyLoginCode(currentSession, res, function (err, res) {
						should.not.exist(err);
						should.exist(res);
						res.should.equal(true);
						done();
					});
				});
			});

			it('should be able to request an sms auth code with a valid session', function (done) {
				should.exist(currentSession);
				AppC.Auth.requestLoginCode(currentSession, true, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					done();
				});
			});

			it('should not be able to request an sms auth code with an invalid session', function (done) {
				var invalidSession = helper.cloneSession(currentSession);
				invalidSession.invalidate();
				invalidSession.isValid().should.equal(false);

				AppC.Auth.requestLoginCode(invalidSession, true, function (err) {
					should.exist(err);
					err.should.have.property('message');
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should verify the sms auth code that was requested earlier', function (done) {
				helper.getAuthCode('sms', function (err, res) {
					should.not.exist(err);
					should.exist(res);
					AppC.Auth.verifyLoginCode(currentSession, res, function (err, res) {
						should.not.exist(err);
						should.exist(res);
						res.should.equal(true);
						done();
					});
				});
			});

			it('should be able to request an email auth code with a valid session', function (done) {
				should.exist(currentSession);
				AppC.Auth.requestLoginCode(currentSession, false, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					done();
				});
			});

			it('should fail to verify an invalid auth code', function (done) {
				AppC.Auth.verifyLoginCode(currentSession, 123, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('Your authorization code was invalid.');
					done();
				});
			});

			it('should fail to verify an auth code with an invalid session', function (done) {
				AppC.Auth.verifyLoginCode({}, 1234, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					done();
				});
			});

			it('should fail if user tries to log out with an invalid session', function (done) {
				should.exist(currentSession);
				should(currentSession).be.ok;
				var invalidSession = helper.cloneSession(currentSession);
				invalidSession.invalidate();
				// try an invalidate again to get more code coverage
				invalidSession.invalidate();
				invalidSession.isValid().should.equal(false);

				AppC.Auth.logout(invalidSession, function (err) {
					should.exist(err);
					err.should.have.property('message');
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should be able to log out from valid session', function (done) {
				should.exist(currentSession);
				should(currentSession).be.ok;
				currentSession.isValid().should.equal(true);
				AppC.Auth.logout(currentSession, function (err) {
					should.not.exist(err);
					currentSession = undefined;
					should(currentSession).not.be.ok;
					done();
				});
			});

			it('should fail to create a session from invalid ID', function (done) {
				AppC.Auth.createSessionFromID('1234', function (err, session) {
					should.exist(err);
					should.not.exist(session);
					should.exist(err.message);
					err.message.should.equal('invalid session');
					done();
				});
			});

			var createdSession;

			it('should create a session from ID', function (done) {
				var username = global.$config.user.username,
					password = global.$config.user.password;
				helper.registryLogin(username, password, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					should.exist(res.sid);
					AppC.Auth.createSessionFromID(res.sid, function (err, session) {
						should.not.exist(err);
						should.exist(session);
						should.exist(session.id);
						session.id.should.equal(res.sid);
						should.exist(session.user);
						should.exist(session.user._id);
						should.exist(session.user.email);
						session.user.email.should.equal(username);
						should.exist(session.user.user_id);
						should.exist(session.user.guid);
						should.exist(session.user.org_id);
						should.exist(session.user.org);
						should.exist(session.org);
						should.exist(session.org.packageId);
						should.exist(session.orgs);
						should.exist(session.entitlements);
						should.exist(session.entitlements.id);
						should.exist(session.entitlements.name);
						createdSession = session;
						done();
					});
				});
			});

			it('should validate the session previously created', function (done) {
				AppC.Auth.validateSession(createdSession, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					done();
				});
			});

			it('should get a cached session from createSessionFromID', function (done) {
				AppC.Auth.createSessionFromID(createdSession.id, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.should.equal(createdSession);
					done();
				});
			});

			it('should invalidate a valid session', function (done) {
				createdSession.invalidate(function (err) {
					should.not.exist(err);
					AppC.Auth.validateSession(createdSession, function (err, res) {
						should.exist(err);
						should.not.exist(res);
						createdSession = null;
						done();
					});
				});
			});
		});

		describe('cloud environments', function () {
			var env = global.$config.env === 'production' ? 'production' : 'development';

			before(function (done) {
				var user = global.$config.user;
				AppC.Auth.login(user.username, user.password, function (err, result) {
					should(result).be.ok;
					should.not.exist(err);
					should.exist(result);
					currentSession = result;
					done();
				});

			});

			it('should get ACS_BASE environment', function (done) {
				helper.getCloudEnvironment(currentSession, AppC.Cloud.ACS_BASE, env, function (err, res) {
					should.exist(res);
					res.should.be.an.string;
					should.not.exist(err);
					done();
				});
			});

			it('should get NODE_ACS environment', function (done) {
				helper.getCloudEnvironment(currentSession, AppC.Cloud.NODE_ACS, env, function (err, res) {
					should.exist(res);
					res.should.be.an.string;
					should.not.exist(err);
					done();
				});
			});

			it('should get AUTH_BASE environment', function (done) {
				helper.getCloudEnvironment(currentSession, AppC.Cloud.AUTH_BASE, env, function (err, res) {
					should.exist(res);
					res.should.be.an.string;
					should.not.exist(err);
					done();
				});
			});

			it('should fail to get ACS_BASE environment with bad session', function (done) {
				helper.getCloudEnvironment({}, AppC.Cloud.AUTH_BASE, env, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.should.have.property('message');
					err.message.should.containEql('session is not valid. missing user');
					done();
				});
			});

			it('should fail to get NODE_ACS environment with bad session', function (done) {
				helper.getCloudEnvironment({}, AppC.Cloud.NODE_ACS, env, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.should.have.property('message');
					err.message.should.containEql('session is not valid. missing user');
					done();
				});
			});

			it('should fail to get AUTH_BASE environment with bad session', function (done) {
				helper.getCloudEnvironment({}, AppC.Cloud.AUTH_BASE, env, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.should.have.property('message');
					err.message.should.containEql('session is not valid. missing user');
					done();
				});
			});

			it('should fail to get a clould environment with a missing org in the session', function (done) {
				helper.getCloudEnvironment({user:{}}, AppC.Cloud.AUTH_BASE, env, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.should.have.property('message');
					err.message.should.containEql('session is not valid. missing org');
					done();
				});
			});
		});

		describe('cloud', function () {

			var api;
			var tiApp;

			before(function (done) {
				AppC.User.switchLoggedInOrg(currentSession, global.$config.user.developer_org_id, function (err, res, newSession) {
					currentSession = newSession;
					should.exist(res);
					should.not.exist(err);
					AppC.App.create(currentSession, path.join(__dirname, 'tiapptest4', 'tiapp.xml'), global.$config.user.developer_org_id, function (err, res) {
						should.not.exist(err);
						should.exist(res);
						tiApp = res;
						done();
					});
				});
			});

			after(function (done) {
				AppC.App.delete(currentSession, tiApp._id, function (err) {
					should.not.exist(err);
					done();
				});
				//TODO: Delete all apis created
			});

			it('should create a named app', function (done) {
				AppC.Cloud.createNamedApp(currentSession, 'TiAppTest_' + new Date(), function (err, res) {
					should.not.exist(err);
					should.exist(res);
					done();
				});
			});

			it('should fail to create a named app with invalid session', function (done) {
				AppC.Cloud.createNamedApp({}, 'TiAppTest_' + new Date(), function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.indexOf('session is not valid').should.not.equal(-1);
					done();
				});
			});

			it('should fail to create a named app with no name', function (done) {
				AppC.Cloud.createNamedApp(currentSession, '', function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.should.equal('Invalid parameter: name');
					done();
				});
			});

			it('should create an app', function (done) {
				AppC.Cloud.createApp(currentSession, 'TiAppTest1', global.$config.user.developer_org_id,
					tiApp.guid, function (err, res) {
						should.not.exist(err);
						should.exist(res);
						api = res[0];
						done();
					}
				);
			});

			it('should fail to create an app with invalid session', function (done) {
				AppC.Cloud.createApp({}, 'TiAppTest1', global.$config.user.developer_org_id,
					tiApp.guid, function (err, res) {
						should.exist(err);
						should.not.exist(res);
						should.exist(err.message);
						err.message.should.equal('session is not valid');
						done();
					});
			});

			it('should be able to create an app with no name', function (done) {
				AppC.Cloud.createApp(currentSession, null, global.$config.user.developer_org_id,
					tiApp.guid, function (err, res) {
						should.exist(res);
						should.not.exist(err);
						done();
					});
			});

			it('should be able to create an app with no org_id', function (done) {
				AppC.Cloud.createApp(currentSession, 'TiAppTest1', null,
					tiApp.guid, function (err, res) {
						should.exist(res);
						should.not.exist(err);
						done();
					});
			});

			it('should be able to create an app with no guid', function (done) {
				AppC.Cloud.createApp(currentSession, 'TiAppTest1', global.$config.user.developer_org_id, null, function (err, res) {
						should.not.exist(err);
						should.exist(res);
						done();
					});
			});

			it('should fail to create an app with invalid org ID', function (done) {
				AppC.Cloud.createApp(currentSession, 'TiAppTest1', '123',
					tiApp.guid, function (err, res) {
						should.exist(err);
						should.not.exist(res);
						done();
					});
			});

			it('should fail to create an app with invalid guid', function (done) {
				AppC.Cloud.createApp(currentSession, 'TiAppTest1', global.$config.user.developer_org_id,
					'123', function (err, res) {
						should.exist(err);
						should.not.exist(res);
						should.exist(err.message);
						done();
					});
			});

			var apiUser;
			it('should create an Arrow DB user object', function (done) {
				should.exist(api);
				should.exist(api.guid);
				apiUser = 'test_' + Date.now();
				AppC.Cloud.createUser(currentSession, api.guid, {
					password_confirmation: 'test',
					password: 'test',
					username: apiUser

				}, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					done();
				});
			});

			it('should retrieve the list of acs users for an app guid', function (done) {
				AppC.Cloud.retrieveUsers(currentSession, api.guid, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.username.should.equal(apiUser);
					done();
				});
			});

			it('should fail to create an Arrow DB user object with invalid api guid', function (done) {
				AppC.Cloud.createUser(currentSession, '123', {
					password_confirmation: 'test',
					password: 'test',
					username: 'test_' + Date.now()

				}, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.containEql('could not locate a document in the apis collection for the guid:');
					done();
				});
			});

			it('should fail to create an Arrow DB user object with not enough credentials', function (done) {
				should.exist(api);
				should.exist(api.guid);
				AppC.Cloud.createUser(currentSession, api.guid, {
					password_confirmation: 'test',
					password: 'test'

				}, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('Failed to create user: Validation failed - A username, email or external account is required.');
					done();
				});
			});
		});

		describe('app', function () {

			it('should get all the apps in the current org that the user has access to', function (done) {
				AppC.User.switchLoggedInOrg(currentSession, global.$config.user.enterprise_org_id, function (err, res, newSession) {
					currentSession = newSession;
					should.exist(res);
					should.not.exist(err);
					AppC.App.findAll(currentSession, function (err, res) {
						should.not.exist(err);
						should.exist(res);
						res.length.should.not.be.below(global.$config.apps.numberOfApps);
						done();
					});
				});
			});

			it('should get all the apps in a specific org', function (done) {
				AppC.App.findAll(currentSession, global.$config.user.enterprise_org_id, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.length.should.not.be.below(global.$config.apps.numberOfApps);
					done();
				});
			});

			it('should fail to find apps in an org that the user doesnt have access to', function (done) {
				AppC.App.findAll(currentSession, 123, function (err, res) {
					should.exist(err);
					err.message.should.equal('You do not have access privileges to view this content.');
					err.code.should.equal(403);
					should.not.exist(res);
					done();
				});
			});

			it('should fail to find apps with an invalid session', function (done) {
				AppC.App.findAll({}, 123, function (err) {
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should find a specific app by ID', function (done) {
				AppC.App.find(currentSession, global.$config.apps.enterprise.app_id, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.app_name.should.equal(global.$config.apps.enterprise.app_name);
					done();
				});
			});

			it('should fail to find an invalid app by ID', function (done) {
				AppC.App.find(currentSession, 1, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					done();
				});
			});

			it('should fail to a valid app with an invalid session', function (done) {
				AppC.App.find({}, global.$config.apps.enterprise.app_id, function (err) {
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should update an app and revert it to the original state', function (done) {
				AppC.App.find(currentSession, global.$config.apps.enterprise.app_id, function (err, app) {
					var originalName = global.$config.apps.enterprise.app_name,
						newName = global.$config.apps.enterprise.app_name + '_modified';
					should.not.exist(err);
					should.exist(app);
					app.app_name.should.equal(originalName);
					app.app_name = newName;
					AppC.App.update(currentSession, app, function (err) {
						should.not.exist(err);
						AppC.App.find(currentSession, global.$config.apps.enterprise.app_id, function (err, updatedApp) {
							should.not.exist(err);
							should.exist(app);
							updatedApp.app_name.should.equal(newName);
							updatedApp.app_name = originalName;

							AppC.App.update(currentSession, updatedApp, function (err) {
								should.not.exist(err);

								AppC.App.find(currentSession, global.$config.apps.enterprise.app_id, function (err, revertedApp) {
									should.not.exist(err);
									should.exist(revertedApp);
									revertedApp.app_name.should.equal(originalName);
									done();
								});
							});

						});
					});
				});
			});

			it('should fail to update an app which doesnt exist', function (done) {
				var newApp = {
					app_id: 123,
					app_name: 'this_should_fail_app',
					app_guid: 1234567890
				};
				AppC.App.find(currentSession, newApp, function (err, app) {
					should.not.exist(app);
					should.exist(err);
					AppC.App.update(currentSession, newApp, function (err) {
						should.exist(err);
						done();
					});
				});
			});

			it('should fail to update an app with an invalid session', function (done) {
				AppC.App.find(currentSession, global.$config.apps.enterprise.app_id, function (err, app) {
					should.not.exist(err);
					should.exist(app);
					AppC.App.update({}, app, function (err) {
						should.exist(err);
						err.message.should.equal('session is not valid');
						done();
					});
				});
			});

			it('should fail to update an invalid app', function (done) {
				AppC.App.update(currentSession, {}, function (err) {
					should.exist(err);
					err.message.should.equal('no app_guid property found');
					done();
				});
			});

			it('should fail to create an app from non-existent tiapp.xml', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest0', 'none.xml'), global.$config.user.enterprise_org_id, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('tiapp.xml file does not exist');
					done();
				});
			});

			it('should create an app from provided tiapp.xml', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest1', 'tiapp.xml'), global.$config.user.enterprise_org_id, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					AppC.App.delete(currentSession, res._id, function (err) {
						should.not.exist(err);
						done();
					});
				});
			});

			it('should create an app from provided tiapp.xml with no org id', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest1', 'tiapp.xml'), function (err, res) {
					should.not.exist(err);
					should.exist(res);
					AppC.App.delete(currentSession, res._id, function (err) {
						should.not.exist(err);
						done();
					});
				});
			});

			it('should fail create an app from provided tiapp.xml with no org id and invalid session', function (done) {
				AppC.App.create({}, path.join(__dirname, 'tiapptest1', 'tiapp.xml'), function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should create an app from provided tiapp.xml with a null org id', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest1', 'tiapp.xml'), null, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					AppC.App.delete(currentSession, res._id, function (err) {
						should.not.exist(err);
						done();
					});
				});
			});

			it('should update an app from provided tiapp.xml', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest2', 'tiapp.xml'), global.$config.user.enterprise_org_id, function (err, res) {
					should.not.exist(err);
					should.exist(res);

					AppC.App.find(currentSession, res._id, function (err, app) {
						should.not.exist(err);
						should.exist(app);
						app.app_name.should.equal('TiAppTest2_changeme');

						AppC.App.create(currentSession, path.join(__dirname, 'tiapptest2', 'tiapp_changed.xml'), global.$config.user.enterprise_org_id, function (err, res) {
							should.not.exist(err);
							should.exist(res);

							AppC.App.find(currentSession, res._id, function (err, changedApp) {
								should.not.exist(err);
								should.exist(changedApp);
								changedApp.app_name.should.equal('TiAppTest2');

								AppC.App.delete(currentSession, changedApp._id, function (err) {
									should.not.exist(err);
									done();
								});
							});
						});
					});
				});
			});

			it('should fail to create an app from invalid tiapp.xml', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest3', 'tiapp.xml'), global.$config.user.enterprise_org_id, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.code.should.equal(500);
					done();
				});
			});

			it('should fail to create an app from invalid session', function (done) {
				AppC.App.create({}, path.join(__dirname, 'tiapptest1', 'tiapp.xml'), global.$config.user.enterprise_org_id, function (err, res) {
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					should.not.exist(res);
					done();
				});
			});

			it('should fail to create a tiapp.xml app with invalid org id', function (done) {
				AppC.App.create(currentSession, path.join(__dirname, 'tiapptest1', 'tiapp.xml'), 123, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.code.should.equal(404);
					done();
				});
			});

			it('should find an enterprise package by application guid and session', function (done) {
				AppC.App.findPackage(currentSession, global.$config.apps.enterprise.app_guid, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.package.should.equal('enterprise');
					res.isPlatform.should.equal(true);
					done();
				});
			});

			it('should find an enterprise package by application guid and token', function (done) {
				AppC.App.findPackage(global.$config.apps.enterprise.app_guid, global.$config.auth_token, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.package.should.equal('enterprise');
					res.isPlatform.should.equal(true);
					done();
				});
			});

			it('should fail to find an enterprise package by application guid and invalid session', function (done) {
				AppC.App.findPackage({}, global.$config.apps.enterprise.app_guid, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should fail to find an application package by invalid application guid and session', function (done) {
				AppC.App.findPackage(currentSession, '123', function (err, res) {
					should.exist(err);
					should.exist(err.code);
					err.code.should.be.greaterThan(400);
					should.not.exist(res);
					done();
				});
			});

			it('should find a free application package by application guid and session', function (done) {
				AppC.App.findPackage(currentSession, global.$config.apps.developer.app_guid, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.isPlatform.should.equal(false);
					res.package.should.equal('free');
					done();
				});
			});

			it('should find the team members of an app', function (done) {
				AppC.App.findTeamMembers(currentSession, global.$config.apps.enterprise.app_id, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					should.exist(res.members);
					res.members.length.should.equal(1);
					res.members[0].guid.should.equal(currentSession.user.guid);
					done();
				});
			});

			it('should fail to find the team members of an invalid app', function (done) {
				AppC.App.findTeamMembers(currentSession, '123', function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.message.should.equal('Resource Not Found');
					err.code.should.equal(404);
					done();
				});
			});

			it('should fail to find the team members of an app with an invalid session', function (done) {
				AppC.App.findTeamMembers({}, global.$config.apps.enterprise.app_id, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should fail to find the team members of an app with an invalid session', function (done) {
				AppC.App.findTeamMembers({}, global.$config.apps.enterprise.app_id, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should get the crittercism ID of an enterprise app', function (done) {
				AppC.App.crittercismID(currentSession, global.$config.apps.enterprise.app_id, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					done();
				});
			});

			it('should fail to get the crittercism ID of an enterprise app with invalid session', function (done) {
				AppC.App.crittercismID({}, global.$config.apps.enterprise.app_id, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					done();
				});
			});

		});

		describe('feed', function () {

			it('should find all the feeds for the logged in user', function (done) {
				AppC.Feed.findAll(currentSession, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					should.exist(res.meta);
					should.exist(res.meta.total);
					res.meta.total.should.be.an.Number;
					should.exist(res.data);
					Object.prototype.toString.call(res.data).should.equal('[object Array]');
					if (res.data.length) {
						should.exist(res.data[0]._id);
						should.exist(res.data[0].from);
						should.exist(res.data[0].to);
						should.exist(res.data[0].templateData);
						should.exist(res.data[0].timestamp);
						should.exist(res.data[0].friendlytime);
						should.exist(res.data[0].formattedtime);
						done();
					} else {
						done();
					}
				});
			});

			it('should find all the feeds for the logged in user', function (done) {
				AppC.Feed.findAll(currentSession, {limit: 2}, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					should.exist(res.meta);
					should.exist(res.meta.total);
					res.meta.total.should.be.an.Number;
					should.exist(res.data);
					Object.prototype.toString.call(res.data).should.equal('[object Array]');
					if (res.data.length) {
						res.length.should.not.be.greaterThan(2);
						should.exist(res.data[0]._id);
						should.exist(res.data[0].from);
						should.exist(res.data[0].to);
						should.exist(res.data[0].templateData);
						should.exist(res.data[0].timestamp);
						should.exist(res.data[0].friendlytime);
						should.exist(res.data[0].formattedtime);
						done();
					} else {
						done();
					}
				});
			});

			it('should fail to find all the feeds for an invalid session', function (done) {
				AppC.Feed.findAll({}, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('session is not valid');
					done();
				});
			});
		});

		describe('notification', function () {
			it('should find all the notifications for the logged in user', function (done) {
				AppC.Notification.findAll(currentSession, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					Object.prototype.toString.call(res).should.equal('[object Array]');
					if (res.length) {
						should.exist(res[0]._id);
						should.exist(res[0].feed_id);
						should.exist(res[0].user_guid);
						should.exist(res[0].message);
						should.exist(res[0].created);
						done();
					} else {
						done();
					}
				});
			});

			it('should fail to find all the notifications for an invalid session', function (done) {
				AppC.Notification.findAll({}, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					err.message.should.equal('session is not valid');
					done();
				});
			});
		});

		describe('org', function () {

			var orgName;
			before(function (done) {
				AppC.User.switchLoggedInOrg(currentSession, global.$config.user.developer_org_id, function (err, res, newSession) {
					currentSession = newSession;
					res.org_id.toString().should.equal(global.$config.user.developer_org_id);
					done();
				});
			});

			it('should return the current user org', function (done) {
				AppC.Org.getCurrent(currentSession, function (err, org) {
					should.not.exist(err);
					should.exist(org);
					_.isEqual(org, currentSession.user.org).should.equal(true);
					should.exist(org.org_id);
					org.org_id.toString().should.equal(global.$config.user.developer_org_id);
					should.exist(org.name);
					orgName = org.name;
					done();
				});
			});

			it('should fail to return the current user org with invalid session', function (done) {
				AppC.Org.getCurrent({}, function (err, org) {
					should.exist(err);
					should.not.exist(org);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should get org by name', function (done) {
				should.exist(orgName);
				AppC.Org.getByName(currentSession, orgName, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					should.exist(res.name);
					res.name.should.equal(orgName);
					res.org_id.toString().should.equal(global.$config.user.developer_org_id);
					done();
				});
			});

			it('should fail to get org with invalid name', function (done) {
				AppC.Org.getByName(currentSession, '', function (err, res) {
					should.exist(err);
					should.not.exist(res);
					should.exist(err.message);
					err.message.should.equal('Org not found');
					done();
				});
			});

			it('should fail to get org with invalid session', function (done) {
				AppC.Org.getByName({}, orgName, function (err, res) {
					should.exist(err);
					should.not.exist(res);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should find an org by id', function (done) {
				AppC.Org.findById(currentSession, global.$config.user.developer_org_id, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					should.exist(res.org_id);
					res.org_id.toString().should.equal(global.$config.user.developer_org_id);
					done();
				});
			});

			it('should fail to find an org by id with invalid session', function (done) {
				AppC.Org.findById({}, global.$config.user.developer_org_id, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should fail to find an org by id with invalid org id', function (done) {
				AppC.Org.findById(currentSession, '', function (err, res) {
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('id is not valid');
					done();
				});
			});

			it('should get an org by id', function (done) {
				AppC.Org.getById(currentSession, global.$config.user.developer_org_id, function (err, res) {
					should.exist(res);
					should.not.exist(err);
					should.exist(res.org_id);
					res.org_id.toString().should.equal(global.$config.user.developer_org_id);
					done();
				});
			});

			it('should fail to get an org by id with invalid session', function (done) {
				AppC.Org.getById({}, global.$config.user.developer_org_id, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should fail to get an org by id with invalid org id', function (done) {
				AppC.Org.getById(currentSession, '', function (err, res) {
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('id is not valid');
					done();
				});
			});

			it('should fail to find the orgs that the user has access to with invalid session', function (done) {
				AppC.Org.find({}, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					done();
				});
			});

			var regularTime,
				cachedTime;

			it('should find the orgs that the user has access to', function (done) {
				var time = new Date().getTime();
				AppC.Org.find(currentSession, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					(res.length >= 2).should.equal(true);
					regularTime = new Date().getTime() - time;
					done();
				});
			});

			it('should find the orgs that the user has access to (cached)', function (done) {
				var time = new Date().getTime();
				AppC.Org.find(currentSession, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					(res.length >= 2).should.equal(true);
					cachedTime = new Date().getTime() - time;
					done();
				});
			});

			it('cached time should be lower (or equal to) than original time for finding orgs', function () {
				(regularTime - cachedTime).should.not.be.lessThan(-1);
			});

		});

		describe('user', function () {

			it('should find the current user', function (done) {
				AppC.User.find(currentSession, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.email.should.equal(global.$config.user.username);
					done();
				});
			});

			it('should find another user', function (done) {
				AppC.User.find(currentSession, global.$config.another_user.guid, function (err, res) {
					should.not.exist(err);
					should.exist(res);
					res.user_id.toString().should.equal(global.$config.another_user.user_id);
					should.not.exist(res.username);
					done();
				});
			});

			it('should fail to find invalid user', function (done) {
				AppC.User.find(currentSession, '123', function (err, res) {
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('Resource Not Found');
					done();
				});
			});

			it('should fail to find user with invalid session', function (done) {
				AppC.User.find({}, function (err, res) {
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});

			it('should switch back to the original org', function (done) {
				AppC.User.switchLoggedInOrg(currentSession, global.$config.user.enterprise_org_id, function (err, res, newSession) {
					currentSession = newSession;
					should.not.exist(err);
					should.exist(res);
					res.org_id.toString().should.equal(global.$config.user.enterprise_org_id);
					done();
				});
			});

			it('should fail to switch to an invalid org', function (done) {
				AppC.User.switchLoggedInOrg(currentSession, '123', function (err, res, newSession) {
					currentSession = newSession;
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('id is not valid');
					done();
				});
			});

			it('should fail to switch to an org without a valid session', function (done) {
				AppC.User.switchLoggedInOrg({}, global.$config.user.enterprise_org_id, function (err, res, newSession) {
					currentSession = newSession;
					should.not.exist(res);
					should.exist(err);
					should.exist(err.message);
					err.message.should.equal('session is not valid');
					done();
				});
			});
		});
	});
});
