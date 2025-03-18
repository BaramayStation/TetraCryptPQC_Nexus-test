#!/bin/bash

# Set up user-space directories
mkdir -p ~/.nomad/{bin,etc,run/podman}
export PATH=~/.nomad/bin:$PATH

# Download and install Nomad in user-space
curl -sfL https://releases.hashicorp.com/nomad/1.3.0/nomad_1.3.0_linux_amd64.zip -o nomad.zip
unzip nomad.zip -d ~/.nomad/bin/

# Configure Nomad for user-space
cat > ~/.nomad/etc/nomad.hcl <<EOF
write-kubeconfig-mode: "0644"
tls-san:
  - "tetracryptpqc.local"
container_runtime_endpoint = "unix://$HOME/.nomad/run/podman/podman.sock"
EOF

# Start Nomad in user-space
nomad agent -config ~/.nomad/etc/nomad.hcl &

# Verify installation
nomad node status
