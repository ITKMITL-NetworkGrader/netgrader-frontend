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
            sh """
                sudo -u netgrader bash -c 'cd ${COMPOSE_DIR} && docker compose logs ${SERVICE_NAME} --tail=100' || true
            """
        }
    }
}