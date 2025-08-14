pipeline {
    // This agent must have Docker, Trivy, and the Node.js tool installed.
    agent {
        label 'ubuntu-docker'
    }

    tools {
        nodejs 'nodejs-22-6-0'
    }

    // FIX: This environment block provides the database connection string
    // to all stages, fixing the "Unit Testing" failure.
    environment {
        // The credential 'mongo-db-uri' must exist in Jenkins as a "Secret Text" credential.
        MONGO_URI = credentials('mongo-db-uri')
    }

    stages {
        stage('Installing Dependencies') {
            agent {
                docker {
                    image 'node:24'
                    args '-u root:root'
                }
            }
            steps {
                sh 'npm install --no-audit'
            }
        }

        stage('Dependency Scanning') {
            parallel {
                stage('NPM Dependency Audit') {
                    agent {
                        docker {
                            image 'node:24'
                            args '-u root:root'
                        }
                    }
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh 'npm audit --audit-level=critical'
                        }
                    }
                }
                stage('OWASP Dependency Check') {
                    // This runs on the main agent where the OWASP tool is installed.
                    agent any
                    steps {
                        dependencyCheck additionalArguments: '''
                            --scan ./
                            --format ALL
                            --prettyPrint
                        ''', odcInstallation: 'OWASP-DepCheck-12'

                        // Fails the build if 1 or more critical vulnerabilities are found.
                        dependencyCheckPublisher failedTotalCritical: 1, pattern: 'dependency-check-report.xml', stopBuild: true
                    }
                }
            }
        }

        stage('Unit Testing') {
            agent {
                docker {
                    image 'node:24'
                    args '-u root:root'
                }
            }
            options {
                retry(2)
            }
            steps {
                // This step will now succeed because MONGO_URI is available.
                sh 'npm test'
                junit 'test-results.xml'
            }
        }

        stage('Code Coverage') {
            agent {
                docker {
                    image 'node:24'
                    args '-u root:root'
                }
            }
            steps {
                sh 'npm run coverage'
                publishHTML(target: [
                    reportName: 'Code Coverage Report',
                    reportDir: 'coverage/lcov-report',
                    reportFiles: 'index.html',
                    allowMissing: true
                ])
            }
        }

        // ... other stages remain the same ...
        
        stage('Build Docker Image') {
            agent any
            steps {
                sh 'docker build -t aniketpuro/solar-system:$GIT_COMMIT .'
            }
        }

        stage('Trivy Vulnerability Scanner') {
            agent any
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh "trivy image --severity CRITICAL --exit-code 1 aniketpuro/solar-system:$GIT_COMMIT"
                }
            }
        }

        stage('Push Docker Image') {
            agent any
            steps {
                withDockerRegistry(credentialsId: 'docker-hub-credentials', url: "") {
                    sh 'docker push aniketpuro/solar-system:$GIT_COMMIT'
                }
            }
        }
    }
}
