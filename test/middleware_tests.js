// globals $config
var should = require('should'),
	helper = require('./helper'),
	cookieSession = require('cookie-session'),
	AppC,
	express = require('express'),
	request = require('request'),
	server,
	app;

// jscs:disable jsDoc
describe('middleware', function () {
	this.timeout(30000);

	before(function () {
		AppC = require('../');
	});

	beforeEach(function (done) {
		app = express();
		app.use(cookieSession({
			name: 'session',
			secret: 'secret',
			path: '/'
		}));
		server = app.listen(0, function () {
			server.port = server.address().port;
			done();
		});
	});

	afterEach(function (done) {
		if (server) {
			server.close(done);
		} else {
			done();
		}
	});

	it('should create basic middleware and skip', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			urlpattern: /^\/secure/
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		request.get('http://127.0.0.1:' + server.port + '/', function (err, resp, body) {
			should(err).be.not.ok;
			should(body).be.equal('OK');
			should(resp.statusCode).be.equal(200);
			done();
		});
	});

	it('should create basic middleware and skip when not required', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			required: false
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send(req.session && req.session.user ? 'FAILED' : 'OK');
		});
		request.get('http://127.0.0.1:' + server.port + '/', function (err, resp, body) {
			should(err).be.not.ok;
			should(body).be.equal('OK');
			should(resp.statusCode).be.equal(200);
			done();
		});
	});

	it('should create basic middleware and fail', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('FAILED');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			followRedirect: false
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(302);
			should(body).match(new RegExp('Redirecting to ' + AppC.baseurl));
			done();
		});
	});

	it('should create basic middleware and fail with image', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('FAIL');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'image/*'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.empty;
			done();
		});
	});

	it('should create basic middleware and fail with javascript', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('FAIL');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/javascript, application/javascript'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.empty;
			done();
		});
	});

	it('should create basic middleware and fail with json and default url but exclude redirect with mixed protocol', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/json'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.eql(JSON.stringify({
				success: false,
				code: 401,
				message: 'unauthorized',
				error: 'not logged in',
				url: AppC.baseurl
			}));
			done();
		});
	});

	it('should create basic middleware and fail with json and default url', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/json',
				host: 'foo.com',
				'X-Forwarded-Proto': 'https'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.eql(JSON.stringify({
				success: false,
				code: 401,
				message: 'unauthorized',
				error: 'not logged in',
				url: AppC.baseurl + '?redirect=https%3A%2F%2Ffoo.com%2F'
			}));
			done();
		});
	});

	it('should create basic middleware and fail with json and use redirectUrlParam', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			redirectUrlParam: '_redirect'
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/json',
				'X-Forwarded-Proto': 'https'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.eql(JSON.stringify({
				success: false,
				code: 401,
				message: 'unauthorized',
				error: 'not logged in',
				url: AppC.baseurl + '?_redirect=https%3A%2F%2F127.0.0.1%3A' + server.port + '%2F'
			}));
			done();
		});
	});

	it('should create basic middleware and fail with json and redirect', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			redirect: 'foo'
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/json',
				'X-Forwarded-Proto': 'https'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.eql(JSON.stringify({
				success: false,
				code: 401,
				message: 'unauthorized',
				error: 'not logged in',
				url: 'foo?redirect=https%3A%2F%2F127.0.0.1%3A' + server.port + '%2F'
			}));
			done();
		});
	});

	it('should create basic middleware and fail with json and default url and use errorHandler', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			errorHandler: function (req, resp) {
				resp.json({
					success: false
				});
			}
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/json'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(200);
			should(body).be.eql(JSON.stringify({
				success: false
			}));
			done();
		});
	});

	it('should create basic middleware and fail with json and use renderUnauthorized', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			renderUnauthorized: 'unauth',
			redirect: null
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('OK');
		});
		app.render = function (template, params, callback) {
			if (template === 'unauth' && params.reason === 'unauthorized') {
				callback(null, 'OK');
			} else {
				callback(new Error('invalid request'));
			}
		};
		var opts = {
			url: 'http://127.0.0.1:' + server.port + '/',
			headers: {
				accept: 'text/html'
			}
		};
		request.get(opts, function (err, resp, body) {
			should(err).be.not.ok;
			should(resp.statusCode).be.equal(401);
			should(body).be.equal('OK');
			done();
		});
	});

	it('should create basic middleware and succeed', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.json({
				user: req.user,
				isNew: req.session.isNew
			});
		});
		var jar = request.jar();
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id)
				},
				jar: jar
			};
			var obj = {
				user: {
					'_id':'54d53480b867bc232dc3ea1d',
					user_id:1503110,
					guid:'b74b9657-a684-4f86-93af-542bec92e50b',
					openid:'54cc6929-1c23-4aa2-89be-ce86cb80d229',
					firstname:'appc-platform-sdk',
					lastname:'test user',
					username:'test.appcelerator@gmail.com',
					email:'test.appcelerator@gmail.com',
					is_staff:false,
					org_id:100001933,
					plan: 'enterprise'
				},
				isNew: true
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(200);
				should(resp.headers).have.property('set-cookie');
				should(resp.headers[0]).match(/^session=/);
				should(resp.headers[1]).match(/^session\.sig=/);
				should(body).eql(JSON.stringify(obj));
				// make sure cookie got set
				should(jar._jar.store.idx).have.property('127.0.0.1');
				should(jar._jar.store.idx['127.0.0.1']['/']).have.property('session');
				should(jar._jar.store.idx['127.0.0.1']['/']).have.property('session.sig');
				request(opts, function (err, resp, body) {
					should(err).be.not.ok;
					should(resp.statusCode).be.equal(200);
					var data = JSON.parse(body);
					should(data.user).be.ok;
					should(data.user._id).be.equal(obj.user._id);
					should(data.isNew).be.equal(false);
					done();
				});
			});
		});
	});

	it('should create basic middleware and succeed and then re-validate', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			sessionExpiry: 0, // immediate
			successHandler: function (req, resp, next, session, revalidated) {
				resp.json({
					user: req.user,
					isNew: req.session.isNew,
					revalidated: revalidated
				});
			}
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			resp.send('FAILED');
		});
		var jar = request.jar();
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id)
				},
				jar: jar,
				followRedirect: false
			};
			var obj = {
				user: {
					'_id':'54d53480b867bc232dc3ea1d',
					user_id:1503110,
					guid:'b74b9657-a684-4f86-93af-542bec92e50b',
					openid:'54cc6929-1c23-4aa2-89be-ce86cb80d229',
					firstname:'appc-platform-sdk',
					lastname:'test user',
					username:'test.appcelerator@gmail.com',
					email:'test.appcelerator@gmail.com',
					is_staff:false,
					org_id:100001933,
					plan: 'enterprise'
				},
				isNew: true,
				revalidated: false
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(200);
				should(resp.headers).have.property('set-cookie');
				should(resp.headers[0]).match(/^session=/);
				should(resp.headers[1]).match(/^session\.sig=/);
				should(body).eql(JSON.stringify(obj));
				// make sure cookie got set
				should(jar._jar.store.idx).have.property('127.0.0.1');
				should(jar._jar.store.idx['127.0.0.1']['/']).have.property('session');
				should(jar._jar.store.idx['127.0.0.1']['/']).have.property('session.sig');
				request(opts, function (err, resp, body) {
					should(err).be.not.ok;
					should(resp.statusCode).be.equal(200);
					var data = JSON.parse(body);
					should(data.user).be.ok;
					should(data.user._id).be.equal(obj.user._id);
					should(data.isNew).be.equal(false);
					should(data.revalidated).be.equal(true);
					done();
				});
			});
		});
	});

	it('should create basic middleware and use successHandler', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			successHandler: function (req, resp, next, session, revalidated) {
				should(session).be.ok;
				should(session).be.eql({
					'_id':'54d53480b867bc232dc3ea1d',
					user_id:1503110,
					guid:'b74b9657-a684-4f86-93af-542bec92e50b',
					openid:'54cc6929-1c23-4aa2-89be-ce86cb80d229',
					firstname:'appc-platform-sdk',
					lastname:'test user',
					username:'test.appcelerator@gmail.com',
					email:'test.appcelerator@gmail.com',
					is_staff:false,
					org_id:100001933,
					plan: 'enterprise'
				});
				resp.json({success:true, revalidated: revalidated});
				done();
			}
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			return resp.send('FAILED');
		});
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id)
				}
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(200);
				should(body).eql(JSON.stringify({
					success: true,
					revalidated: false
				}));
			});
		});
	});

	it('should create basic middleware and require a plan type', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			planRequired: 'team'
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			return resp.send('FAILED');
		});
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id),
					accept: 'text/json'
				}
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(401);
				should(body).be.equal('{"success":false,"code":401,"message":"unauthorized","error":"insufficient privilieges based on your subscription"}');
				done();
			});
		});
	});

	it('should create basic middleware and require a plan type with plan redirect', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			planRequired: 'team',
			planRequiredRedirect: 'http://planredirect'
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			return resp.send('FAILED');
		});
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id),
					accept: 'text/json'
				},
				followRedirect: false
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(401);
				should(body).be.equal(JSON.stringify({
					success:false,
					code:401,
					message: 'unauthorized',
					error:'insufficient privilieges based on your subscription',
					url:'http://planredirect?redirect=http%3A%2F%2F127.0.0.1%3A' + server.port + '%2F'
				}));
				done();
			});
		});
	});

	it('should create basic middleware and require a plan that is found', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			planRequired: 'enterprise'
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			return resp.send('OK');
		});
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id),
					accept: 'text/json'
				},
				followRedirect: false
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(200);
				should(body).be.equal('OK');
				done();
			});
		});
	});

	it('should create basic middleware and require a plan that is found using regex', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware({
			planRequired: /^(enterprise|team)$/
		});
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			return resp.send('OK');
		});
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id),
					accept: 'text/json'
				},
				followRedirect: false
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(200);
				should(body).be.equal('OK');
				done();
			});
		});
	});

	it('should create basic middleware and then simulate re-login', function (done) {
		should(AppC.Middleware).be.an.object;
		var middleware = new AppC.Middleware();
		should(middleware).be.a.function;
		app.use(middleware);
		app.get('/', function (req, resp) {
			return resp.send(req.session.user.sid);
		});
		AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
			var opts = {
				url: 'http://127.0.0.1:' + server.port + '/',
				headers: {
					'cookie': 'connect.sid=' + encodeURIComponent(session.id),
					accept: 'text/json'
				}
			};
			request(opts, function (err, resp, body) {
				should(err).be.not.ok;
				should(resp.statusCode).be.equal(200);
				should(body).be.equal(session.id);
				AppC.Auth.login(global.$config.user.username, global.$config.user.password, function (err, session) {
					// change the sid and it should generate a new session login
					opts.headers.cookie = 'connect.sid=' + encodeURIComponent(session.id);
					request(opts, function (err, resp, body) {
						should(err).be.not.ok;
						should(resp.statusCode).be.equal(200);
						should(body).be.equal(session.id);
						done();
					});
				});
			});
		});
	});
});
