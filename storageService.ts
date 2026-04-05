import { cacheMediaBlob } from './localStorageService';

export const uploadMedia = async (file: File, path: string, onProgress?: (progress: number) => void): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    if (onProgress) onProgress(10);

    // For videos or large files, store in local IndexedDB to bypass Firestore 1MB limit
    // and simulate "1TB Local Storage"
    if (file.type.startsWith('video/') || file.size > 800 * 1024) {
      try {
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

    // If it's a small image, compress it to avoid Firestore 1MB limit
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          if (onProgress) onProgress(100);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      // Small non-image files
      const reader = new FileReader();
      reader.onload = () => {
        if (onProgress) onProgress(100);
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
};

export const deleteMedia = async (url: string): Promise<void> => {
  // No-op for local base64 storage
  return Promise.resolve();
};
