pipeline {
    agent any
    
    triggers {
        pollSCM('* * * * *')  // Poll GitHub every minute
    }
    
    environment {
        FRONTEND_DIR = '/home/netgrader/netgrader/netgrader-frontend'
        COMPOSE_DIR = '/home/netgrader/netgrader/netgrader-container'
        SERVICE_NAME = 'frontend'
        BACKUP_IMAGE = "netgrader-frontend-backup-${BUILD_NUMBER}"
        PREVIOUS_IMAGE = "netgrader-frontend-backup-${BUILD_NUMBER - 1}"
    }
    
    stages {
        stage('Detect Changes') {
            steps {
                script {
                    echo "[SCM] Checking out code to Jenkins workspace for change detection..."
                    checkout scm
                    
                    def gitCommit = sh(
                        script: 'git rev-parse HEAD',
                        returnStdout: true
                    ).trim()
                    
                    echo "📝 Current commit: ${gitCommit}"
                    echo "📝 Commit message: ${sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()}"
                }
            }
        }
        stage('Backup Current Image') {
            steps {
                script {
                    echo "[BACKUP] Creating backup of current image..."
                    sh """
                        docker tag netgrader-frontend:latest ${BACKUP_IMAGE} || echo "No existing image to backup"
                    """
                }
            }
        }
        
        stage('Pull Latest Code') {
            steps {
                script {
                    echo "[GIT] Updating ${FRONTEND_DIR}..."
                    sh """
                        sudo -u netgrader bash -c 'cd ${FRONTEND_DIR} && git reset --hard HEAD && git pull origin main'
                    """
                }
            }
        }
        
        stage('Check Environment File') {
            steps {
                script {
                    echo "[CHECK] Verifying .env file exists..."
                    sh """
                        sudo -u netgrader test -f ${FRONTEND_DIR}/.env && echo '✅ Environment file exists' || exit 1
                    """
                }
            }
        }
        
        stage('Rebuild & Deploy Frontend') {
            steps {
                script {
                    echo "[DOCKER] Rebuilding and restarting ${SERVICE_NAME} service..."
                    sh """
                        sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose build ${SERVICE_NAME} && docker compose down ${SERVICE_NAME} && docker compose up -d ${SERVICE_NAME}'
                    """
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo "[HEALTH] Waiting for service to start..."
                    sleep(time: 10, unit: 'SECONDS')
                    
                    def healthCheckPassed = false
                    retry(3) {
                        try {
                            sh """
                                sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose ps ${SERVICE_NAME} | grep -i "up"'
                            """
                            healthCheckPassed = true
                            echo "✅ Health check passed"
                        } catch (Exception e) {
                            echo "⚠️  Health check failed, retrying..."
                            sleep(time: 5, unit: 'SECONDS')
                            throw e
                        }
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "[DOCKER] Verifying ${SERVICE_NAME} is running..."
                    sh """
                        sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose ps ${SERVICE_NAME}'
                    """
                }
            }
        }
        
        stage('Cleanup Old Backups') {
            steps {
                script {
                    echo "[CLEANUP] Keeping last 5 backups, removing older ones..."
                    sh """
                        docker images | grep 'netgrader-frontend-backup' | awk '{print \$1\":\"\$2}' | sort -r | tail -n +6 | xargs -r docker rmi || echo "No old backups to clean"
                    """
                    echo "[CLEANUP] Cleaning up unused images..."
                    sh 'docker image prune -f'
                }
            }
        }
    }
    
    post {
        success {
            echo "=========================================="
            echo "✅ Frontend deployed successfully!"
            echo "Build #${BUILD_NUMBER} - Backup: ${BACKUP_IMAGE}"
            echo "To rollback, run: Rollback to Build #${BUILD_NUMBER - 1}"
            echo "=========================================="
        }
        failure {
            echo "=========================================="
            echo "❌ DEPLOYMENT FAILED - INITIATING ROLLBACK"
            echo "=========================================="
            script {
                def rollbackSuccess = false
                
                if (BUILD_NUMBER.toInteger() > 1) {
                    echo "🔄 Rolling back to Build #${BUILD_NUMBER - 1}..."
                    echo "Previous backup image: ${PREVIOUS_IMAGE}"
                    
                    try {
                        // Verify previous backup exists
                        def backupExists = sh(
                            script: "docker images -q ${PREVIOUS_IMAGE}",
                            returnStdout: true
                        ).trim()
                        
                        if (!backupExists) {
                            echo "⚠️  WARNING: Previous backup image not found!"
                            echo "Cannot rollback - this was likely the first build"
                        } else {
                            // Perform rollback
                            sh """
                                echo "Tagging previous image as latest..."
                                docker tag ${PREVIOUS_IMAGE} netgrader-frontend:latest
                                
                                echo "Restarting service with previous version..."
                                sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose down ${SERVICE_NAME}'
                                sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose up -d ${SERVICE_NAME}'
                            """
                            
                            // Verify rollback worked
                            sleep(time: 10, unit: 'SECONDS')
                            sh """
                                sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose ps ${SERVICE_NAME}'
                            """
                            
                            rollbackSuccess = true
                            echo "=========================================="
                            echo "✅ ROLLBACK SUCCESSFUL"
                            echo "Service restored to Build #${BUILD_NUMBER - 1}"
                            echo "=========================================="
                        }
                    } catch (Exception e) {
                        echo "=========================================="
                        echo "❌ ROLLBACK FAILED: ${e.message}"
                        echo "Manual intervention required!"
                        echo "=========================================="
                    }
                } else {
                    echo "⚠️  This is Build #1 - no previous version to rollback to"
                }
                
                // Show logs to help diagnose the issue
                echo ""
                echo "=========================================="
                echo "Container logs (last 100 lines):"
                echo "=========================================="
                sh """
                    sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose logs ${SERVICE_NAME} --tail=100' || echo "Could not fetch logs"
                """
                
                if (!rollbackSuccess && BUILD_NUMBER.toInteger() > 1) {
                    echo ""
                    echo "⚠️  SERVICE MAY BE DOWN - Manual rollback required"
                    echo "Run the 'netgrader-frontend-rollback' job to restore service"
                }
            }
        }
    }
}