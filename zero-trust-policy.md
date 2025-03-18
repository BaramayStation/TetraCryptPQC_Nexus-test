# Zero Trust Security Policy

## Network Segmentation
- All communication between TetraCryptPQC and Yggdrasil nodes must use private Yggdrasil networking.
- SPIFFE IDs and mutual TLS are required for service-to-service communication.

## Access Control
- Identity-based access using Decentralized IDs (DIDs) and STARK proofs.
- Role-based access control (RBAC) enforced via Nomad ACLs.

## Encryption
- Dual-layer encryption: ML-KEM for key exchange and AES-256-GCM for data encryption.
- Automatic key rotation every 24 hours.

## Logging & Monitoring
- Immutable append-only logs stored in a secure, air-gapped system.
- Real-time monitoring of container activity using SELinux and AppArmor.

## Container Security
- Read-only filesystems for all containers.
- Non-root execution with user namespace isolation.
- Signed container images verified via Sigstore.
