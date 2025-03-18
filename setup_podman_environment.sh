#!/bin/bash

# NSA-Grade Secure Podman Environment Setup
# For TetraCryptPQC + Yggdrasil

set -euo pipefail

# Logging setup
LOG_FILE="/var/log/tetracrypt_setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# System information
OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
OS_VERSION=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')

# Security configuration
SELINUX_ENFORCING=1
APPARMOR_ENABLED=1
SECCOMP_PROFILE="/etc/containers/seccomp.json"

# Network configuration
YGGDRASIL_NETWORK="tetracrypt_net"
YGGDRASIL_PORT=9001

# Container configuration
TETRACRYPT_IMAGE="tetracrypt_pqc:latest"
POD_NAME="tetracrypt_pod"

# FIPS 140-3 compliance
FIPS_MODE=1

# Rootless configuration
ROOTLESS_USER=$(whoami)

# Firewall configuration
FIREWALL_RULES="/etc/iptables/tetracrypt.rules"

# Initialize variables
SUCCESS=0
ERROR_LOG="/var/log/tetracrypt_error.log"

# Clean error log
echo "" > "$ERROR_LOG"

# Function to log errors
log_error() {
    echo "[ERROR] $1" | tee -a "$ERROR_LOG"
}

# Function to verify FIPS compliance
verify_fips() {
    if [[ $FIPS_MODE -eq 1 ]]; then
        if ! openssl version | grep -q "FIPS"; then
            log_error "FIPS mode not enabled in OpenSSL"
            return 1
        fi
    fi
}

# Function to check SELinux status
check_selinux() {
    if [[ $SELINUX_ENFORCING -eq 1 ]]; then
        if ! sestatus | grep -q "Current mode:.*enforcing"; then
            log_error "SELinux not in enforcing mode"
            return 1
        fi
    fi
}

# Function to check AppArmor status
check_apparmor() {
    if [[ $APPARMOR_ENABLED -eq 1 ]]; then
        if ! aa-status | grep -q "apparmor module is loaded"; then
            log_error "AppArmor not enabled"
            return 1
        fi
    fi
}

# Function to remove Kubernetes components
remove_kubernetes() {
    echo "Removing Kubernetes components..."
    
    # Stop and remove k3s
    if systemctl is-active --quiet k3s; then
        sudo systemctl stop k3s
        sudo k3s-uninstall.sh
    fi

    # Stop and remove MicroK8s
    if snap list | grep -q microk8s; then
        sudo snap remove microk8s --purge
    fi

    # Remove kubectl
    if command -v kubectl &> /dev/null; then
        sudo apt-get remove --purge kubectl -y
    fi

    # Clean up remaining files
    sudo rm -rf /etc/rancher /var/lib/rancher /var/lib/kubelet
}

# Function to install and harden Podman
install_podman() {
    echo "Installing and hardening Podman..."

    # Install Podman
    case $OS_ID in
        "fedora" | "rhel" | "centos")
            sudo dnf install -y podman podman-docker
            ;;
        "debian" | "ubuntu")
            sudo apt-get update
            sudo apt-get install -y podman podman-docker
            ;;
        *)
            log_error "Unsupported OS: $OS_ID"
            return 1
            ;;
    esac

    # Enable cgroups v2
    sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"

    # Configure SELinux
    if [[ $SELINUX_ENFORCING -eq 1 ]]; then
        sudo setenforce 1
        sudo sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
    fi

    # Configure AppArmor
    if [[ $APPARMOR_ENABLED -eq 1 ]]; then
        sudo systemctl enable apparmor
        sudo systemctl start apparmor
    fi

    # Configure seccomp
    sudo mkdir -p /etc/containers
    cat <<EOF | sudo tee $SECCOMP_PROFILE > /dev/null
{
    "defaultAction": "SCMP_ACT_ERRNO",
    "syscalls": [
        {
            "names": [
                "accept",
                "bind",
                "connect",
                "listen",
                "socket"
            ],
            "action": "SCMP_ACT_ALLOW"
        }
    ]
}
EOF
}

