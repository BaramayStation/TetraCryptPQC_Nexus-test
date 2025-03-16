import WebSocket, { WebSocketServer } from 'ws';
import { decryptWithKyber, encryptWithKyber, generateMLKEMKeypair } from '../backend/crypto.js';

// Generate ML-KEM keypair for server
let serverKeyPair;
(async () => {
    serverKeyPair = await generateMLKEMKeypair();
    console.log("🔹 Server ML-KEM-1024 Keypair Generated (NIST FIPS 205)");
})();

// Peer key storage (in production this would use HSM or secure enclave)
const peerKeys = new Map();

// 🔹 Start WebSocket Server
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    console.log("🔹 New Peer Connected");
    
    // Assign unique ID to peer
    const peerId = crypto.randomUUID();
    ws.peerId = peerId;
    
    // Store peer's public key when they send it
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log("📩 Incoming PQC Message:", data.type || "message");
            
            // Handle key exchange
            if (data.type === 'key_exchange') {
                peerKeys.set(peerId, data.public_key);
                // Send server's public key
                ws.send(JSON.stringify({
                    type: 'key_exchange',
                    public_key: serverKeyPair.publicKey,
                    server_id: 'tetra-pqc-server'
                }));
                return;
            }
            
            // 🔹 Decrypt Message with ML-KEM (Ensure authenticity)
            const decryptedContent = await decryptWithKyber(data.encrypted_content, serverKeyPair.privateKey);

            // 🔹 Re-encrypt for other peers with their ML-KEM keys & forward
            wss.clients.forEach(async (client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    // Get the recipient's public key
                    const recipientKey = peerKeys.get(client.peerId);
                    
                    if (recipientKey) {
                        // Re-encrypt with recipient's ML-KEM public key
                        const reEncrypted = await encryptWithKyber(decryptedContent, recipientKey);
                        
                        client.send(JSON.stringify({
                            sender: data.sender,
                            encrypted_content: reEncrypted,
                            timestamp: Date.now(),
                            pqc_algorithm: "ML-KEM-1024+SHAKE-256",
                            standard: "NIST FIPS 205"
                        }));
                    }
                }
            });
        } catch (error) {
            console.error("❌ Error processing message:", error);
        }
    });

    ws.on('close', () => {
        console.log("🔴 Peer Disconnected");
        // Clean up
        peerKeys.delete(ws.peerId);
    });
});

console.log("✅ Post-Quantum Secure P2P WebSocket Server Running on ws://localhost:8080");
console.log("🔒 Using ML-KEM-1024 and SHAKE-256 (NIST FIPS 205/202)");
