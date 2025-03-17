# PowerShell Script for Yggdrasil + TetraCryptPQC Nexus Deployment
Write-Host "Installing Yggdrasil + TetraCryptPQC Nexus for Quantum-Secure P2P"
# 1️⃣ Check if Yggdrasil is already installed
if (Get-Command yggdrasil -ErrorAction SilentlyContinue) {
    Write-Host "Yggdrasil is already installed. Skipping installation."
} else {
    Write-Host "Installing Yggdrasil via Chocolatey..."
    try {
        choco install yggdrasil
    } catch {
        Write-Host "Failed to install Yggdrasil via Chocolatey. Please check your internet connection or manually install it."
        exit 1
    }
}
# 2️⃣ Generate Yggdrasil Configuration
Write-Host "Generating secure Yggdrasil configuration..."
& yggdrasil -genconf | Out-File -Encoding utf8 yggdrasil.conf
# 3️⃣ Start Yggdrasil
Write-Host "Starting Yggdrasil..."
Start-Process yggdrasil -ArgumentList "-useconffile yggdrasil.conf"
# 4️⃣ Install TetraCryptPQC Nexus
Write-Host "Installing TetraCryptPQC Nexus..."
if (Test-Path "TetraCryptPQC_Nexus") {
    Write-Host "TetraCryptPQC_Nexus directory already exists. Skipping clone."
} else {
    git clone https://github.com/BaramayStation/TetraCryptPQC_Nexus.git
}
cd TetraCryptPQC_Nexus
if (Test-Path "package.json") {
    Write-Host "Found package.json, proceeding with pnpm install..."
    if (Test-Path "package.json") {
        pnpm install
        pnpm build
    } else {
        Write-Host "Error: package.json not found. Ensure the project is properly initialized."
        exit 1
    }
} else {
    Write-Host "Error: package.json not found. Ensure the project is properly initialized."
    exit 1
}
# 5️⃣ Configure Tahoe-LAFS for Secure Storage
Write-Host "Setting up Tahoe-LAFS for encrypted storage..."
winget install tahoe-lafs
tahoe create-client
tahoe start
# 6️⃣ Configure Vault for Secure Key Management
Write-Host "Installing HashiCorp Vault for Zero-Trust Security..."
winget install HashiCorp.Vault
vault server -dev
Write-Host "Installation Complete! Yggdrasil + TetraCryptPQC Nexus is now running securely."
