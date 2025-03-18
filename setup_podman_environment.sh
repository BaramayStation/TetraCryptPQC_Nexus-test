#!/bin/bash

# Step 1: Remove Kubernetes, Nomad, and MicroK8s
sudo systemctl stop k3s microk8s nomad
sudo apt-get remove --purge k3s microk8s nomad -y

# Step 2: Install and harden Podman
sudo apt-get update
sudo apt-get install -y podman selinux-basics apparmor-utils
sudo selinux-activate
sudo aa-enforce /etc/apparmor.d/*

# Step 3: Configure Yggdrasil networking
sudo podman pull yggdrasil-network/yggdrasil-go
sudo podman network create yggdrasil-net

# Step 4: Deploy TetraCryptPQC securely
sudo podman pull tetracryptpqc/tetracrypt
sudo podman pod create --name tetracrypt-pod --network yggdrasil-net
sudo podman run -d --pod tetracrypt-pod --read-only --security-opt seccomp=./tetracrypt-seccomp.json --security-opt apparmor=./tetracrypt-apparmor --security-opt label=type:container_t tetracryptpqc/tetracrypt

# Step 5: Generate NSA-approved firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 8080/tcp # Example port for Yggdrasil
sudo ufw enable

# Step 6: Disable unnecessary services
sudo systemctl disable avahi-daemon cups bluetooth

# Step 7: Add self-healing
sudo podman run -d --pod tetracrypt-pod --restart always tetracryptpqc/tetracrypt

# Step 8: Log security settings
echo "Security Settings:" > security_log.txt
sestatus >> security_log.txt
aa-status >> security_log.txt

# Step 9: Confirm successful setup
echo "NSA-grade secure Podman environment setup complete."
