pipeline {
    agent any
    
    environment {
        FRONTEND_DIR = '/home/netgrader/netgrader/netgrader-frontend'
        COMPOSE_DIR = '/home/netgrader/netgrader/netgrader-container'
        SERVICE_NAME = 'frontend'
    }
    
    stages {
        stage('Pull Latest Code') {
            steps {
                script {
                    echo "[GIT] Updating ${FRONTEND_DIR}..."
                    dir(FRONTEND_DIR) {
                        sh 'git reset --hard HEAD'
                        sh 'git pull origin main'
                    }
                }
            }
        }
        
        stage('Check Environment File') {
            steps {
                script {
                    if (!fileExists("${FRONTEND_DIR}/.env")) {
                        error("❌ .env file not found in ${FRONTEND_DIR}")
                    }
                    echo "✅ Environment file exists"
                }
            }
        }
        
        stage('Rebuild & Deploy Frontend') {
            steps {
                script {
                    echo "[DOCKER] Rebuilding and restarting ${SERVICE_NAME} service..."
                    dir(COMPOSE_DIR) {
                        sh """
                            docker compose build ${SERVICE_NAME} && \
                            docker compose down ${SERVICE_NAME} && \
                            docker compose up -d ${SERVICE_NAME}
                        """
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "[DOCKER] Verifying ${SERVICE_NAME} is running..."
                    dir(COMPOSE_DIR) {
                        sh "docker compose ps ${SERVICE_NAME}"
                    }
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                script {
                    echo "[DOCKER] Cleaning up unused images..."
                    sh 'docker image prune -f'
                }
            }
        }
    }
    
    post {
        success {
            echo "=========================================="
            echo "✅ Frontend deployed successfully!"
            echo "=========================================="
        }
        failure {
            echo "=========================================="
            echo "❌ Deployment failed! Check logs below:"
            echo "=========================================="
            dir(env.COMPOSE_DIR) {
                sh "docker compose logs ${SERVICE_NAME} --tail=100"
            }
        }
    }
}