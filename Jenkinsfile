library 'pipeline-library'

timestamps() {
  node('git && (osx || linux)') {

    sh("echo ${env.JOB_NAME}")
    sh("echo ${env.JOB_BASE_NAME}")

    buildNPMPackage {
      publish = false
      // nodeVersion = '6.9.5'
      // records unit test and code coverage results
      // does nsp/retire checks and uses custom warnings publisher parser to record warnings on Jenkins (not fortify server)
    }

    stage('Lint') {
      sh 'npm run ci-lint'
    }
  } // node
} // timestamps
