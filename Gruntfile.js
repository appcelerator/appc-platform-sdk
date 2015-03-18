var exec = require('child_process').exec,
	fs = require('fs'),
	path = require('path');

const BIN = './node_modules/.bin/';

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}

module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		appcJs: {
			options: {
				force: true
			},
			src: ['index.js', 'lib/**/*.js']
		},
		mochaTest: {
			options: {
				timeout: 40000,
				reporter: 'spec',
				bail: true,
				ignoreLeaks: false,
				globals: ['_key']
			},
			src: ['test/appc_platform_sdk_tests.js']
		},
		kahvesi: {
			src: ['test/appc_platform_sdk_tests.js']
		},
		appcCoverage: {
			default_options: {
				src: 'coverage/lcov.info',
				force: true
			}
		}
	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-appc-js');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-kahvesi');
	grunt.loadNpmTasks('grunt-appc-coverage')

	grunt.registerTask('cover', ['kahvesi', 'appcCoverage']);
	grunt.registerTask('default', ['appcJs', 'mochaTest']);
};
