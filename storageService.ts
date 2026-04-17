import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';
import { cacheMediaBlob, deleteLocalMedia } from './localStorageService';

export const uploadMedia = async (file: File, path: string, onProgress?: (progress: number) => void, storageType: 'cloud' | 'local' = 'cloud'): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    if (storageType === 'local') {
      try {
        if (onProgress) onProgress(10);
        const localUrl = `local://${path}-${file.name}`;
        if (onProgress) onProgress(50);
        await cacheMediaBlob(localUrl, file);
        if (onProgress) onProgress(100);
        resolve(localUrl);
      } catch (err) {
        reject(err);
      }
      return;
    }

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

export const deleteMedia = async (url: string): Promise<void> => {
  if (!url) return Promise.resolve();
  
  if (url.startsWith('local://')) {
    return deleteLocalMedia(url);
  }
  
  if (url.startsWith('data:')) {
    return Promise.resolve();
  }
  
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting media:", error);
  }
};
