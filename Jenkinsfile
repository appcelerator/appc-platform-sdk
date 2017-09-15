library 'pipeline-library@buildSetup'

buildSetup {
  // allows repo specific build steps
}

buildNPMPackage {
  publish = false
  // nodeVersion = '6.9.5'
  // records unit test and code coverage results
  // does nsp/retire checks and uses custom warnings publisher parser to record warnings on Jenkins (not fortify server)
}

stage('Lint') {
  sh 'npm run ci-lint'
}
