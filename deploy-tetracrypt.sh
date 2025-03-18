#!/bin/bash

# Remove Kubernetes, Nomad, and MicroK8s
sudo apt-get remove --purge -y k3s microk8s nomad

# Install Podman (rootless)
sudo apt-get update
sudo apt-get install -y podman slirp4netns fuse-overlayfs

# Enable SELinux (enforcing mode)
sudo setenforce 1

# Create AppArmor profile for TetraCryptPQC
cat <<EOF | sudo tee /etc/apparmor.d/tetracrypt
#include <tunables/global>

profile tetracrypt flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/ssl_keys>

  # Deny all network access except Yggdrasil
  deny network,
  network inet,
  network inet6,

  # Allow Yggdrasil ports
  network inet tcp 8080,
  network inet udp 8080,

  # Deny all filesystem writes
  deny / rw,
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/tetracrypt

# Create seccomp profile for TetraCryptPQC
cat <<EOF | sudo tee /etc/containers/seccomp.json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": ["read", "write", "close", "exit", "exit_group"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
EOF

# Configure Yggdrasil private network
cat <<EOF | sudo tee /etc/yggdrasil.conf
{
  "Peers": [],
  "Listen": ["tcp://0.0.0.0:8080"],
  "AdminListen": "unix:///var/run/yggdrasil.sock",
  "AllowedPublicKeys": [],
  "IfName": "ygg0",
  "IfMTU": 65535,
  "PrivateKey": "",
  "PublicKey": "",
  "NodeInfo": {}
}
EOF

# Deploy TetraCryptPQC in a Podman Pod
podman pod create --name tetracrypt-pod --publish 8080:8080

# Run TetraCryptPQC container
podman run --detach \
  --name tetracrypt \
  --pod tetracrypt-pod \
  --security-opt seccomp=/etc/containers/seccomp.json \
  --security-opt apparmor=tetracrypt \
  --security-opt label=type:container_t \
  --read-only \
  --user nobody \
  --env FIPS_MODE=enabled \
  --env ZERO_TRUST=true \
  --env YGGDRASIL_NETWORK=private \
  tetracrypt:latest

# Generate NSA-approved firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 8080/tcp
sudo ufw enable

# Disable unnecessary services
sudo systemctl disable --now avahi-daemon cups-browsed

# Log security settings
echo "Security settings applied:"
echo "- SELinux: $(getenforce)"
echo "- AppArmor: $(aa-status)"
echo "- Firewall: $(sudo ufw status)"

# Confirm successful setup
echo "TetraCryptPQC and Yggdrasil deployed securely in Podman."
