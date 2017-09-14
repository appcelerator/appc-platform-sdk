library 'pipeline-library'

timestamps() {
  node('git && (osx || linux)') {
    // github-organization-plugin jobs are named as 'org/repo/branch'
    tokens = "${env.JOB_NAME}".tokenize('/')

    // org is actually the name given to "organizationFolder"
    // in the groovy script and not the github organization
    org = tokens[tokens.size()-3]
    repo = tokens[tokens.size()-2]
    branch = tokens[tokens.size()-1]
    sh("echo ${org}")
    sh("echo ${repo}")
    sh("echo ${branch}")

    if (repo == "appc-platform-sdk") {
      sh("echo 'im appc-platform-sdk!'")
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
  } // node
} // timestamps
