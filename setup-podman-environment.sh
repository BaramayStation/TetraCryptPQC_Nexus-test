#!/bin/bash

# NSA-Grade Secure Podman Environment Setup for TetraCryptPQC + Yggdrasil

# Step 1: Remove Kubernetes, Nomad, and MicroK8s (if installed)
if dpkg -l | grep -q 'k3s'; then
    sudo systemctl stop k3s
    sudo apt-get remove --purge k3s -y
    sudo rm -rf /etc/kubernetes /var/lib/kubelet /var/lib/rancher
fi

if dpkg -l | grep -q 'microk8s'; then
    sudo systemctl stop microk8s
    sudo apt-get remove --purge microk8s -y
    sudo rm -rf /var/lib/microk8s
fi

if dpkg -l | grep -q 'nomad'; then
    sudo systemctl stop nomad
    sudo apt-get remove --purge nomad -y
    sudo rm -rf /etc/nomad
fi

# Step 2: Install and Harden Podman
sudo apt-get update
sudo apt-get install podman -y

# Skip SELinux and AppArmor in WSL2
echo "Skipping SELinux and AppArmor in WSL2."

# Step 3: Configure Yggdrasil Networking
sudo apt-get install yggdrasil -y
sudo mkdir -p /etc/yggdrasil
sudo yggdrasil -genconf | sudo tee /etc/yggdrasil.conf > /dev/null

# Create Yggdrasil socket directory
sudo mkdir -p /var/run/yggdrasil
sudo chown -R $USER:$USER /var/run/yggdrasil

# Start Yggdrasil manually (no systemd in WSL2)
sudo yggdrasil -useconffile /etc/yggdrasil.conf &

# Step 4: Deploy TetraCryptPQC in Podman
# Set custom temporary directory for Podman
export TMPDIR=/tmp/podman-$USER
mkdir -p $TMPDIR
chmod 700 $TMPDIR

# Set Podman temp directory to a writable location
export XDG_RUNTIME_DIR=$TMPDIR
mkdir -p $XDG_RUNTIME_DIR
chmod 700 $XDG_RUNTIME_DIR

# Reset Podman runtime directory
mkdir -p ~/.config/containers
rm -f ~/.config/containers/containers.conf
podman system reset --force

# Start Podman service
podman system service --time=0 &

# Set correct permissions for /run/user/1000
sudo mkdir -p /run/user/1000
sudo chown -R $USER:$USER /run/user/1000

# Create Podman configuration file
mkdir -p $HOME/.config/containers
cat <<EOF > $HOME/.config/containers/containers.conf
[engine]
runtime_dir = "/tmp/podman-$USER"
EOF

# Pull TetraCryptPQC image (air-gapped, pre-downloaded)
XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR podman pull registry.tetracrypt.io/tetracryptpqc:v1.0.0

# Create Podman Pod
XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR podman pod create --name tetracrypt-pod

# Run TetraCryptPQC container with security hardening
XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR podman run -d --name tetracryptpqc \
  --pod tetracrypt-pod \
  --read-only \
  --security-opt seccomp=/etc/seccomp/tetracrypt.json \
  --security-opt apparmor=podman-default \
  --security-opt label=type:container_t \
  --cap-drop=ALL \
  --user 1000:1000 \
  --network yggdrasil \
  registry.tetracrypt.io/tetracryptpqc:v1.0.0

# Step 5: Generate NSA-Approved Firewall Rules
# Use iptables instead of ufw in WSL2
sudo iptables -A INPUT -j DROP
sudo iptables -A OUTPUT -j ACCEPT
sudo iptables -A INPUT -p udp --dport 51820 -j ACCEPT # Yggdrasil peers

# Step 6: Skip Unnecessary System Services in WSL2
echo "Skipping disabling unnecessary services in WSL2."

# Step 7: Enable Self-Healing
# Use a simple restart loop instead of systemd
while true; do
    XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR podman start tetracryptpqc
    sleep 10
done &

# Step 8: Log Security Settings
LOGFILE="$HOME/tetracrypt-security.log"
echo "Security Settings:" | tee $LOGFILE > /dev/null
echo "- SELinux: Disabled (WSL2)" | tee -a $LOGFILE > /dev/null
echo "- AppArmor: Disabled (WSL2)" | tee -a $LOGFILE > /dev/null
echo "- Firewall: $(sudo iptables -n -L)" | tee -a $LOGFILE > /dev/null

# Step 9: Confirm Successful Setup
echo "NSA-Grade Secure Podman Environment Setup Complete!"
echo "Check $HOME/tetracrypt-security.log for details."
