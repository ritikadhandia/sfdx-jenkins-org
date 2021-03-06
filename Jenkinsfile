#!groovy

node {

    def SF_CONSUMER_KEY=env.SF_CONSUMER_KEY
    def SF_USERNAME=env.SF_USERNAME
    def SERVER_KEY_CREDENTIALS_ID=env.SERVER_KEY_CREDENTIALS_ID
    def DEPLOYDIR='src'
    def PACKAGEDIR='manifest'
    def TEST_LEVEL='RunLocalTests'
    def WORKSPACE = env.WORKSPACE

    def toolbelt = tool 'toolbelt'

	
    // -------------------------------------------------------------------------
    // Check out code from source control.
    // -------------------------------------------------------------------------

    stage('checkout source') {
        checkout scm
    }

    stage('Static Code Analysis'){
        rc = command "${toolbelt}/pmd -d ${WORKSPACE}/force-app/main/default -R /Users/rdhandia/Downloads/Apex_Ruleset.xml -f csv -reportfile /Users/rdhandia/Desktop/results.csv"
        if (rc != 0) {
             error 'PMD Failed'
        }
    }

	
 //    stage('copy files to local workspace'){
	// 	echo "${env.JOB_NAME}"
	// 	echo "${WORKSPACE}"
	// 	sh "mkdir -p ${WORKSPACE}/src"
	// 	sh "cp -R 'force-app' src"
 //        sh "cp -R ${PACKAGEDIR} src"
	// }
	

    // -------------------------------------------------------------------------
    // Run all the enclosed stages with access to the Salesforce
    // JWT key credentials.
    // -------------------------------------------------------------------------

    withCredentials([file(credentialsId: SERVER_KEY_CREDENTIALS_ID, variable: 'server_key_file')]) {
        // -------------------------------------------------------------------------
        // Authenticate to Salesforce using the server key.
        // -------------------------------------------------------------------------

        stage('Authorize to Salesforce') {
            rl = command "${toolbelt}/sfdx force:auth:logout -p -u ${SF_USERNAME}"
	
	    rc = command "${toolbelt}/sfdx force:auth:jwt:grant --instanceurl https://login.salesforce.com --clientid ${SF_CONSUMER_KEY} --jwtkeyfile ${server_key_file} --username ${SF_USERNAME} --setalias UAT"
            if (rc != 0) {
                error 'Salesforce org authorization failed.'
            }
        }

        // -------------------------------------------------------------------------
        // Deploy metadata and execute unit tests - source format
        // -------------------------------------------------------------------------

        stage('Deploy and Run Tests'){
            rc = command "${toolbelt}/sfdx force:source:deploy --wait 10 --checkonly -x ${WORKSPACE}/${PACKAGEDIR}/package.xml --targetusername UAT --testlevel ${TEST_LEVEL}"
             if (rc != 0) {
                 error 'Salesforce deploy and test run failed.'
             }
        }



        // -------------------------------------------------------------------------
        // Deploy metadata and execute unit tests - metadata format
        // -------------------------------------------------------------------------

        // stage('Deploy and Run Tests') {
        //     rc = command "${toolbelt}/sfdx force:mdapi:deploy --wait 10 --deploydir ${DEPLOYDIR} --targetusername UAT --testlevel ${TEST_LEVEL}"
        //     if (rc != 0) {
        //         error 'Salesforce deploy and test run failed.'
        //     }
        // }


        // -------------------------------------------------------------------------
        // Example shows how to run a check-only deploy.
        // -------------------------------------------------------------------------

        //stage('Check Only Deploy') {
        //    rc = command "${toolbelt}/sfdx force:mdapi:deploy --checkonly --wait 10 --deploydir ${DEPLOYDIR} --targetusername UAT --testlevel ${TEST_LEVEL}"
        //    if (rc != 0) {
        //        error 'Salesforce deploy failed.'
        //    }
        //}
    }

    post { 
        always { 
            echo "Cleaning up"
            //cleanWs()
        }
    }

}
	

def command(script) {
    if (isUnix()) {
        return sh(returnStatus: true, script: script);
    } else {
	return bat(returnStatus: true, script: script);
    }
}
