#!/bin/bash

# Step 1: Install WSL (if not already installed)
if ! command -v wsl &> /dev/null; then
    echo "Installing WSL..."
    wsl --install
else
    echo "WSL is already installed."
fi

# Step 2: Initialize the Podman machine (if not already initialized)
if ! podman machine list | grep -q "podman-machine-default"; then
    echo "Initializing Podman machine..."
    podman machine init
else
    echo "Podman machine already exists."
fi

# Step 3: Start the Podman machine (if not already running)
if ! podman machine list | grep -q "Running"; then
    echo "Starting Podman machine..."
    podman machine start
else
    echo "Podman machine is already running."
fi

# Step 4: Verify Podman configuration
echo "Verifying Podman configuration..."
podman info --format json | jq .host.security.rootless

# Step 5: Test rootless mode
echo "Testing rootless mode with a hello-world container..."
podman run hello-world

# Pull AI security tool images
podman pull caldera:latest
podman pull clip:latest
podman pull deepexploit:latest
podman pull aihids:latest
podman pull tensorflow-privacy:latest

# Create network for AI security tools
podman network create ai-security-net
