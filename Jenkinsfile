library 'pipeline-library@buildSetup'


node {
	stage('Test') {
		buildNPMPackage {
			buildSetup = true
			// nodeVersion = '6.9.5'
			// tags, publishes, updates JIRA only for master branch builds
			// records unit test and code coverage results
			// does nsp/retire checks and uses custom warnings publisher parser to record warnings on Jenkins (not fortify server)
		}

		sh 'npm run ci-lint'
	}
} // node
