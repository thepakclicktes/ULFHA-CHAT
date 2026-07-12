import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, MapPin, Bell, Info, ShieldCheck, X } from 'lucide-react';

interface PermissionRequest {
  id: string;
  type: 'camera' | 'microphone' | 'camera_microphone' | 'geolocation' | 'notifications';
  title: string;
  description: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  executeNative: () => Promise<any> | void;
}

const PermissionInterceptorContext = createContext<{
  requestPermission: (
    type: 'camera' | 'microphone' | 'camera_microphone' | 'geolocation' | 'notifications',
    title: string,
    description: string,
    executeNative: () => Promise<any> | void
  ) => Promise<any>;
} | null>(null);

export function usePermissionInterceptor() {
  const context = useContext(PermissionInterceptorContext);
  if (!context) {
    throw new Error('usePermissionInterceptor must be used within a PermissionInterceptorProvider');
  }
  return context;
}

export function PermissionInterceptorProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<PermissionRequest[]>([]);
  const queueRef = useRef<PermissionRequest[]>([]);
  queueRef.current = queue;

  // Intercept native browser permissions on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Intercept Notifications
    if (window.Notification && 'requestPermission' in window.Notification) {
      const originalRequestPermission = window.Notification.requestPermission.bind(window.Notification);
      
      // Override
      window.Notification.requestPermission = async function(): Promise<NotificationPermission> {
        // If permission is already granted or denied, don't intercept
        if (window.Notification.permission !== 'default') {
          return originalRequestPermission();
        }

        try {
          const result = await requestPermissionInternal(
            'notifications',
            'Enable Real-time Alerts',
            'Stay updated instantly when you receive direct messages, group announcements, and voice calls, even when the application is closed.',
            async () => {
              return await originalRequestPermission();
            }
          );
          return result as NotificationPermission;
        } catch (error) {
          return 'denied';
        }
      };
    }

    // 2. Intercept Geolocation
    if (window.navigator && window.navigator.geolocation) {
      const geo = window.navigator.geolocation;
      const originalGetCurrentPosition = geo.getCurrentPosition.bind(geo);
      const originalWatchPosition = geo.watchPosition.bind(geo);

      // Override getCurrentPosition
      geo.getCurrentPosition = function(
        successCallback: PositionCallback,
        errorCallback?: PositionErrorCallback | null,
        options?: PositionOptions
      ): void {
        requestPermissionInternal(
          'geolocation',
          'Access Precise Location',
          'Ulfah Chat uses your device location to provide highly accurate prayer times, detect the Qibla direction, and help you locate nearby mosques and madrasas.',
          () => {
            originalGetCurrentPosition(successCallback, errorCallback, options);
          }
        ).catch((err) => {
          if (errorCallback) {
            errorCallback({
              code: 1, // PERMISSION_DENIED
              message: 'User denied Geolocation prompt',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          }
        });
      };

      // Override watchPosition
      geo.watchPosition = function(
        successCallback: PositionCallback,
        errorCallback?: PositionErrorCallback | null,
        options?: PositionOptions
      ): number {
        let watchId = -1;
        requestPermissionInternal(
          'geolocation',
          'Access Precise Location',
          'Ulfah Chat uses your device location to provide highly accurate prayer times, detect the Qibla direction, and help you locate nearby mosques and madrasas.',
          () => {
            watchId = originalWatchPosition(successCallback, errorCallback, options);
          }
        ).catch((err) => {
          if (errorCallback) {
            errorCallback({
              code: 1, // PERMISSION_DENIED
              message: 'User denied Geolocation prompt',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          }
        });
        return watchId;
      };
    }

    // 3. Intercept mediaDevices getUserMedia (Camera / Mic)
    if (window.navigator && window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia) {
      const originalGetUserMedia = window.navigator.mediaDevices.getUserMedia.bind(window.navigator.mediaDevices);

      // Override getUserMedia
      window.navigator.mediaDevices.getUserMedia = async function(
        constraints?: MediaStreamConstraints
      ): Promise<MediaStream> {
        const needsAudio = !!constraints?.audio;
        const needsVideo = !!constraints?.video;

        if (!needsAudio && !needsVideo) {
          return originalGetUserMedia(constraints);
        }

        let type: 'camera' | 'microphone' | 'camera_microphone' = 'camera_microphone';
        let title = 'Access Camera & Microphone';
        let description = 'Ulfah Chat requires camera and microphone permissions to capture custom profile pictures, send high-quality voice notes, and host active audio/video calls.';

        if (needsAudio && !needsVideo) {
          type = 'microphone';
          title = 'Enable Microphone Access';
          description = 'Ulfah Chat uses your microphone to let you record instant voice notes and communicate seamlessly on voice and video calls.';
        } else if (!needsAudio && needsVideo) {
          type = 'camera';
          title = 'Enable Camera Access';
          description = 'Ulfah Chat uses your camera to let you take direct profile photos, share visual media in messages, and start video calls.';
        }

        return requestPermissionInternal(
          type,
          title,
          description,
          async () => {
            return await originalGetUserMedia(constraints);
          }
        );
      };
    }
  }, []);

  // Internal helper to create a deferred promise and push to the queue
  const requestPermissionInternal = (
    type: 'camera' | 'microphone' | 'camera_microphone' | 'geolocation' | 'notifications',
    title: string,
    description: string,
    executeNative: () => Promise<any> | void
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const newRequest: PermissionRequest = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        title,
        description,
        resolve,
        reject,
        executeNative,
      };

      setQueue((prev) => [...prev, newRequest]);
    });
  };

  const handleAction = async (action: 'allow' | 'deny') => {
    const active = queue[0];
    if (!active) return;

    if (action === 'allow') {
      try {
        // Trigger the original browser native prompt
        const result = await active.executeNative();
        active.resolve(result);
      } catch (error) {
        active.reject(error);
      }
    } else {
      active.reject(new DOMException('Permission denied by user request interceptor', 'NotAllowedError'));
    }

    // Shift queue
    setQueue((prev) => prev.slice(1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'camera':
        return <Camera className="w-10 h-10 text-emerald-600" />;
      case 'microphone':
        return <Mic className="w-10 h-10 text-blue-600" />;
      case 'camera_microphone':
        return (
          <div className="flex gap-1.5 items-center justify-center">
            <Camera className="w-8 h-8 text-emerald-600" />
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
        );
      case 'geolocation':
        return <MapPin className="w-10 h-10 text-rose-500" />;
      case 'notifications':
        return <Bell className="w-10 h-10 text-amber-500" />;
      default:
        return <Info className="w-10 h-10 text-gray-500" />;
    }
  };

  const getAccentBg = (type: string) => {
    switch (type) {
      case 'camera':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'microphone':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'camera_microphone':
        return 'bg-teal-50 text-teal-600 border-teal-100';
      case 'geolocation':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'notifications':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const activeRequest = queue[0];

  return (
    <PermissionInterceptorContext.Provider value={{ requestPermission: requestPermissionInternal }}>
      {children}

      {/* Permission Explanation Modal */}
      <AnimatePresence>
        {activeRequest && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleAction('deny')}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100"
            >
              {/* Header Accent Bar */}
              <div className={`h-1.5 w-full ${
                activeRequest.type === 'camera' ? 'bg-emerald-500' :
                activeRequest.type === 'microphone' ? 'bg-blue-500' :
                activeRequest.type === 'camera_microphone' ? 'bg-teal-500' :
                activeRequest.type === 'geolocation' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />

              <div className="p-6">
                {/* Close Button */}
                <button
                  onClick={() => handleAction('deny')}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Circular Icon Accent */}
                <div className="flex justify-center mb-5">
                  <div className={`p-4 rounded-2xl border-2 shadow-sm ${getAccentBg(activeRequest.type)}`}>
                    {getIcon(activeRequest.type)}
                  </div>
                </div>

                {/* Titles */}
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {activeRequest.title}
                  </h3>
                  <p className="mt-2.5 text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    {activeRequest.description}
                  </p>
                </div>

                {/* Guarantee Banner */}
                <div className="mt-5 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-[10px] font-bold text-slate-900">Privacy Guarantee</h4>
                    <p className="text-[9px] text-slate-500 leading-normal mt-0.5">
                      Permissions are only used directly for requested features. We never sell, track, or share your data.
                    </p>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={() => handleAction('allow')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                      activeRequest.type === 'camera' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                      activeRequest.type === 'microphone' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' :
                      activeRequest.type === 'camera_microphone' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-200' :
                      activeRequest.type === 'geolocation' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' :
                      'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                    }`}
                  >
                    Allow & Continue
                  </button>
                  <button
                    onClick={() => handleAction('deny')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PermissionInterceptorContext.Provider>
  );
}
