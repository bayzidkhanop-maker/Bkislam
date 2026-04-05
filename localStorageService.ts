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

export const initDB = () => {
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

export const cacheMediaBlob = async (url: string, blob: Blob) => {
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