# Function to configure Yggdrasil networking
setup_yggdrasil() {
    echo "Setting up Yggdrasil network..."

    # Create Yggdrasil network
    podman network create --driver bridge --subnet 10.10.0.0/24 $YGGDRASIL_NETWORK

    # Configure firewall rules
    generate_firewall_rules
}

# Function to generate NSA-approved firewall rules
generate_firewall_rules() {
    echo "Generating firewall rules..."

    cat <<EOF | sudo tee $FIREWALL_RULES > /dev/null
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT DROP [0:0]

# Allow Yggdrasil traffic
-A INPUT -p tcp --dport $YGGDRASIL_PORT -j ACCEPT
-A INPUT -p udp --dport $YGGDRASIL_PORT -j ACCEPT

# Allow loopback traffic
-A INPUT -i lo -j ACCEPT
-A OUTPUT -o lo -j ACCEPT

# Allow established connections
-A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
-A OUTPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

COMMIT
EOF

    # Apply firewall rules
    sudo iptables-restore < $FIREWALL_RULES
}

# Function to deploy TetraCryptPQC securely
deploy_tetracrypt() {
    echo "Deploying TetraCryptPQC securely..."

    # Pull the image
    podman pull $TETRACRYPT_IMAGE

    # Create a read-only container
    podman create \
        --name tetracrypt_container \
        --pod $POD_NAME \
        --read-only \
        --security-opt seccomp=$SECCOMP_PROFILE \
        --security-opt label=type:container_t \
        $TETRACRYPT_IMAGE

    # Start the container
    podman start tetracrypt_container
}

# Function to create and manage the Podman Pod
create_pod() {
    echo "Creating Podman Pod..."

    # Create the pod
    podman pod create \
        --name $POD_NAME \
        --network $YGGDRASIL_NETWORK \
        --publish $YGGDRASIL_PORT:$YGGDRASIL_PORT
}

# Function to implement self-healing
setup_self_healing() {
    echo "Setting up self-healing..."

    # Create a systemd service for the pod
    cat <<EOF | sudo tee /etc/systemd/system/tetracrypt-pod.service > /dev/null
[Unit]
Description=TetraCrypt Podman Pod
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/podman pod start $POD_NAME
ExecStop=/usr/bin/podman pod stop $POD_NAME
Restart=always
RestartSec=5s
User=$ROOTLESS_USER

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable tetracrypt-pod
    sudo systemctl start tetracrypt-pod
}

# Function to disable unnecessary services
disable_services() {
    echo "Disabling unnecessary services..."

    # List of services to disable
    local services=(
        avahi-daemon
        cups
        bluetooth
        ModemManager
        NetworkManager-wait-online
    )

    for service in "${services[@]}"; do
        if systemctl is-enabled --quiet $service; then
            sudo systemctl disable $service
            sudo systemctl stop $service
        fi
    done
}

# Function to enforce FIPS 140-3 compliance
enforce_fips() {
    echo "Enforcing FIPS 140-3 compliance..."

    # Configure OpenSSL for FIPS
    sudo sed -i 's/^CipherString =.*/CipherString = DEFAULT@SECLEVEL=2/' /etc/ssl/openssl.cnf

    # Verify FIPS module
    if ! openssl fipsinstall -out /etc/ssl/fipsmodule.cnf; then
        log_error "Failed to install FIPS module"
        return 1
    fi

    # Configure system for FIPS
    sudo fips-mode-setup --enable
}

