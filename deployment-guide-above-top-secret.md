# DEPLOYMENT GUIDE: HARDENED TETRACRYPTPQC + YGGDRASIL ON NOMAD + PODMAN
**Classification: ABOVE TOP SECRET**
**Distribution: RESTRICTED**

---

#### **1. PRE-DEPLOYMENT PREPARATION**
1.1. **System Hardening**:
   - Ensure all host systems are FIPS 140-3 compliant.
   - Enable SELinux and AppArmor at the host level.

1.2. **Key Management**:
   - Generate cryptographic keys for ML-KEM and SLH-DSA using FIPS-validated modules.
   - Store keys in a Hardware Security Module (HSM) or secure key vault.

1.3. **Container Image Verification**:
   - Pull signed TetraCryptPQC and Yggdrasil images from a trusted registry.
   - Verify signatures using Sigstore.

---

#### **2. NOMAD JOB DEPLOYMENT**
2.1. **Job Configuration**:
   - Deploy the `tetracrypt.nomad` job file to the Nomad cluster.
   - Ensure the job is configured for non-root execution and user namespace isolation.

2.2. **Network Configuration**:
   - Configure private Yggdrasil networking for all nodes.
   - Enforce SPIFFE IDs and mutual TLS for service-to-service communication.

2.3. **Key Rotation**:
   - Enable automatic key rotation with a 24-hour interval.

---

#### **3. PODMAN CONTAINER DEPLOYMENT**
3.1. **Container Configuration**:
   - Deploy containers using the `podman-secure.json` configuration.
   - Ensure read-only filesystems and dropped capabilities are enforced.

3.2. **Security Profiles**:
   - Apply Seccomp and AppArmor profiles for container confinement.

3.3. **Logging & Monitoring**:
   - Configure immutable append-only logs stored in a secure, air-gapped system.
   - Enable real-time monitoring using SELinux and AppArmor.

---

#### **4. ZERO TRUST ENFORCEMENT**
4.1. **Network Segmentation**:
   - Isolate TetraCryptPQC and Yggdrasil nodes using private networking.

4.2. **Access Control**:
   - Enforce identity-based access using Decentralized IDs (DIDs) and STARK proofs.
   - Implement Role-Based Access Control (RBAC) via Nomad ACLs.

4.3. **Lateral Movement Prevention**:
   - Block unauthorized lateral movement using SPIFFE and mutual TLS.

---

#### **5. POST-DEPLOYMENT VERIFICATION**
5.1. **Compliance Check**:
   - Verify FIPS 140-3 compliance for all cryptographic modules.
   - Ensure SELinux and AppArmor profiles are active and enforced.

5.2. **Audit Log Review**:
   - Confirm immutable append-only logs are functioning as intended.

5.3. **Operational Testing**:
   - Test key rotation and verify cryptographic operations.
   - Validate Zero Trust policies and network segmentation.

---

**END OF DOCUMENT**
**Classification: ABOVE TOP SECRET**
**Distribution: RESTRICTED**
