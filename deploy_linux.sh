#!/bin/bash
set -e
echo "🚀 Installing Yggdrasil + TetraCryptPQC Nexus for Quantum-Secure P2P"
# 1️⃣ Install Yggdrasil
echo "🔹 Downloading Yggdrasil..."
wget https://github.com/yggdrasil-network/yggdrasil-go/releases/latest/download/yggdrasil-0.5.12-linux-amd64 -O yggdrasil
chmod +x yggdrasil
sudo mv yggdrasil /usr/local/bin/
# 2️⃣ Generate Yggdrasil Configuration
echo "🔹 Generating secure Yggdrasil configuration..."
yggdrasil -genconf > /etc/yggdrasil.conf
# 3️⃣ Enable Yggdrasil as a systemd service
echo "🔹 Configuring Yggdrasil to start on boot..."
sudo tee /etc/systemd/system/yggdrasil.service <<EOF
[Unit]
Description=Yggdrasil Secure P2P Network
After=network.target
[Service]
ExecStart=/usr/local/bin/yggdrasil -useconffile /etc/yggdrasil.conf
Restart=always
User=root
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable yggdrasil
sudo systemctl start yggdrasil
# 4️⃣ Install TetraCryptPQC Nexus
echo "🔹 Installing TetraCryptPQC Nexus..."
git clone https://github.com/BaramayStation/TetraCryptPQC_Nexus.git
cd TetraCryptPQC_Nexus
pnpm install --ignore-scripts
pnpm build
# 5️⃣ Configure Tahoe-LAFS for Secure Storage
echo "🔹 Setting up Tahoe-LAFS for encrypted storage..."
sudo apt install -y tahoe-lafs
tahoe create-client
tahoe start
# 6️⃣ Configure Vault for Secure Key Management
echo "🔹 Installing HashiCorp Vault for Zero-Trust Security..."
sudo apt install -y vault
vault server -dev
echo "✅ Installation Complete! Yggdrasil + TetraCryptPQC Nexus is now running securely."
