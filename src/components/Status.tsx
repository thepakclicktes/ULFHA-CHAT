import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, limit,
  where, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { UserProfile, Status as StatusType } from '../types';
import { 
  Plus, Camera, Eye, Clock, X, ThumbsUp, MessageSquare, Share2, 
  Trash2, Sparkles, Heart, Send, Globe, Image, Smile, MoreHorizontal,
  Bookmark, CheckCheck, BookOpen, MessageCircle, ShieldCheck,
  UserPlus, UserMinus, Users
} from 'lucide-react';
import { formatChatDate, cn, getTime, toSafeDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface StatusProps {
  profile: UserProfile;
}

// Quietly record views when a post enters the user's view / mounts on screen
function PostViewRecorder({ postId, userId, views = [] }: { postId: string; userId: string; views: string[] }) {
  useEffect(() => {
    if (!postId || !userId) return;
    if (!views.includes(userId)) {
      const postRef = doc(db, 'statuses', postId);
      updateDoc(postRef, {
        views: arrayUnion(userId)
      }).catch(err => console.error("Error recording view:", err));
    }
  }, [postId, userId, views]);

  return null;
}

export default function Status({ profile }: StatusProps) {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [postToShare, setPostToShare] = useState<any | null>(null);
  const [shareCaption, setShareCaption] = useState('');
  const [caption, setCaption] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Track open comment sections by status ID
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Lightbox for full image viewing
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Follow/unfollow and detailed profile state variables
  const [myFollowers, setMyFollowers] = useState<any[]>([]);
  const [myFollowing, setMyFollowing] = useState<any[]>([]);
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDoc, setSelectedUserDoc] = useState<any | null>(null);
  const [selectedUserPosts, setSelectedUserPosts] = useState<any[]>([]);
  const [selectedUserFollowers, setSelectedUserFollowers] = useState<any[]>([]);
  const [selectedUserFollowing, setSelectedUserFollowing] = useState<any[]>([]);
  const [isProfileDetailOpen, setIsProfileDetailOpen] = useState(false);
  
  // Likes detail modal
  const [likesModalPost, setLikesModalPost] = useState<any | null>(null);
  const [likedUsersDetails, setLikedUsersDetails] = useState<any[]>([]);
  const [loadingLikesDetails, setLoadingLikesDetails] = useState(false);

  // Listen to my own followers and following
  useEffect(() => {
    if (!profile.uid) return;
    const qFollowers = query(collection(db, 'follows'), where('followingId', '==', profile.uid));
    const unsubFollowers = onSnapshot(qFollowers, (snapshot) => {
      setMyFollowers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching followers:", error);
    });

    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', profile.uid));
    const unsubFollowing = onSnapshot(qFollowing, (snapshot) => {
      setMyFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching following:", error);
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [profile.uid]);

  // Listen to selected user doc, posts, and follows
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserDoc(null);
      setSelectedUserPosts([]);
      setSelectedUserFollowers([]);
      setSelectedUserFollowing([]);
      return;
    }

    // 1. Listen to selected user profile doc
    const unsubDoc = onSnapshot(doc(db, 'users', selectedUserId), (snapshot) => {
      if (snapshot.exists()) {
        setSelectedUserDoc({ uid: snapshot.id, ...snapshot.data() });
      } else {
        setSelectedUserDoc(null);
      }
    });

    // 2. Listen to selected user posts
    const qPosts = query(collection(db, 'statuses'), where('userId', '==', selectedUserId));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setSelectedUserPosts(list);
    });

    // 3. Listen to selected user followers
    const qFollowers = query(collection(db, 'follows'), where('followingId', '==', selectedUserId));
    const unsubFollowers = onSnapshot(qFollowers, (snapshot) => {
      setSelectedUserFollowers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Listen to selected user following
    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', selectedUserId));
    const unsubFollowing = onSnapshot(qFollowing, (snapshot) => {
      setSelectedUserFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubDoc();
      unsubPosts();
      unsubFollowers();
      unsubFollowing();
    };
  }, [selectedUserId]);

  // Listen to liked users details
  useEffect(() => {
    if (!likesModalPost || !likesModalPost.likes || likesModalPost.likes.length === 0) {
      setLikedUsersDetails([]);
      return;
    }
    
    let active = true;
    const fetchLikedUsers = async () => {
      setLoadingLikesDetails(true);
      try {
        const details = await Promise.all(
          likesModalPost.likes.map(async (uid: string) => {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              return { uid, ...userSnap.data() };
            }
            return { 
              uid, 
              displayName: 'Ulfah Member', 
              photoURL: `https://ui-avatars.com/api/?name=U` 
            };
          })
        );
        if (active) {
          setLikedUsersDetails(details);
        }
      } catch (err) {
        console.error("Error fetching liked users details:", err);
      } finally {
        if (active) {
          setLoadingLikesDetails(false);
        }
      }
    };

    fetchLikedUsers();
    return () => {
      active = false;
    };
  }, [likesModalPost]);

  const handleFollowUser = async (targetUser: any) => {
    if (!profile.uid || !targetUser.uid) return;
    const followId = `${profile.uid}_${targetUser.uid}`;
    try {
      await setDoc(doc(db, 'follows', followId), {
        followerId: profile.uid,
        followerName: profile.displayName || 'Anonymous',
        followerPhoto: profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`,
        followingId: targetUser.uid,
        followingName: targetUser.displayName || 'Anonymous',
        followingPhoto: targetUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.displayName || 'U')}`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const handleUnfollowUser = async (targetUserId: string) => {
    if (!profile.uid || !targetUserId) return;
    const followId = `${profile.uid}_${targetUserId}`;
    try {
      await deleteDoc(doc(db, 'follows', followId));
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };

  const openUserProfile = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileDetailOpen(true);
  };

  // Real-time listener for timeline posts
  useEffect(() => {
    const q = query(collection(db, 'statuses'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStatuses(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'statuses');
    });
    return unsubscribe;
  }, []);

  // Handle local image file loading as base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 800 * 1024) {
      alert("Image size must be under 800 KB for fast database performance!");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit a new post
  const handlePostStatus = async () => {
    if (!caption.trim() && !imageDataUrl) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'statuses'), {
        userId: profile.uid,
        displayName: profile.displayName || 'Anonymous',
        photoURL: profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`,
        imageUrl: imageDataUrl || '',
        caption: caption.trim(),
        timestamp: serverTimestamp(),
        views: [],
        likes: [],
        comments: [],
        shareCount: 0,
        sharedFrom: null
      });
      setIsPostModalOpen(false);
      setCaption('');
      setImageDataUrl('');
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Like Status
  const handleToggleLike = async (post: any) => {
    const postRef = doc(db, 'statuses', post.id);
    const likes = post.likes || [];
    const isLiked = likes.includes(profile.uid);
    
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(profile.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(profile.uid)
        });
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;
    
    try {
      const commentObj = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: profile.uid,
        displayName: profile.displayName || 'Anonymous',
        photoURL: profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`,
        text: text.trim(),
        timestamp: new Date().toISOString()
      };
      
      const postRef = doc(db, 'statuses', postId);
      await updateDoc(postRef, {
        comments: arrayUnion(commentObj)
      });
      
      // Reset input
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Share Post Modal Trigger
  const triggerShare = (post: any) => {
    setPostToShare(post);
    setShareCaption('');
    setIsShareModalOpen(true);
  };

  // Share Post Action (Creates a new post document representing shared post)
  const handleSharePost = async () => {
    if (!postToShare) return;
    setLoading(true);
    try {
      // Create nested post content
      const sharedFromObj = {
        postId: postToShare.id,
        userId: postToShare.userId,
        displayName: postToShare.displayName,
        caption: postToShare.caption,
        imageUrl: postToShare.imageUrl || '',
        photoURL: postToShare.photoURL || ''
      };
      
      await addDoc(collection(db, 'statuses'), {
        userId: profile.uid,
        displayName: profile.displayName || 'Anonymous',
        photoURL: profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`,
        caption: shareCaption.trim() || 'Shared a post',
        imageUrl: '', // Nest content rather than duplicate
        timestamp: serverTimestamp(),
        views: [],
        likes: [],
        comments: [],
        shareCount: 0,
        sharedFrom: sharedFromObj
      });
      
      // Increment original shareCount
      const originalPostRef = doc(db, 'statuses', postToShare.id);
      await updateDoc(originalPostRef, {
        shareCount: (postToShare.shareCount || 0) + 1
      });
      
      setIsShareModalOpen(false);
      setPostToShare(null);
      setShareCaption('');
    } catch (error) {
      console.error("Error sharing post:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, 'statuses', postId));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  return (
    <div className="flex-1 bg-[#F0F2F5] flex flex-col lg:flex-row overflow-hidden min-h-0">
      
      {/* LEFT SIDEBAR - My Profile Stats & App Info */}
      <div className="hidden lg:flex w-[340px] bg-white border-r border-[#D1D7DB] flex-col overflow-hidden shrink-0">
        <div className="p-4 bg-[#F0F2F5] border-b border-[#D1D7DB] flex items-center justify-between safe-area-top">
          <h2 className="text-xl font-bold text-[#111B21]">Updates Hub</h2>
          <div className="text-xs bg-[#00a884] text-white px-2 py-1 rounded font-semibold flex items-center gap-1">
            <Sparkles size={12} /> Social Feed
          </div>
        </div>

        <div className="p-4 scrollable-content custom-scrollbar flex-1 space-y-4">
          
          {/* User Profile Summary Card */}
          <div className="bg-gradient-to-br from-[#075E54] to-[#128C7E] text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
                className="w-20 h-20 rounded-full border-4 border-white/20 p-0.5 object-cover mb-3 cursor-pointer hover:scale-105 transition-transform" 
                referrerPolicy="no-referrer"
                onClick={() => openUserProfile(profile.uid)}
                alt=""
              />
              <h3 className="font-bold text-lg leading-tight flex items-center gap-1 justify-center cursor-pointer hover:underline" onClick={() => openUserProfile(profile.uid)}>
                {profile.displayName}
                {profile.isVerified && <ShieldCheck size={16} className="text-emerald-400 fill-white" />}
              </h3>
              <p className="text-xs text-white/85 mb-3 font-mono">Level: {profile.level || 'Bronze'}</p>
              
              <div className="bg-white/15 px-3 py-1.5 rounded-full text-[11px] font-medium max-w-full truncate mb-3">
                {profile.bio || 'No status yet...'}
              </div>

              <button 
                onClick={() => openUserProfile(profile.uid)}
                className="w-full py-2 bg-white text-[#075E54] hover:bg-white/95 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Users size={14} />
                <span>View My Social Profile</span>
              </button>
            </div>
          </div>

          {/* App Knowledge & Developer Info Block */}
          <div className="bg-[#f8f9fa] border border-gray-100 p-4 rounded-2xl">
            <h4 className="font-bold text-[#111B21] text-sm mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 animate-pulse" /> Developer & App Info
            </h4>
            <div className="space-y-2 text-xs text-[#667781] leading-relaxed">
              <p>
                <strong className="text-gray-900">Developer:</strong> <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold text-[11px]">Abdulrahman Habib</span>
              </p>
              <p>
                <strong className="text-gray-900">Quran Reader:</strong> Pakistani 16-Lines Taj Company PDF with translation, search and 100% offline access.
              </p>
              <p>
                <strong className="text-gray-900">Islamic Library:</strong> Fully offline support, dynamic searching, and curriculum-focused Madrasa Reader.
              </p>
              <p>
                <strong className="text-gray-900">Utility Kit:</strong> Interactive Prayer Times, tasbeeh counter, daily duas, voice calls, and Noor AI.
              </p>
            </div>
          </div>

          {/* Quick Stats Block */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <button 
              onClick={() => openUserProfile(profile.uid)}
              className="bg-purple-50 border border-purple-100 p-3 rounded-xl hover:bg-purple-100/50 transition-colors text-center flex flex-col items-center justify-center"
            >
              <p className="text-purple-600 font-bold text-lg">{myFollowers.length}</p>
              <p className="text-purple-700/80 font-semibold text-[10px] uppercase">Followers</p>
            </button>
            <button 
              onClick={() => openUserProfile(profile.uid)}
              className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl hover:bg-indigo-100/50 transition-colors text-center flex flex-col items-center justify-center"
            >
              <p className="text-indigo-600 font-bold text-lg">{myFollowing.length}</p>
              <p className="text-indigo-700/80 font-semibold text-[10px] uppercase">Following</p>
            </button>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex flex-col items-center justify-center">
              <p className="text-blue-500 font-bold text-lg">
                {statuses.filter(s => s.userId === profile.uid).length}
              </p>
              <p className="text-blue-700/80 font-semibold text-[10px] uppercase">My Posts</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col items-center justify-center">
              <p className="text-emerald-500 font-bold text-lg">
                {statuses.filter(s => s.userId === profile.uid).reduce((acc, s) => acc + (s.views || []).length, 0)}
              </p>
              <p className="text-emerald-700/80 font-semibold text-[10px] uppercase">Post Views</p>
            </div>
          </div>

          {/* Developer Contact Footer */}
          <div className="p-4 border-t border-gray-100 text-center text-[11px] text-[#8696A0]">
            Crafted for premium users by Abdulrahman Habib
          </div>
        </div>
      </div>

      {/* MIDDLE TIMELINE FEED - Scrolling list of Facebook Posts */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-4 px-3 sm:px-6 space-y-4">
        
        {/* Mobile Header (Collapse layout toggle or simpler top bar) */}
        <div className="w-full max-w-2xl bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between border border-gray-100 lg:hidden">
          <div className="flex items-center gap-3">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[#128C7E]" 
              alt="Profile"
              onClick={() => openUserProfile(profile.uid)}
            />
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{profile.displayName}</h3>
              <button 
                onClick={() => openUserProfile(profile.uid)}
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline text-left"
              >
                View Public Profile & Stats
              </button>
            </div>
          </div>
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className="bg-[#00a884] text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1"
          >
            <Plus size={14} /> New Post
          </button>
        </div>

        {/* Facebook-style "What's on your mind?" Input Box */}
        <div className="w-full max-w-2xl bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
              className="w-10 h-10 rounded-full object-cover" 
              alt="Profile"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setIsPostModalOpen(true)}
              className="flex-1 bg-[#F0F2F5] hover:bg-gray-200 text-left px-5 py-3 rounded-full text-sm text-gray-500 font-medium transition-colors"
            >
              What's on your mind, {profile.displayName?.split(' ')[0]}?
            </button>
          </div>
          
          <div className="border-t border-gray-100 pt-2 flex justify-around items-center text-xs font-semibold text-gray-500">
            <button 
              onClick={() => setIsPostModalOpen(true)} 
              className="flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors"
            >
              <Image size={18} className="text-emerald-500" />
              <span>Photo / Screenshot</span>
            </button>
            <button 
              onClick={() => {
                setCaption("✨ Reading Islamic Library...");
                setIsPostModalOpen(true);
              }} 
              className="flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors"
            >
              <BookOpen size={18} className="text-blue-500" />
              <span>Recommend Book</span>
            </button>
          </div>
        </div>

        {/* POSTS LIST (Facebook style) */}
        <div className="w-full max-w-2xl space-y-4">
          <AnimatePresence>
            {statuses.map((post) => {
              const likes = post.likes || [];
              const comments = post.comments || [];
              const isLiked = likes.includes(profile.uid);
              const isShared = !!post.sharedFrom;
              const hasImage = !!post.imageUrl;
              
              return (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <PostViewRecorder postId={post.id} userId={profile.uid} views={post.views || []} />
                  {/* Post Card Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={post.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.displayName || 'U')}`} 
                        className="w-11 h-11 rounded-full object-cover border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity" 
                        referrerPolicy="no-referrer"
                        onClick={() => openUserProfile(post.userId)}
                        alt=""
                      />
                      <div>
                        <h3 className="font-bold text-gray-900 text-[14px] sm:text-base flex items-center gap-1">
                          <span className="cursor-pointer hover:underline" onClick={() => openUserProfile(post.userId)}>{post.displayName}</span>
                          {isShared && (
                            <span className="text-xs text-gray-500 font-normal flex items-center gap-1 ml-1">
                              <Share2 size={12} className="text-emerald-500" /> shared a post
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 font-semibold">
                          <Globe size={11} />
                          <span>{post.timestamp ? formatChatDate(toSafeDate(post.timestamp)) : 'Just now'}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Delete button for owners */}
                    {post.userId === profile.uid && (
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-50 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Post Caption / Content */}
                  <div className="px-4 pb-3">
                    <p className={cn(
                      "text-gray-800 break-words whitespace-pre-wrap leading-relaxed select-text",
                      post.caption.length < 80 && !hasImage && !isShared ? "text-[17px] font-medium" : "text-[14px]"
                    )}>
                      {post.caption}
                    </p>
                  </div>

                  {/* Post Image Section */}
                  {hasImage && (
                    <div 
                      onClick={() => setLightboxImage(post.imageUrl)}
                      className="bg-gray-50 border-t border-b border-gray-100 overflow-hidden cursor-zoom-in group max-h-[500px] flex items-center justify-center relative"
                    >
                      <img 
                        src={post.imageUrl} 
                        className="w-full h-auto max-h-[500px] object-cover transition-transform duration-500 group-hover:scale-[1.01]" 
                        alt="Attached content"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                  )}

                  {/* NESTED SHARED POST PREVIEW */}
                  {isShared && post.sharedFrom && (
                    <div className="mx-4 mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                      <div className="p-3 flex items-center gap-2">
                        <img 
                          src={post.sharedFrom.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.sharedFrom.displayName || 'U')}`} 
                          className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => openUserProfile(post.sharedFrom.userId)}
                          alt=""
                        />
                        <div>
                          <h4 className="font-bold text-gray-800 text-xs cursor-pointer hover:underline" onClick={() => openUserProfile(post.sharedFrom.userId)}>{post.sharedFrom.displayName}</h4>
                          <p className="text-[10px] text-gray-400">Original post</p>
                        </div>
                      </div>
                      <div className="px-3 pb-3">
                        <p className="text-gray-700 text-xs break-words line-clamp-3 select-text">
                          {post.sharedFrom.caption}
                        </p>
                      </div>
                      {post.sharedFrom.imageUrl && (
                        <div className="bg-gray-100 border-t border-gray-200 overflow-hidden max-h-64 flex items-center justify-center">
                          <img 
                            src={post.sharedFrom.imageUrl} 
                            className="w-full h-auto max-h-64 object-cover" 
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Post Metrics Display */}
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50">
                    <div className="flex items-center gap-1 font-medium">
                      {likes.length > 0 ? (
                        <button 
                          onClick={() => setLikesModalPost(post)}
                          className="flex items-center gap-1.5 hover:underline focus:outline-none"
                          title="Click to see who liked this post"
                        >
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px]">
                            <ThumbsUp size={10} className="fill-white" />
                          </span>
                          <span className="text-gray-700 font-bold">{likes.length}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">Be the first to like this</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2.5 font-semibold text-[11px] text-gray-500">
                      <span className="flex items-center gap-1 text-gray-400/80" title="Views">
                        <Eye size={13} className="inline" />
                        <span>{(post.views || []).length} {(post.views || []).length === 1 ? 'view' : 'views'}</span>
                      </span>
                      {comments.length > 0 && (
                        <button 
                          onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          className="hover:underline flex items-center gap-1"
                        >
                          • {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                        </button>
                      )}
                      <span className="flex items-center gap-1 text-gray-400/80" title="Shares">
                        • <Share2 size={12} className="inline" />
                        <span>{post.shareCount || 0} {post.shareCount === 1 ? 'share' : 'shares'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Facebook Action Buttons (Like, Comment, Share) */}
                  <div className="border-t border-b border-gray-100 px-2 py-1 flex items-center justify-around text-xs font-bold text-gray-600">
                    <button 
                      onClick={() => handleToggleLike(post)}
                      className={cn(
                        "flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95",
                        isLiked ? "text-blue-600" : "hover:text-gray-800"
                      )}
                    >
                      <ThumbsUp size={16} className={cn(isLiked && "fill-blue-600 text-blue-600")} />
                      <span>Like</span>
                    </button>
                    
                    <button 
                      onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex-1 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} className="text-gray-500" />
                      <span>Comment</span>
                    </button>
                    
                    <button 
                      onClick={() => triggerShare(post)}
                      className="flex-1 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 size={16} className="text-gray-500" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* REAL-TIME COMMENTS LIST & INPUT (Facebook Style) */}
                  {openComments[post.id] && (
                    <div className="bg-[#f8f9fa] border-t border-gray-100 p-4 space-y-4 animate-in fade-in duration-300">
                      
                      {/* Comments Scroller */}
                      {comments.length > 0 && (
                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                          {comments.map((comm: any) => (
                            <div key={comm.id} className="flex gap-2 items-start text-xs">
                              <img 
                                src={comm.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.displayName || 'U')}`} 
                                className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" 
                                referrerPolicy="no-referrer"
                                alt=""
                              />
                              <div className="flex-1">
                                <div className="bg-gray-100 p-2.5 rounded-2xl max-w-[90%] inline-block">
                                  <h4 className="font-bold text-gray-900 mb-0.5">{comm.displayName}</h4>
                                  <p className="text-gray-700 break-words leading-relaxed select-text">{comm.text}</p>
                                </div>
                                <p className="text-[9px] text-gray-400 ml-2 mt-1">
                                  {comm.timestamp ? formatChatDate(new Date(comm.timestamp)) : 'Just now'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input Box */}
                      <div className="flex items-center gap-2">
                        <img 
                          src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
                          className="w-8 h-8 rounded-full object-cover shrink-0" 
                          referrerPolicy="no-referrer"
                          alt=""
                        />
                        <div className="flex-1 flex bg-white border border-gray-200 rounded-full overflow-hidden shadow-inner px-3 py-1 items-center">
                          <input 
                            type="text"
                            placeholder="Write a comment..."
                            className="flex-1 bg-transparent text-xs py-1.5 px-1 outline-none text-gray-800"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(post.id);
                              }
                            }}
                          />
                          <button 
                            onClick={() => handleAddComment(post.id)}
                            className="p-1 text-emerald-500 hover:text-emerald-600 transition-colors"
                          >
                            <Send size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })}

            {statuses.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm w-full">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-gray-600 mb-1">No timeline posts yet.</p>
                <p className="text-xs">Be the first to share an update, screenshot, or book review!</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* CREATE POST MODAL */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-[#111B21] text-lg text-center flex-1">Create Post</h3>
                <button 
                  onClick={() => { setIsPostModalOpen(false); setImageDataUrl(''); }} 
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 space-y-4">
                
                {/* Author row */}
                <div className="flex items-center gap-3">
                  <img 
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
                    className="w-10 h-10 rounded-full object-cover" 
                    referrerPolicy="no-referrer"
                    alt=""
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{profile.displayName}</h4>
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit mt-0.5">
                      <Globe size={10} /> Public
                    </span>
                  </div>
                </div>

                {/* Text editor */}
                <textarea 
                  rows={4}
                  placeholder={`What's on your mind, ${profile.displayName?.split(' ')[0]}? Share screen, earnings or books...`}
                  className="w-full bg-transparent border-0 outline-none resize-none text-gray-800 placeholder-gray-400 text-[15px] focus:ring-0 px-1"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />

                {/* Base64 Image Preview block */}
                {imageDataUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 max-h-60 flex items-center justify-center">
                    <img src={imageDataUrl} className="max-w-full max-h-60 object-contain" alt="Selected thumbnail" />
                    <button 
                      onClick={() => setImageDataUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                      title="Remove picture"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* File picker triggers */}
                <div className="border border-gray-200 rounded-2xl p-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Add to your post</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={handleImageFileChange} 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 hover:bg-emerald-50 rounded-full text-emerald-500 hover:text-emerald-600 transition-colors"
                      title="Attach Photo"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={handlePostStatus}
                  disabled={loading || (!caption.trim() && !imageDataUrl)}
                  className="w-full bg-[#00a884] text-white font-bold py-3.5 rounded-2xl shadow-lg hover:bg-[#008f70] transition-all disabled:opacity-50 h-12 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Post Now'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE POST MODAL */}
      <AnimatePresence>
        {isShareModalOpen && postToShare && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-[#111B21] text-lg text-center flex-1">Share to your Timeline</h3>
                <button 
                  onClick={() => { setIsShareModalOpen(false); setPostToShare(null); }} 
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                
                {/* Quote text editor */}
                <textarea 
                  rows={3}
                  placeholder="Say something about this post... (optional)"
                  className="w-full bg-transparent border-0 outline-none resize-none text-gray-800 placeholder-gray-400 text-[14px] focus:ring-0 px-1"
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                />

                {/* Embedded preview block */}
                <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <img 
                      src={postToShare.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(postToShare.displayName || 'U')}`} 
                      className="w-7 h-7 rounded-full object-cover" 
                      alt=""
                    />
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs">{postToShare.displayName}</h4>
                      <p className="text-[9px] text-gray-400">Original post</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-xs line-clamp-3 select-text">{postToShare.caption}</p>
                  {postToShare.imageUrl && (
                    <img 
                      src={postToShare.imageUrl} 
                      className="w-full h-auto max-h-48 object-cover rounded-xl" 
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={handleSharePost}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 h-12 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Share Now'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL IMAGE LIGHTBOX VIEWER */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col justify-between p-4 cursor-zoom-out animate-in fade-in duration-300"
          >
            {/* Top exit button */}
            <div className="flex justify-end p-2 z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Img frame */}
            <div className="flex-1 flex items-center justify-center">
              <img 
                src={lightboxImage} 
                className="max-w-full max-h-screen object-contain animate-in zoom-in duration-300 select-none" 
                alt="Large resolution" 
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()} // Stop closing on clicking image itself
              />
            </div>

            {/* Bottom download advice */}
            <div className="text-center text-xs text-white/40 pb-4 select-none">
              Tap anywhere outside the image to close the viewer
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SOCIAL PROFILE DETAIL MODAL */}
      <AnimatePresence>
        {isProfileDetailOpen && selectedUserId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1c272d] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#075E54] dark:bg-[#202c33] p-4 text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-bold text-white">Public Profile</h3>
                </div>
                <button 
                  onClick={() => setIsProfileDetailOpen(false)} 
                  className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* Profile Top Banner / Card */}
                <div className="bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                  
                  {/* Photo with frame */}
                  <div className="relative shrink-0">
                    <img 
                      src={selectedUserDoc?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDoc?.displayName || 'U')}`}
                      className="w-24 h-24 rounded-full border-4 border-white/30 p-0.5 object-cover shadow-lg"
                      alt=""
                    />
                    {selectedUserDoc?.isVerified && (
                      <span className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1 shadow border border-white">
                        <ShieldCheck size={14} className="fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Info block */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-extrabold flex items-center gap-2 justify-center md:justify-start">
                      <span className="truncate">{selectedUserDoc?.displayName || 'Ulfah Member'}</span>
                    </h2>
                    <p className="text-xs text-emerald-100 font-mono mt-1">Level: {selectedUserDoc?.level || 'Bronze'}</p>
                    <p className="text-sm text-white/90 italic mt-3 bg-white/10 px-4 py-2 rounded-xl border border-white/5 inline-block max-w-full">
                      {selectedUserDoc?.bio || 'Hey there! I am using Ulfah Chat.'}
                    </p>
                  </div>

                  {/* Action: Follow / Unfollow button */}
                  <div className="shrink-0 mt-2 md:mt-0">
                    {selectedUserId === profile.uid ? (
                      <span className="px-4 py-2 bg-white/15 text-white rounded-xl text-xs font-black uppercase tracking-wider select-none border border-white/10">
                        You (Self)
                      </span>
                    ) : (
                      <>
                        {selectedUserFollowers.some(f => f.followerId === profile.uid) ? (
                          <button
                            onClick={() => handleUnfollowUser(selectedUserId)}
                            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <UserMinus size={14} />
                            <span>Unfollow</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFollowUser(selectedUserDoc || { uid: selectedUserId, displayName: selectedUserDoc?.displayName || 'Ulfah Member', photoURL: selectedUserDoc?.photoURL || '' })}
                            className="px-5 py-2.5 bg-white hover:bg-emerald-50 active:scale-95 text-[#075E54] rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <UserPlus size={14} />
                            <span>Follow</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Statistics Bento Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 p-4 rounded-xl">
                    <p className="text-purple-600 dark:text-purple-400 font-black text-xl">{selectedUserFollowers.length}</p>
                    <p className="text-purple-800/80 dark:text-purple-400/80 font-bold text-[10px] uppercase tracking-wide">Followers</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl">
                    <p className="text-indigo-600 dark:text-indigo-400 font-black text-xl">{selectedUserFollowing.length}</p>
                    <p className="text-indigo-800/80 dark:text-indigo-400/80 font-bold text-[10px] uppercase tracking-wide">Following</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl">
                    <p className="text-blue-600 dark:text-blue-400 font-black text-xl">{selectedUserPosts.length}</p>
                    <p className="text-blue-800/80 dark:text-blue-400/80 font-bold text-[10px] uppercase tracking-wide">Posts Posted</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl">
                    <p className="text-emerald-600 dark:text-emerald-400 font-black text-xl">
                      {selectedUserPosts.reduce((acc, p) => acc + (p.views || []).length, 0)}
                    </p>
                    <p className="text-emerald-800/80 dark:text-emerald-400/80 font-bold text-[10px] uppercase tracking-wide">Total Post Views</p>
                  </div>
                </div>

                {/* Double Lists Row: Followers & Following Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Followers Mini-List */}
                  <div className="bg-gray-50 dark:bg-[#202c33] border border-gray-100 dark:border-white/5 p-4 rounded-xl">
                    <h3 className="font-bold text-[#075E54] dark:text-emerald-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Users size={14} /> Followers ({selectedUserFollowers.length})
                    </h3>
                    {selectedUserFollowers.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">No followers yet.</p>
                    ) : (
                      <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2">
                        {selectedUserFollowers.map((f: any) => (
                          <div 
                            key={f.id} 
                            onClick={() => openUserProfile(f.followerId)}
                            className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <img 
                              src={f.followerPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.followerName)}`}
                              className="w-7 h-7 rounded-full object-cover border border-gray-200"
                              alt=""
                            />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 hover:underline">{f.followerName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Following Mini-List */}
                  <div className="bg-gray-50 dark:bg-[#202c33] border border-gray-100 dark:border-white/5 p-4 rounded-xl">
                    <h3 className="font-bold text-[#075E54] dark:text-emerald-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Users size={14} /> Following ({selectedUserFollowing.length})
                    </h3>
                    {selectedUserFollowing.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">Following nobody yet.</p>
                    ) : (
                      <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2">
                        {selectedUserFollowing.map((f: any) => (
                          <div 
                            key={f.id} 
                            onClick={() => openUserProfile(f.followingId)}
                            className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <img 
                              src={f.followingPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.followingName)}`}
                              className="w-7 h-7 rounded-full object-cover border border-gray-200"
                              alt=""
                            />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 hover:underline">{f.followingName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* USER'S POSTS FEED */}
                <div className="space-y-4">
                  <h3 className="font-black text-gray-800 dark:text-gray-200 text-sm border-b pb-2 flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-600" /> Posts Feed by {selectedUserDoc?.displayName || 'User'}
                  </h3>
                  
                  {selectedUserPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic text-xs bg-gray-50 dark:bg-[#202c33] rounded-2xl border">
                      This user hasn't posted anything yet.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {selectedUserPosts.map((post) => {
                        const postLikes = post.likes || [];
                        const postComments = post.comments || [];
                        const postIsLiked = postLikes.includes(profile.uid);
                        const postHasImage = !!post.imageUrl;

                        return (
                          <div 
                            key={post.id} 
                            className="bg-white dark:bg-[#202c33] rounded-xl border border-gray-100 dark:border-white/5 p-4 shadow-sm space-y-3 text-left"
                          >
                            <PostViewRecorder postId={post.id} userId={profile.uid} views={post.views || []} />
                            
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="font-semibold">{post.timestamp ? formatChatDate(toSafeDate(post.timestamp)) : 'Just now'}</span>
                              {post.userId === profile.uid && (
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">{post.caption}</p>

                            {postHasImage && (
                              <img 
                                src={post.imageUrl} 
                                className="w-full h-auto max-h-64 object-cover rounded-xl border cursor-zoom-in" 
                                onClick={() => setLightboxImage(post.imageUrl)}
                                alt=""
                              />
                            )}

                            {/* Metrics & actions */}
                            <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 text-xs">
                              <button 
                                onClick={() => setLikesModalPost(post)}
                                className="flex items-center gap-1 hover:underline text-gray-500 focus:outline-none"
                              >
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px]">
                                  <ThumbsUp size={8} className="fill-white" />
                                </span>
                                <span className="font-bold">{postLikes.length}</span>
                              </button>

                              <div className="flex items-center gap-2.5 text-gray-400/80 font-medium">
                                <span className="flex items-center gap-0.5">
                                  <Eye size={11} />
                                  <span>{(post.views || []).length} views</span>
                                </span>
                                <span>• {postComments.length} comments</span>
                                <span>• {post.shareCount || 0} shares</span>
                              </div>
                            </div>

                            {/* Small simple quick like action */}
                            <div className="flex justify-end gap-2 border-t pt-2">
                              <button
                                onClick={() => handleToggleLike(post)}
                                className={cn(
                                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                  postIsLiked ? "bg-blue-50 text-blue-600" : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                                )}
                              >
                                <ThumbsUp size={12} className={cn(postIsLiked && "fill-blue-600")} />
                                <span>{postIsLiked ? 'Liked' : 'Like'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIKED BY MODAL */}
      <AnimatePresence>
        {likesModalPost && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1c272d] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
            >
              {/* Header */}
              <div className="bg-[#075E54] dark:bg-[#202c33] p-4 text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-white fill-white" />
                  <h3 className="text-base font-bold text-white">Liked By</h3>
                </div>
                <button 
                  onClick={() => setLikesModalPost(null)} 
                  className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Likes List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {loadingLikesDetails ? (
                  <div className="text-center py-8 text-gray-500 font-semibold text-xs animate-pulse">
                    Loading likes details...
                  </div>
                ) : likedUsersDetails.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic text-xs">
                    No likes details available.
                  </div>
                ) : (
                  likedUsersDetails.map((user: any) => (
                    <div 
                      key={user.uid} 
                      onClick={() => {
                        setLikesModalPost(null);
                        openUserProfile(user.uid);
                      }}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`}
                          className="w-10 h-10 rounded-full object-cover border border-gray-100"
                          alt=""
                        />
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs flex items-center gap-1 hover:underline">
                            <span>{user.displayName}</span>
                            {user.isVerified && <ShieldCheck size={13} className="text-emerald-500" />}
                          </h4>
                          <p className="text-[10px] text-gray-400">Level: {user.level || 'Bronze'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold">
                        Liked
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
