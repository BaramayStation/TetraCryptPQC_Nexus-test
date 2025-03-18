#!/bin/bash

# Step 1: Install WSL (if not already installed)
if ! command -v wsl &> /dev/null; then
    echo "Installing WSL..."
    wsl --install
else
    echo "WSL is already installed."
fi

# Step 2: Install qemu-system-x86_64
if ! command -v qemu-system-x86_64 &> /dev/null; then
    echo "Installing qemu-system-x86_64..."
    echo "Please enter your sudo password to proceed with the installation."
    sudo apt-get update && sudo apt-get install -y qemu-system-x86
else
    echo "qemu-system-x86_64 is already installed."
fi

# Step 3: Install jq
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    sudo apt-get update && sudo apt-get install -y jq
else
    echo "jq is already installed."
fi

# Step 4: Install gvproxy
if ! command -v gvproxy &> /dev/null; then
    echo "Installing gvproxy..."
    sudo apt-get update && sudo apt-get install -y gvproxy
else
    echo "gvproxy is already installed."
fi

# Step 5: Initialize the Podman machine (if not already initialized)
if ! podman machine list | grep -q "podman-machine-default"; then
    echo "Initializing Podman machine..."
    podman machine init
else
    echo "Podman machine already exists."
fi

# Step 6: Start the Podman machine (if not already running)
if ! podman machine list | grep -q "Running"; then
    echo "Starting Podman machine..."
    podman machine start
else
    echo "Podman machine is already running."
fi

# Step 7: Verify Podman configuration
echo "Verifying Podman configuration..."
podman info --format json | jq .host.security.rootless

# Step 8: Test rootless mode
echo "Testing rootless mode with a hello-world container..."
podman run hello-world

# Step 9: Pull AI security tool images
podman pull caldera:latest
podman pull clip:latest
podman pull deepexploit:latest
podman pull aihids:latest
podman pull tensorflow-privacy:latest

# Step 10: Create network for AI security tools
podman network create ai-security-net
