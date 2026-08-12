import React from 'react';
import { cn } from '../utils';

// Base Primitive Skeleton Component with Shimmer Effect
export const Skeleton: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md bg-gray-200/80 dark:bg-[#202c33]",
        className
      )}
    />
  );
};

// 1. Chat List Skeleton (Sidebar / Chats list)
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="w-full divide-y divide-gray-100 dark:divide-[#222d34] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center p-3 gap-3">
          {/* Avatar Skeleton */}
          <div className="relative shrink-0">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111b21]" />
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32 rounded-sm" />
              <Skeleton className="h-3 w-10 rounded-sm shrink-0" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-48 rounded-sm" />
              <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 2. Chat Message Bubbles Skeleton
export const ChatMessageSkeleton: React.FC = () => {
  return (
    <div className="flex-1 p-4 space-y-4 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Date Pill Skeleton */}
      <div className="flex justify-center my-2">
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Incoming Message Skeleton */}
      <div className="flex items-start gap-2 max-w-[75%] sm:max-w-[60%]">
        <Skeleton className="w-8 h-8 rounded-full shrink-0 mt-1" />
        <div className="p-3 rounded-2xl rounded-tl-none bg-white dark:bg-[#202c33] shadow-xs space-y-2 w-full">
          <Skeleton className="h-3.5 w-24 rounded-sm" />
          <Skeleton className="h-3 w-[90%] rounded-sm" />
          <Skeleton className="h-3 w-[65%] rounded-sm" />
          <div className="flex justify-end pt-1">
            <Skeleton className="h-2.5 w-10 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Outgoing Message Skeleton */}
      <div className="flex items-end justify-end gap-2 ml-auto max-w-[75%] sm:max-w-[60%]">
        <div className="p-3 rounded-2xl rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b] shadow-xs space-y-2 w-full">
          <Skeleton className="h-3 w-[95%] rounded-sm" />
          <Skeleton className="h-3 w-[80%] rounded-sm" />
          <div className="flex justify-end pt-1">
            <Skeleton className="h-2.5 w-12 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Incoming Media/Voice Message Skeleton */}
      <div className="flex items-start gap-2 max-w-[75%] sm:max-w-[60%]">
        <Skeleton className="w-8 h-8 rounded-full shrink-0 mt-1" />
        <div className="p-2.5 rounded-2xl rounded-tl-none bg-white dark:bg-[#202c33] shadow-xs space-y-2.5 w-full">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-3 w-40 rounded-sm" />
          <div className="flex justify-end">
            <Skeleton className="h-2.5 w-10 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Outgoing Quick Bubble Skeleton */}
      <div className="flex items-end justify-end gap-2 ml-auto max-w-[65%] sm:max-w-[45%]">
        <div className="p-3 rounded-2xl rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b] shadow-xs space-y-2 w-full">
          <Skeleton className="h-3 w-[70%] rounded-sm" />
          <div className="flex justify-end pt-1">
            <Skeleton className="h-2.5 w-12 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Status / Stories Tray Skeleton
export const StatusTraySkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-[#222d34]">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
        {/* My Status Item */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative">
            <Skeleton className="w-14 h-14 rounded-full ring-2 ring-emerald-500/30" />
            <Skeleton className="absolute bottom-0 right-0 w-4 h-4 rounded-full" />
          </div>
          <Skeleton className="h-3 w-12 rounded-sm" />
        </div>

        {/* Other Users Statuses */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <Skeleton className="w-14 h-14 rounded-full ring-2 ring-emerald-500" />
            <Skeleton className="h-3 w-14 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Explore / Channels Grid Skeleton
export const ExploreGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-gray-100 dark:border-[#222d34] shadow-xs space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-sm" />
              <Skeleton className="h-3 w-20 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-full rounded-sm" />
          <Skeleton className="h-3.5 w-4/5 rounded-sm" />
          <div className="pt-2 flex items-center justify-between">
            <Skeleton className="h-3 w-16 rounded-sm" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

// 5. Noor AI Chat Response Skeleton
export const NoorAISkeleton: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-[#111b21] dark:to-[#182229] border border-emerald-100 dark:border-emerald-900/30 shadow-xs space-y-3 my-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-7 h-7 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-sm" />
        <Skeleton className="h-3 w-12 rounded-full ml-auto" />
      </div>
      <div className="space-y-2 pl-9">
        <Skeleton className="h-3.5 w-[95%] rounded-sm" />
        <Skeleton className="h-3.5 w-[85%] rounded-sm" />
        <Skeleton className="h-3.5 w-[60%] rounded-sm" />
      </div>
      <div className="flex gap-2 pl-9 pt-1">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
};

// 6. Islamic Library Reader Skeleton
export const LibraryItemSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3.5 rounded-xl bg-white dark:bg-[#111b21] border border-gray-100 dark:border-[#222d34] shadow-xs flex items-center gap-3"
        >
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-3 w-16 rounded-sm" />
          </div>
          <Skeleton className="w-6 h-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
};

// 7. Admin Panel Dashboard Skeleton
export const AdminPanelSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#111b21] border border-gray-200 dark:border-[#222d34] space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 rounded-sm" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-[#111b21] border border-gray-200 dark:border-[#222d34] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#222d34]">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-3 w-48 rounded-sm" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
            <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

// 8. Full Application Layout Skeleton (For App Booting / Switching)
export const FullAppSkeleton: React.FC = () => {
  return (
    <div className="w-full h-screen max-h-screen flex flex-col bg-[#F0F2F5] dark:bg-[#111b21] overflow-hidden">
      {/* Top Header Skeleton */}
      <div className="h-14 bg-[#008069] dark:bg-[#202c33] px-4 flex items-center justify-between text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full bg-white/20" />
          <Skeleton className="h-5 w-28 rounded-md bg-white/20" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-6 h-6 rounded-full bg-white/20" />
          <Skeleton className="w-6 h-6 rounded-full bg-white/20" />
          <Skeleton className="w-6 h-6 rounded-full bg-white/20" />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Chats List) */}
        <div className="w-full sm:w-[380px] md:w-[420px] bg-white dark:bg-[#111b21] border-r border-gray-200 dark:border-[#222d34] flex flex-col shrink-0">
          {/* Search bar skeleton */}
          <div className="p-3 border-b border-gray-100 dark:border-[#222d34]">
            <Skeleton className="h-9 w-full rounded-full" />
          </div>
          {/* Chat rows */}
          <div className="flex-1 overflow-y-auto">
            <ChatListSkeleton count={8} />
          </div>
        </div>

        {/* Right Active Chat Pane (Hidden on mobile if not active) */}
        <div className="hidden sm:flex flex-1 flex-col bg-[#efeae2] dark:bg-[#0b141a]">
          {/* Chat Header */}
          <div className="h-14 bg-[#F0F2F5] dark:bg-[#202c33] px-4 flex items-center justify-between border-b border-gray-200 dark:border-[#222d34]">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-2.5 w-20 rounded-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
          </div>

          {/* Messages Skeleton */}
          <ChatMessageSkeleton />

          {/* Input Bar */}
          <div className="p-3 bg-[#F0F2F5] dark:bg-[#202c33] flex items-center gap-3 border-t border-gray-200 dark:border-[#222d34]">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};
