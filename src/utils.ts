import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(date: any) {
  try {
    const d = toSafeDate(date);
    if (isNaN(d.getTime()) || d.getTime() === 0) return '--:--';
    return format(d, 'HH:mm');
  } catch (error) {
    return '--:--';
  }
}

export function formatChatDate(date: any) {
  try {
    const d = toSafeDate(date);
    if (isNaN(d.getTime()) || d.getTime() === 0) return '...';
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd/MM/yyyy');
  } catch (error) {
    return '...';
  }
}

export function getTime(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function toSafeDate(val: any): Date {
  return new Date(getTime(val));
}

export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Focus the document if needed
    if (!document.hasFocus()) {
      window.focus();
    }
    
    // Try modern API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers or restricted environments
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return false;
  }
}

export function resolveApiUrl(apiPath: string): string {
  const hostname = window.location.hostname;
  
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isRunApp = hostname.endsWith('.run.app');
  
  // If we are NOT on localhost and NOT directly on the AI Studio .run.app container domain,
  // we must route requests to the absolute backend URL.
  // This covers Vercel, Firebase Hosting, custom domains, and sandboxed iframes.
  if (!isLocal && !isRunApp) {
    const baseUrl = 'https://ais-pre-ubxjjscbfuclhzfbawd7nd-85039836823.asia-east1.run.app';
    const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
    return `${baseUrl}${cleanPath}`;
  }
  
  // For localhost and direct .run.app urls, use relative paths
  return apiPath;
}
