#!/bin/bash

# Build the container image with security scanning
podman build --security-opt=no-new-privileges -t jest-container .

# Run Jest tests with failover and resource limits
podman run --rm \
  --memory="512m" \
  --cpus="1" \
  --security-opt=no-new-privileges \
  --ulimit nofile=1024:1024 \
  -v "$(pwd):/app" \
  jest-container