# Function to configure air-gap settings
configure_airgap() {
    echo "Configuring air-gap settings..."

    # Disable network interfaces
    for interface in $(ls /sys/class/net/ | grep -v lo); do
        sudo ip link set $interface down
    done

    # Remove DNS servers
    sudo rm -f /etc/resolv.conf
    sudo touch /etc/resolv.conf
    sudo chattr +i /etc/resolv.conf

    # Disable network services
    sudo systemctl stop NetworkManager
    sudo systemctl disable NetworkManager
}

# Function to verify final security settings
verify_security() {
    echo "Verifying final security settings..."

    # Create security log
    echo "Security Settings:" | sudo tee /var/log/tetracrypt_security.log
    echo "\nSELinux Status:" | sudo tee -a /var/log/tetracrypt_security.log
    sestatus | sudo tee -a /var/log/tetracrypt_security.log
    echo "\nAppArmor Status:" | sudo tee -a /var/log/tetracrypt_security.log
    aa-status | sudo tee -a /var/log/tetracrypt_security.log
    echo "\nFIPS Status:" | sudo tee -a /var/log/tetracrypt_security.log
    openssl version | sudo tee -a /var/log/tetracrypt_security.log
    echo "\nFirewall Rules:" | sudo tee -a /var/log/tetracrypt_security.log
    sudo iptables -L -n -v | sudo tee -a /var/log/tetracrypt_security.log
}

# Function to verify network connectivity
verify_network() {
    echo "Verifying network connectivity between TetraCryptPQC and Yggdrasil..."

    # Check if Yggdrasil port is open
    if ! nc -z localhost $YGGDRASIL_PORT; then
        log_error "Yggdrasil port $YGGDRASIL_PORT is not open"
        return 1
    fi

    # Verify container-to-container communication
    if ! podman exec tetracrypt_container ping -c 1 $YGGDRASIL_NETWORK; then
        log_error "TetraCryptPQC cannot reach Yggdrasil network"
        return 1
    fi

    # Test secure message exchange
    TEST_MESSAGE="test_message_$(date +%s)"
    if ! podman exec tetracrypt_container curl -X POST http://$YGGDRASIL_NETWORK:$YGGDRASIL_PORT/test -d "$TEST_MESSAGE"; then
        log_error "Failed to send test message to Yggdrasil"
        return 1
    fi
}

# Function to configure secure message exchange
configure_message_exchange() {
    echo "Configuring secure message exchange..."

    # Create message exchange endpoint
    cat <<EOF | podman exec -i tetracrypt_container tee /app/message_endpoint.py > /dev/null
import socket
import ssl

context = ssl.create_default_context()
context.load_cert_chain(certfile="/app/cert.pem", keyfile="/app/key.pem")

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    with context.wrap_socket(s, server_side=True) as ssock:
        ssock.bind(("0.0.0.0", $YGGDRASIL_PORT))
        ssock.listen(1)
        while True:
            conn, addr = ssock.accept()
            with conn:
                data = conn.recv(1024)
                if data:
                    conn.sendall(data)
EOF

    # Generate SSL certificates
    podman exec tetracrypt_container openssl req -x509 -newkey rsa:4096 -keyout /app/key.pem -out /app/cert.pem -days 365 -nodes -subj "/CN=tetracrypt"

    # Start message exchange service
    podman exec -d tetracrypt_container python3 /app/message_endpoint.py
}

# Main execution flow
main() {
    echo "Starting NSA-grade secure Podman environment setup..."

    # Verify system requirements
    verify_fips || return 1
    check_selinux || return 1
    check_apparmor || return 1

    # Setup process
    remove_kubernetes
    install_podman
    setup_yggdrasil
    create_pod
    deploy_tetracrypt
    setup_self_healing
    disable_services
    enforce_fips
    configure_airgap
    configure_message_exchange
    verify_network
    verify_security

    echo "Setup completed successfully!"
    echo "Logs can be found at $LOG_FILE"
    echo "Error logs can be found at $ERROR_LOG"
    echo "Security verification log: /var/log/tetracrypt_security.log"

    SUCCESS=1
}

# Execute main function
main
