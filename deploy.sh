#!/bin/bash

# Deployment Script for TetraCryptPQC_Nexus using Nomad and Podman in air-gapped environment

# Step 1: Verify air-gapped environment
if ping -c 1 google.com &> /dev/null; then
    echo "Error: System is not air-gapped" >> logs/deploy.log
    exit 1
fi

# Step 2: Install Yggdrasil
if ! sudo apt-get install -y yggdrasil; then
    echo "Error: Failed to install Yggdrasil" >> logs/deploy.log
    exit 1
fi

# Step 3: Configure Yggdrasil
sudo cp yggdrasil.conf /etc/yggdrasil/
if ! sudo systemctl restart yggdrasil; then
    echo "Error: Failed to start Yggdrasil" >> logs/deploy.log
    exit 1
fi

# Step 4: Set environment variables
if ! source .env; then
    echo "Error: Failed to set environment variables" >> logs/deploy.log
    exit 1
fi

# Step 5: Install dependencies
if ! npm install; then
    echo "Error: Failed to install dependencies" >> logs/deploy.log
    exit 1
fi

# Step 6: Run security checks
if ! npm audit; then
    echo "Warning: Security checks failed" >> logs/deploy.log
fi

# Step 7: Build the project
if ! npm run build; then
    echo "Error: Failed to build the project" >> logs/deploy.log
    exit 1
fi

# Step 8: Start Nomad with Podman as container runtime
sudo nomad agent -config=/etc/nomad.d/nomad.hcl &

# Step 9: Load container images into local registry
for image in $(ls containers/*.tar); do
    podman load -i $image
    if [ $? -ne 0 ]; then
        echo "Error: Failed to load container image $image" >> logs/deploy.log
        exit 1
    fi
done

# Step 10: Build Docker images with Podman
podman build -t tensorflow-privacy -f Dockerfile.tensorflow-privacy .
podman build -t clip -f Dockerfile.clip .
podman build -t deepexploit -f Dockerfile.deepexploit .
podman build -t aihids -f Dockerfile.aihids .
podman build -t caldera -f Dockerfile.caldera .

# Step 11: Deploy to Nomad
nomad run k8s-deployment.yaml
nomad run zero-trust-policy.yaml

# Step 12: Verify deployment
nomad status
nomad node status

# Step 13: Enable network isolation
nomad run network-isolation.yaml

# Step 14: Log deployment status
echo "Nomad deployment with Podman completed successfully at $(date)" >> logs/deploy.log
