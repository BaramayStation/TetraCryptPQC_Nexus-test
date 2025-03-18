#!/bin/bash

# Set up user-space directories
mkdir -p ~/.k3s/{bin,etc,run/podman}
export PATH=~/.k3s/bin:$PATH

# Download and install k3s in user-space
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_ENABLE=true INSTALL_K3S_SKIP_START=true INSTALL_K3S_SKIP_SELINUX_RPM=true sh -

# Configure k3s for user-space
cat > ~/.k3s/etc/k3s.yaml <<EOF
write-kubeconfig-mode: "0644"
tls-san:
  - "tetracryptpqc.local"
container-runtime-endpoint: "unix://$HOME/.k3s/run/podman/podman.sock"
EOF

# Start k3s in user-space
k3s server --config ~/.k3s/etc/k3s.yaml &

# Verify installation
kubectl get nodes
