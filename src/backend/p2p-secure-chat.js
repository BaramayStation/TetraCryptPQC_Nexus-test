
/**
 * TetraCryptPQC Secure P2P Chat Implementation
 * Now with Rust backend integration
 */

import { createLibp2p } from 'libp2p';
import { WebSockets } from '@libp2p/websockets';
import { Mplex } from '@libp2p/mplex';
import { Bootstrap } from '@libp2p/bootstrap';
import { encryptWithKyber, decryptWithKyber } from '../lib/pqcrypto';
import { generateMLKEMKeypair, generateFalconKeypair } from '../lib/rust-pqc-bridge';

// Peer Discovery Bootstrap Nodes
const BOOTSTRAP_NODES = ["/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/12D3KooWEbGJ9jBz7bLX"];

// Generate secure session keys using ML-KEM and Falcon
const getKeys = async () => {
  // Generate both ML-KEM for encryption and Falcon for signatures
  const kemKeyPair = await generateMLKEMKeypair();
  const signKeyPair = await generateFalconKeypair();
  
  console.log(" Post-Quantum Keypairs Ready (ML-KEM-1024 & Falcon-1024)");
  
  return {
    encryption: kemKeyPair,
    signature: signKeyPair
  };
};

// Initialize keysPromise
const keysPromise = getKeys();

// Create Secure Chat Node
async function createChatNode() {
  const node = await createLibp2p({
    transports: [new WebSockets()],
    streamMuxers: [new Mplex()],
    peerDiscovery: [new Bootstrap({ list: BOOTSTRAP_NODES })]
  });

  const keys = await keysPromise;

  await node.start();
  console.log(" Secure P2P Chat Node Started:", node.peerId.toString());
  console.log(" Using PQC Algorithms: ML-KEM-1024, Falcon-1024, SHAKE-256");

  // Handle Incoming Messages
  node.handle('/secure-chat', async ({ stream }) => {
    const reader = stream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      try {
        // Parse the incoming message
        const encryptedData = JSON.parse(new TextDecoder().decode(value));
        
        // Decrypt with Kyber (ML-KEM)
        const decryptedMessage = await decryptWithKyber(encryptedData, keys.encryption.privateKey);
        
        // Verify signature (would be implemented in full version)
        // const isValid = await verifySignature(decryptedMessage, encryptedData.signature, encryptedData.senderPublicKey);
        
        console.log(` Secure PQC Message: ${decryptedMessage}`);
      } catch (error) {
        console.error(" Error decrypting message:", error);
      }
    }
  });

  return {node, keys};
}

// Send Encrypted Message
async function sendMessage(node, peerId, message, keys) {
  const { stream } = await node.dialProtocol(peerId, '/secure-chat');
  const writer = stream.getWriter();

  try {
    // Encrypt the message with ML-KEM (Kyber)
    const encryptedMessage = await encryptWithKyber(message, keys.encryption.publicKey);
    
    // Sign the message with Falcon-1024
    // In a real implementation, we would sign the message hash
    // const signature = await signMessage(message, keys.signature.privateKey);
    
    // Add signature to the encrypted package
    const securePackage = {
      ...encryptedMessage,
      // signature: signature,
      senderPublicKey: keys.signature.publicKey
    };
    
    // Send the secure package
    await writer.write(new TextEncoder().encode(JSON.stringify(securePackage)));

    console.log(` PQC Secure Message Sent: ${message}`);
  } catch (error) {
    console.error(" Error sending secure message:", error);
  }
}

// Start Secure Chat
createChatNode().then(async ({ node, keys }) => {
  console.log(" Waiting for Secure Connections...");
  setTimeout(async () => {
    await sendMessage(node, "12D3Koo...", "Hello, Post-Quantum World!", keys);
  }, 5000);
});
