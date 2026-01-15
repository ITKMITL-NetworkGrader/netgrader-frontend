pipeline {
    agent any
    
    environment {
        IMAGE_NAME = 'netgrader-frontend'
        CONTAINER_NAME = 'netgrader-frontend'
        DOCKER_NETWORK = 'netgrader-container_netgrader-network'
        PORT_MAPPING = '80:80'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo "Checking out code from GitHub..."
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker image: ${IMAGE_NAME}"
                    sh "docker build -t ${IMAGE_NAME} ."
                }
            }
        }
        
        stage('Stop Old Container') {
            steps {
                script {
                    echo "Stopping and removing old container if exists..."
                    sh "docker rm -f ${CONTAINER_NAME} || true"
                }
            }
        }
        
        stage('Deploy New Container') {
            steps {
                script {
                    echo "Deploying new container..."
                    sh """
                        docker run -d \
                            -p ${PORT_MAPPING} \
                            --name ${CONTAINER_NAME} \
                            --network ${DOCKER_NETWORK} \
                            --restart unless-stopped \
                            ${IMAGE_NAME}
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "Verifying container is running..."
                    sh "docker ps | grep ${CONTAINER_NAME}"
                }
            }
        }
        
        stage('Clean Up') {
            steps {
                script {
                    echo "Cleaning up unused Docker images..."
                    sh "docker image prune -f"
                }
            }
        }
    }
    
    post {
        success {
            echo "Deployment successful! Container ${CONTAINER_NAME} is running."
        }
        failure {
            echo "Deployment failed. Check the logs above for details."
        }
    }
}