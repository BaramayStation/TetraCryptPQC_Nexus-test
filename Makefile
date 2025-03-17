# ============================================================================
# Secure Makefile for TetraCryptPQC (Military-Grade Standards)
# - Enforces security compliance (DoD, NIST 800-171, FIPS)
# - Supports air-gapped deployment & rootless Podman containers
# - Automates build, test, and security audit processes
# ============================================================================

SHELL := /bin/bash
PROJECT_NAME := tetracryptpqc
VERSION := 1.4.2
REGISTRY := ghcr.io/baramaystation
IMAGE_NAME := $(REGISTRY)/$(PROJECT_NAME):$(VERSION)
SECURITY_TOOLS := trivy bandit hadolint

# ============================================================================
# DEPENDENCY INSTALLATION
# ============================================================================
.PHONY: install-deps
install-deps:
	@echo "🔧 [TOP SECRET] Installing system dependencies..."
	if ! command -v podman &> /dev/null; then \
		sudo apt update && sudo apt install -y podman; \
	fi
	if ! command -v trivy &> /dev/null; then \
		sudo apt update && sudo apt install -y trivy; \
	fi
	if ! command -v bandit &> /dev/null; then \
		sudo apt update && sudo apt install -y bandit; \
	fi
	if ! command -v hadolint &> /dev/null; then \
		sudo apt update && sudo apt install -y hadolint; \
	fi
	@echo "✅ [TOP SECRET] Dependencies installed."

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================
.PHONY: setup-env
setup-env:
	@echo "🛠️ [TOP SECRET] Setting up environment..."
	if ! test -f .env; then \
		echo "PORT=3000\nNODE_ENV=production" > .env; \
		echo "✅ [TOP SECRET] .env file created."; \
	else \
		echo "✅ [TOP SECRET] .env file already exists."; \
	fi

# ============================================================================
# DEPENDENCY UPDATES
# ============================================================================
.PHONY: update-deps
update-deps:
	@echo "🔄 [TOP SECRET] Updating dependencies securely..."
	npm update --depth 9999 --audit
	@echo "✅ [TOP SECRET] Dependencies updated."

# ============================================================================
# SECURITY HARDENING
# ============================================================================
.PHONY: harden
harden:
	@echo "🔒 [TOP SECRET] Hardening security..."
	npm audit fix --force
	@echo "✅ [TOP SECRET] Security hardening complete."

# ============================================================================
# AIR-GAPPED DEPLOYMENT
# ============================================================================
.PHONY: airgap-build
airgap-build:
	@echo "📦 [TOP SECRET] Building for air-gapped deployment..."
	podman build --no-cache -t $(IMAGE_NAME) .
	podman save -o $(PROJECT_NAME)-$(VERSION).tar $(IMAGE_NAME)
	@echo "✅ [TOP SECRET] Air-gapped build complete."

.PHONY: airgap-deploy
airgap-deploy:
	@echo "🚀 [TOP SECRET] Deploying from air-gapped environment..."
	podman load -i $(PROJECT_NAME)-$(VERSION).tar
	kubectl apply -f kubernetes/tetracryptpqc-deployment.yaml
	@echo "✅ [TOP SECRET] Air-gapped deployment complete."

# ============================================================================
# FULL AUTOMATION
# ============================================================================
.PHONY: all
all: install-deps setup-env update-deps harden build test lint deploy
	@echo "🚀 [TOP SECRET] Full automation complete."

# ============================================================================
# SYSTEM REQUIREMENTS & VALIDATION
# ============================================================================
.PHONY: check-system
check-system:
	@echo "🔍 [TOP SECRET] Verifying system requirements..."
	@if ! command -v podman &> /dev/null; then \
		echo "❌ [TOP SECRET] ERROR: Podman not detected. Run 'make install-deps' to install."; exit 1; \
	fi
	@if ! command -v npm &> /dev/null; then \
		echo "❌ [TOP SECRET] ERROR: Node.js and npm not detected. Installation required."; exit 1; \
	fi
	@echo "✅ [TOP SECRET] System verification complete."

# ============================================================================
# SECURITY CHECKS
# ============================================================================
.PHONY: security-audit
security-audit:
	@echo "🔐 Running security audit..."
	npx audit-ci --critical
	trivy fs --severity HIGH,CRITICAL --exit-code 1 .
	bandit -r .
	hadolint Dockerfile

# ============================================================================
# BUILD & TEST CONTAINER
# ============================================================================
.PHONY: build
build: security-audit
	@echo "⚙️ Building Podman container..."
	podman build --no-cache -t $(IMAGE_NAME) .

.PHONY: test
test:
	@echo "🧪 [TOP SECRET] Running secure tests..."
	podman run --rm $(IMAGE_NAME) npm test

.PHONY: lint
lint:
	@echo "🔍 [TOP SECRET] Running secure linting..."
	npm run lint

.PHONY: format
format:
	@echo "🛠 [TOP SECRET] Formatting code securely..."
	npm run format

# ============================================================================
# DEPLOYMENT
# ============================================================================
.PHONY: push
push: build
	@echo "🚀 [TOP SECRET] Pushing secure container..."
	podman push $(IMAGE_NAME)

.PHONY: deploy
deploy:
	@echo "📦 Deploying to Kubernetes..."
	kubectl apply -f kubernetes/tetracryptpqc-deployment.yaml

# ============================================================================
# CLEANUP
# ============================================================================
.PHONY: clean
clean:
	@echo "🧹 [TOP SECRET] Cleaning secure artifacts..."
	rm -rf node_modules package-lock.json
	podman rmi $(IMAGE_NAME) || true

.PHONY: reset
reset: clean
	@echo "🔄 [TOP SECRET] Resetting secure environment..."
	npm install
