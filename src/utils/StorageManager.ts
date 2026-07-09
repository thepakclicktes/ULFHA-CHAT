
export const requestPersistentStoragePermission = async (): Promise<boolean> => {
  if (!('storage' in navigator && 'persist' in navigator.storage)) {
    console.warn("Persistent storage API not supported.");
    return false;
  }

  try {
    const isPersistent = await navigator.storage.persist();
    return isPersistent;
  } catch (error) {
    console.error("Failed to request persistent storage permission:", error);
    return false;
  }
};

export const verifyPersistentStoragePermission = async (): Promise<boolean> => {
  if (!('storage' in navigator && 'persisted' in navigator.storage)) {
    return false;
  }
  return await navigator.storage.persisted();
};

export const estimateStorageUsage = async (): Promise<{ usage: number; quota: number } | null> => {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
  } catch (error) {
    console.error("Failed to estimate storage usage:", error);
    return null;
  }
};

export const downloadBlobWithFileSystemAccess = async (
  blob: Blob,
  suggestedName: string
): Promise<void> => {
  if (!('showSaveFilePicker' in window)) {
    // Fallback for browsers that don't support FileSystem Access API
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'PDF File',
          accept: {
            'application/pdf': ['.pdf'],
          },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error("Failed to save file:", error);
      throw error;
    }
  }
};
