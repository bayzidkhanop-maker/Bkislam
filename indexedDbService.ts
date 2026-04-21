import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AppDB extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      data: Blob | ArrayBuffer;
      metadata: any;
      createdAt: number;
    };
    indexes: { 'by-date': number };
  };
  cache: {
    key: string;
    value: {
      id: string;
      data: any;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'ProfessionalLocalDB';
const DB_VERSION = 1;

class IndexedDbService {
  private dbPromise: Promise<IDBPDatabase<AppDB>>;

  constructor() {
    this.dbPromise = this.initDB();
    this.requestPersistentStorage();
  }

  /**
   * Initializes the IndexedDB database.
   */
  private async initDB() {
    return openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('by-date', 'createdAt');
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'id' });
        }
      },
    });
  }

  /**
   * Requests persistent storage (up to max browser quota, usually highly scalable up to 60-80% of disk space).
   * This is how we aim for "100GB" capability.
   */
  private async requestPersistentStorage() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          const granted = await navigator.storage.persist();
          console.log(`Persistent storage granted: ${granted}`);
        }
        
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          const usageGB = (estimate.usage || 0) / (1024 * 1024 * 1024);
          const quotaGB = (estimate.quota || 0) / (1024 * 1024 * 1024);
          console.log(`Storage estimate: ${usageGB.toFixed(2)}GB used of ${quotaGB.toFixed(2)}GB quota`);
        }
      } catch (err) {
        console.warn('Persistent storage not supported or failed', err);
      }
    }
  }

  /**
   * Store a large file/blob (up to quota limits).
   */
  async saveFile(id: string, data: Blob | ArrayBuffer, metadata: any = {}) {
    const db = await this.dbPromise;
    await db.put('files', {
      id,
      data,
      metadata,
      createdAt: Date.now(),
    });
  }

  /**
   * Retrieve a file/blob.
   */
  async getFile(id: string) {
    const db = await this.dbPromise;
    return db.get('files', id);
  }

  /**
   * Delete a file/blob.
   */
  async deleteFile(id: string) {
    const db = await this.dbPromise;
    await db.delete('files', id);
  }

  /**
   * Get all stored files (metadata and optionally data).
   */
  async getAllFiles() {
    const db = await this.dbPromise;
    return db.getAll('files');
  }

  /**
   * Storage cache for generic JSON payload caching
   */
  async saveCache(id: string, data: any) {
    const db = await this.dbPromise;
    await db.put('cache', {
      id,
      data,
      updatedAt: Date.now(),
    });
  }

  /**
   * Read cache
   */
  async getCache(id: string) {
    const db = await this.dbPromise;
    return db.get('cache', id);
  }

  /**
   * Clear all DB stores. Use with caution.
   */
  async clearAll() {
    const db = await this.dbPromise;
    await db.clear('files');
    await db.clear('cache');
  }

  /**
   * Helper to fetch a URL and store it directly into IndexedDB as a Blob.
   */
  async downloadAndStoreFile(id: string, url: string, metadata: any = {}, onProgress?: (progress: number) => void) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      // Handle streaming progress if supported
      if (response.body && total > 0 && onProgress) {
        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          if (value) {
            chunks.push(value);
            loaded += value.length;
            onProgress(Math.round((loaded / total) * 100));
          }
        }

        const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
        await this.saveFile(id, blob, metadata);
        return blob;
      } else {
        const blob = await response.blob();
        if (onProgress) onProgress(100);
        await this.saveFile(id, blob, metadata);
        return blob;
      }
    } catch (e) {
      console.error('Failed to download and store file', e);
      throw e;
    }
  }
}

export const localDb = new IndexedDbService();
