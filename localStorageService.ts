import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Post, User } from './models';

interface DeenstreamDB extends DBSchema {
  posts: {
    key: string;
    value: Post;
    indexes: { 'by-date': number };
  };
  users: {
    key: string;
    value: User;
  };
  mediaBlobs: {
    key: string;
    value: Blob;
  };
}

let dbPromise: Promise<IDBPDatabase<DeenstreamDB>>;

export const initDB = async () => {
  // Request persistent storage to ensure the 1TB local storage isn't cleared by the browser
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage granted: ${isPersisted}`);
    } catch (e) {
      console.error("Failed to request persistent storage", e);
    }
  }

  dbPromise = openDB<DeenstreamDB>('deenstream-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('posts')) {
        const postStore = db.createObjectStore('posts', { keyPath: 'id' });
        postStore.createIndex('by-date', 'createdAt');
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'uid' });
      }
      if (!db.objectStoreNames.contains('mediaBlobs')) {
        db.createObjectStore('mediaBlobs');
      }
    },
  });
};

export const cachePost = async (post: Post) => {
  const db = await dbPromise;
  await db.put('posts', post);
};

export const getCachedFeed = async (): Promise<Post[]> => {
  const db = await dbPromise;
  const posts = await db.getAllFromIndex('posts', 'by-date');
  return posts.reverse(); // Newest first
};

export const cacheUser = async (user: User) => {
  const db = await dbPromise;
  await db.put('users', user);
};

export const getCachedUser = async (uid: string): Promise<User | undefined> => {
  const db = await dbPromise;
  return db.get('users', uid);
};

export const MAX_LOCAL_STORAGE_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB

export const getLocalMediaStorageUsage = async (): Promise<{ usedBytes: number, totalBytes: number, percentage: number, fileCount: number }> => {
  const db = await dbPromise;
  let usedBytes = 0;
  let fileCount = 0;
  
  const tx = db.transaction('mediaBlobs', 'readonly');
  let cursor = await tx.store.openCursor();
  
  while (cursor) {
    usedBytes += cursor.value.size;
    fileCount++;
    cursor = await cursor.continue();
  }
  
  return {
    usedBytes,
    totalBytes: MAX_LOCAL_STORAGE_BYTES,
    percentage: (usedBytes / MAX_LOCAL_STORAGE_BYTES) * 100,
    fileCount
  };
};

export const getAllLocalMedia = async (): Promise<{ url: string, size: number, type: string }[]> => {
  const db = await dbPromise;
  const media = [];
  const tx = db.transaction('mediaBlobs', 'readonly');
  let cursor = await tx.store.openCursor();
  
  while (cursor) {
    media.push({
      url: cursor.key,
      size: cursor.value.size,
      type: cursor.value.type
    });
    cursor = await cursor.continue();
  }
  
  return media;
};

export const deleteLocalMedia = async (url: string) => {
  const db = await dbPromise;
  await db.delete('mediaBlobs', url);
};

export const cacheMediaBlob = async (url: string, blob: Blob) => {
  const usage = await getLocalMediaStorageUsage();
  if (usage.usedBytes + blob.size > MAX_LOCAL_STORAGE_BYTES) {
    throw new Error("Local storage quota exceeded. Please free up some space.");
  }
  
  const db = await dbPromise;
  await db.put('mediaBlobs', blob, url);
};

export const getCachedMediaBlob = async (url: string): Promise<Blob | undefined> => {
  const db = await dbPromise;
  return db.get('mediaBlobs', url);
};

export const clearCache = async (olderThan?: number) => {
  const db = await dbPromise;
  if (olderThan) {
    const tx = db.transaction('posts', 'readwrite');
    const index = tx.store.index('by-date');
    let cursor = await index.openCursor(IDBKeyRange.upperBound(olderThan));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  } else {
    await db.clear('posts');
    await db.clear('users');
    await db.clear('mediaBlobs');
  }
};
