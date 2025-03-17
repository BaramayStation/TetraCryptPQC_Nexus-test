/**
 * TetraCryptPQC Storage Failsafe Coordinator
 */

import { FailsafeCoordinatorImpl } from '../coordinator';
import { FailsafeComponentType } from '../types';
import { StorageMedium } from './types';

class StorageFailsafeCoordinator extends FailsafeCoordinatorImpl {
  private currentMedium: StorageMedium | null = null;

  constructor() {
    super(FailsafeComponentType.STORAGE);
  }

  // Additional storage-specific methods
  /**
   * Get the current storage medium.
   * @returns {StorageMedium | null} The current storage medium or null if none is active.
   */
  getCurrentStorageMedium(): StorageMedium | null {
    try {
      return this.currentMedium;
    } catch (error) {
      console.error('Failed to get current storage medium:', error);
      return null;
    }
  }
  
  /**
   * Switch to a specific storage medium.
   * @param medium - The storage medium to switch to.
   * @returns {Promise<boolean>} True if the switch succeeds, false otherwise.
   */
  async switchToStorageMedium(medium: StorageMedium): Promise<boolean> {
    try {
      const implementation = this.getImplementationForMedium(medium);
      if (!implementation) {
        console.error(`No implementation found for storage medium: ${medium}`);
        return false;
      }
      await implementation.activate();
      this.currentMedium = medium;
      console.log(`Switched to storage medium: ${medium}`);
      return true;
    } catch (error) {
      console.error('Failed to switch storage medium:', error);
      return false;
    }
  }
  
  private getImplementationForMedium(medium: StorageMedium) {
    return Object.values(this.implementations)
      .find(impl => impl.id.startsWith(medium));
  }
  
  getAvailableStorageMedia(): StorageMedium[] {
    return Object.values(this.implementations)
      .map(impl => impl.id.split('-')[0] as StorageMedium)
      .filter((value, index, self) => self.indexOf(value) === index); // Unique values
  }
}

// Create a singleton instance
export const storageFailsafe = new StorageFailsafeCoordinator();
