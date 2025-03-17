/**
 * TetraCryptPQC In-Memory Storage Implementation
 * For fallback when localStorage or other persistent storage is unavailable
 */

import { 
  FailsafeComponentType, 
  FailsafeImplementation, 
  FailsafeStatus, 
  FailsafeStrategy,
  FailsafeTestResult 
} from '../types';
import { StorageImplementation, StorageMedium } from './types';
import { storageFailsafe } from './coordinator';

class InMemoryStorageImplementation implements StorageImplementation {
  private storage: Map<string, string> = new Map();
  
  /**
   * Set an item in the in-memory storage.
   * @param key - The key to set.
   * @param value - The value to store.
   * @returns {Promise<boolean>} True if the operation succeeds, false otherwise.
   */
  async setItem(key: string, value: string): Promise<boolean> {
    try {
      this.storage.set(key, value);
      console.log(`Item set in memory storage: ${key}`);
      return true;
    } catch (error) {
      console.error('Failed to set item in memory storage:', error);
      return false;
    }
  }
  
  /**
   * Get an item from the in-memory storage.
   * @param key - The key to retrieve.
   * @returns {Promise<string | null>} The stored value or null if not found.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = this.storage.get(key) || null;
      console.log(`Item retrieved from memory storage: ${key}`);
      return value;
    } catch (error) {
      console.error('Failed to get item from memory storage:', error);
      return null;
    }
  }
  
  /**
   * Remove an item from the in-memory storage.
   * @param key - The key to remove.
   * @returns {Promise<boolean>} True if the operation succeeds, false otherwise.
   */
  async removeItem(key: string): Promise<boolean> {
    try {
      this.storage.delete(key);
      console.log(`Item removed from memory storage: ${key}`);
      return true;
    } catch (error) {
      console.error('Failed to remove item from memory storage:', error);
      return false;
    }
  }
  
  async clear(): Promise<boolean> {
    try {
      this.storage.clear();
      return true;
    } catch (error) {
      console.error(`Error clearing memory storage:`, error);
      return false;
    }
  }
  
  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

// Create and register the implementation
const inMemoryStorageImpl: FailsafeImplementation<StorageImplementation> = {
  id: `${StorageMedium.IN_MEMORY}-fallback`,
  name: "In-Memory Storage",
  type: FailsafeComponentType.STORAGE,
  description: "Ephemeral in-memory storage for fallback scenarios",
  priority: 60,
  strategy: FailsafeStrategy.BACKUP,
  implementation: new InMemoryStorageImplementation(),
  status: FailsafeStatus.ONLINE,
  
  /**
   * Check if the in-memory storage is available.
   * @returns {Promise<boolean>} True if available, false otherwise.
   */
  async isAvailable(): Promise<boolean> {
    // In-memory storage is always available
    return true;
  },
  
  /**
   * Activate the in-memory storage.
   * @returns {Promise<boolean>} True if activation succeeds, false otherwise.
   */
  async activate(): Promise<boolean> {
    try {
      this.implementation.storage = new Map();
      console.log('In-memory storage activated');
      this.status = FailsafeStatus.FALLBACK;
      return true;
    } catch (error) {
      console.error('Failed to activate in-memory storage:', error);
      return false;
    }
  },
  
  async deactivate(): Promise<boolean> {
    console.log("Deactivating in-memory storage implementation");
    return true;
  },
  
  async test(): Promise<FailsafeTestResult> {
    try {
      const startTime = performance.now();
      
      // Test basic storage operations
      const testKey = `test-${crypto.randomUUID()}`;
      const testValue = `Test value ${Date.now()}`;
      
      await this.implementation.setItem(testKey, testValue);
      const retrievedValue = await this.implementation.getItem(testKey);
      await this.implementation.removeItem(testKey);
      
      const endTime = performance.now();
      
      return {
        success: retrievedValue === testValue,
        latency: endTime - startTime,
        details: {
          valueStored: testValue,
          valueRetrieved: retrievedValue,
          getSuccessful: retrievedValue === testValue
        }
      };
    } catch (error) {
      console.error("Error testing in-memory storage implementation:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
};

// Register with the storage failsafe coordinator
storageFailsafe.registerImplementation(inMemoryStorageImpl);

export default inMemoryStorageImpl;
