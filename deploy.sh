y#!/bin/bash

# Deployment Script for TetraCryptPQC_Nexus

# Step 1: Set environment variables
if ! source .env; then
    echo "Error: Failed to set environment variables" >> logs/deploy.log
    exit 1
fi

# Step 2: Install dependencies
if ! npm install; then
    echo "Error: Failed to install dependencies" >> logs/deploy.log
    exit 1
fi

# Step 3: Run security checks
if ! npm audit; then
    echo "Warning: Security checks failed" >> logs/deploy.log
fi

# Step 4: Build the project
if ! npm run build; then
    echo "Error: Failed to build the project" >> logs/deploy.log
    exit 1
fi

# Step 5: Start the application
if ! npm start; then
    echo "Error: Failed to start the application" >> logs/deploy.log
    exit 1
fi

# Step 6: Create ConfigMap for AI security tools
kubectl apply -f ai-security-configmap.yaml

# Step 7: Deploy AI security tools
kubectl apply -f caldera-deployment.yaml
kubectl apply -f clip-deployment.yaml
kubectl apply -f deepexploit-deployment.yaml
kubectl apply -f aihids-deployment.yaml
kubectl apply -f tensorflow-privacy-deployment.yaml

# Step 8: Log deployment status
echo "Deployment completed successfully at $(date)" >> logs/deploy.log
