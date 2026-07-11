import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
function PostViewRecorder({ postId, userId, viewedBy = [] }: { postId: string; userId: string; viewedBy: string[] }) {
  useEffect(() => {
    if (!postId || !userId) return;
    if (!viewedBy.includes(userId)) {
      const postRef = doc(db, 'statuses', postId);
      updateDoc(postRef, {
        viewedBy: arrayUnion(userId)
      }).catch(err => console.error("Error recording view:", err));
    }
  }, [postId, userId, viewedBy]);

  return null;
}

// Memoized Status Card for better scrolling performance
const StatusCard = React.memo(({ 
  post, 
  profile, 
  onLike, 
  onDelete, 
  onShare, 
  onComment, 
  onOpenProfile, 
  onShowLikes, 
  onShowViews,
  openComments,
  setOpenComments,
  commentInputs,
  setCommentInputs
}: {
  post: any;
  profile: UserProfile;
  onLike: (postId: string, isLiked: boolean) => void;
  onDelete: (postId: string) => void;
  onShare: (post: any) => void;
  onComment: (postId: string) => void;
  onOpenProfile: (uid: string) => void;
  onShowLikes: (post: any) => void;
  onShowViews: (post: any) => void;
  openComments: Record<string, boolean>;
  setOpenComments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  commentInputs: Record<string, string>;
  setCommentInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) => {
  const likes = post.likes || [];
  const comments = post.comments || [];
  const isLiked = likes.includes(profile.uid);
  const isShared = !!post.sharedFrom;
  const hasImage = !!post.imageUrl;
  const isMyPost = post.userId === profile.uid;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-[#202c33] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
    >
      <PostViewRecorder postId={post.id} userId={profile.uid} viewedBy={post.viewedBy || []} />
      
      {/* Post Card Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={post.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.displayName || 'U')}`} 
            className="w-11 h-11 rounded-full object-cover border border-gray-100 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity" 
            referrerPolicy="no-referrer"
            onClick={() => onOpenProfile(post.userId)}
            alt=""
            loading="lazy"
          />
          <div>
            <h3 className="font-bold text-[#008069] dark:text-white text-[14px] sm:text-base flex items-center gap-1.5">
              <span className="cursor-pointer hover:underline" onClick={() => onOpenProfile(post.userId)}>{post.displayName}</span>
              {post.isVerified && <ShieldCheck size={14} className="text-[#00a884] fill-white" />}
              {isShared && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1 ml-1 Urdu">
                  <Share2 size={12} className="text-emerald-500" /> نے ایک پوسٹ شیئر کی
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 font-bold">
              <Globe size={11} />
              <span>{post.timestamp ? formatChatDate(toSafeDate(post.timestamp)) : 'ابھی ابھی'}</span>
            </p>
          </div>
        </div>
        
        {isMyPost && (
          <button 
            onClick={() => onDelete(post.id)}
            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Post Caption / Content */}
      <div className="px-4 pb-3">
        <p className={cn(
          "text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap leading-relaxed select-text",
          post.caption.length < 80 && !hasImage && !isShared ? "text-[17px] font-medium" : "text-[14px]"
        )}>
          {post.caption}
        </p>
      </div>

      {/* Post Image Section */}
      {hasImage && (
        <div className="bg-gray-50 dark:bg-black/20 border-t border-b border-gray-100 dark:border-white/5 overflow-hidden cursor-zoom-in group max-h-[500px] flex items-center justify-center relative">
          <img 
            src={post.imageUrl} 
            className="w-full h-auto max-h-[500px] object-cover transition-transform duration-500 group-hover:scale-[1.01]" 
            alt="Attached content"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>
      )}

      {/* NESTED SHARED POST PREVIEW */}
      {isShared && post.sharedFrom && (
        <div className="mx-4 mb-4 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-black/10">
          <div className="p-3 flex items-center gap-2">
            <img 
              src={post.sharedFrom.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.sharedFrom.displayName || 'U')}`} 
              className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => onOpenProfile(post.sharedFrom.userId)}
              alt=""
              loading="lazy"
            />
            <div>
              <h4 className="font-bold text-[#008069] dark:text-white text-xs cursor-pointer hover:underline flex items-center gap-1" onClick={() => onOpenProfile(post.sharedFrom.userId)}>
                {post.sharedFrom.displayName}
                {post.sharedFrom.isVerified && <ShieldCheck size={12} className="text-[#00a884] fill-white" />}
              </h4>
              <p className="text-[9px] text-gray-400 font-bold Urdu">اصل پوسٹ (Original)</p>
            </div>
          </div>
          <div className="px-3 pb-3">
            <p className="text-gray-700 dark:text-gray-300 text-xs break-words line-clamp-3 select-text">
              {post.sharedFrom.caption}
            </p>
          </div>
          {post.sharedFrom.imageUrl && (
            <div className="bg-gray-100 dark:bg-black/20 border-t border-gray-200 dark:border-white/5 overflow-hidden max-h-64 flex items-center justify-center">
              <img 
                src={post.sharedFrom.imageUrl} 
                className="w-full h-auto max-h-64 object-cover" 
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      {/* Post Metrics Display */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 dark:border-white/5">
        <div className="flex items-center gap-1 font-medium">
          {likes.length > 0 ? (
            <button 
              onClick={() => onShowLikes(post)}
              className="flex items-center gap-1.5 hover:underline focus:outline-none"
              title="Click to see who liked this post"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px]">
                <ThumbsUp size={10} className="fill-white" />
              </span>
              <span className="text-gray-700 dark:text-gray-300 font-bold">{likes.length}</span>
            </button>
          ) : (
            <span className="text-gray-400">Be the first to like this</span>
          )}
        </div>
        
        <div className="flex items-center gap-2.5 font-semibold text-[11px] text-gray-500">
          <button 
            onClick={() => {
              if (isMyPost) {
                onShowViews(post);
              }
            }}
            className={cn(
              "flex items-center gap-1 transition-colors",
              isMyPost ? "text-emerald-600 hover:text-emerald-700 hover:underline" : "text-gray-400/80 cursor-default"
            )}
            title={isMyPost ? "Click to see who viewed your post" : "Views"}
          >
            <Eye size={13} className="inline" />
            <span>{(post.viewedBy || []).length} {(post.viewedBy || []).length === 1 ? 'view' : 'views'}</span>
          </button>
          {comments.length > 0 && (
            <button 
              onClick={() => setOpenComments((prev: any) => ({ ...prev, [post.id]: !prev[post.id] }))}
              className="hover:underline hover:text-emerald-600 transition-colors"
            >
              {comments.length} comments
            </button>
          )}
          {post.shareCount > 0 && (
            <span>{post.shareCount} shares</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center border-t border-gray-100 dark:border-white/5 mx-2 py-1">
        <button 
          onClick={() => onLike(post.id, isLiked)}
          className={cn(
            "flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold transition-all rounded-xl active:scale-95",
            isLiked 
              ? "text-blue-500 bg-blue-50 dark:bg-blue-500/10" 
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          )}
        >
          <ThumbsUp size={16} className={cn(isLiked && "fill-blue-500")} />
          <span>Like</span>
        </button>
        <button 
          onClick={() => setOpenComments((prev: any) => ({ ...prev, [post.id]: !prev[post.id] }))}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all rounded-xl active:scale-95"
        >
          <MessageSquare size={16} />
          <span>Comment</span>
        </button>
        <button 
          onClick={() => onShare(post)}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all rounded-xl active:scale-95"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>

      {/* COMMENTS SECTION */}
      <AnimatePresence>
        {openComments[post.id] && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-black/5 overflow-hidden"
          >
            {/* Existing comments list */}
            <div className="px-4 py-3 space-y-4">
              {comments.length > 0 ? (
                comments.map((comment: any, idx: number) => (
                  <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                    <img 
                      src={comment.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.displayName || 'U')}`} 
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100 dark:border-white/10" 
                      alt=""
                    />
                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#008069] dark:text-gray-200 text-xs">{comment.displayName}</span>
                          <span className="text-[9px] text-gray-400">{comment.timestamp ? getTime(toSafeDate(comment.timestamp)) : ''}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 text-xs italic">No comments yet. Be the first to join the conversation!</div>
              )}
            </div>

            {/* Comment Input */}
            <div className="p-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-emerald-50" 
                alt=""
              />
              <div className="flex-1 relative">
                <input 
                  type="text"
                  placeholder="Write a comment..."
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentInputs[post.id]?.trim()) {
                      onComment(post.id);
                    }
                  }}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-2 px-4 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all dark:text-white"
                />
                <button 
                  onClick={() => onComment(post.id)}
                  disabled={!commentInputs[post.id]?.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 disabled:opacity-30 p-1 hover:bg-emerald-50 rounded-full transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default function Status({ profile }: StatusProps) {
  const navigate = useNavigate();
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

  // Views detail modal
  const [viewsModalPost, setViewsModalPost] = useState<any | null>(null);
  const [viewedUsersDetails, setViewedUsersDetails] = useState<any[]>([]);
  const [loadingViewsDetails, setLoadingViewsDetails] = useState(false);

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

  // Listen to viewed users details
  useEffect(() => {
    if (!viewsModalPost || !viewsModalPost.viewedBy || viewsModalPost.viewedBy.length === 0) {
      setViewedUsersDetails([]);
      return;
    }
    
    let active = true;
    const fetchViewedUsers = async () => {
      setLoadingViewsDetails(true);
      try {
        const details = await Promise.all(
          viewsModalPost.viewedBy.map(async (uid: string) => {
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
          setViewedUsersDetails(details);
        }
      } catch (err) {
        console.error("Error fetching viewed users details:", err);
      } finally {
        if (active) {
          setLoadingViewsDetails(false);
        }
      }
    };

    fetchViewedUsers();
    return () => {
      active = false;
    };
  }, [viewsModalPost]);

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
        isVerified: profile.isVerified || false,
        imageUrl: imageDataUrl || '',
        caption: caption.trim(),
        timestamp: serverTimestamp(),
        viewedBy: [],
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
        isVerified: profile.isVerified || false,
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
        isVerified: postToShare.isVerified || false,
        caption: postToShare.caption,
        imageUrl: postToShare.imageUrl || '',
        photoURL: postToShare.photoURL || ''
      };
      
      await addDoc(collection(db, 'statuses'), {
        userId: profile.uid,
        displayName: profile.displayName || 'Anonymous',
        photoURL: profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`,
        isVerified: profile.isVerified || false,
        caption: shareCaption.trim() || 'Shared a post',
        imageUrl: '', // Nest content rather than duplicate
        timestamp: serverTimestamp(),
        viewedBy: [],
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
    <div className="flex-1 bg-[#e7f5f1] dark:bg-[#111b21] flex flex-col lg:flex-row overflow-hidden min-h-0">
      
      {/* LEFT SIDEBAR - My Profile Stats & App Info */}
      <div className="hidden lg:flex w-[340px] bg-white dark:bg-[#111b21] border-r border-emerald-100 dark:border-white/5 flex-col overflow-hidden shrink-0">
        <div className="p-4 bg-[#e7f5f1] dark:bg-[#202c33] border-b border-emerald-100 dark:border-white/5 flex items-center justify-between safe-area-top">
          <h2 className="text-xl font-black text-[#008069] dark:text-white Urdu">اپڈیٹس (Updates)</h2>
          <div className="text-xs bg-[#00a884] text-white px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm">
            <Sparkles size={12} /> سوشل فیڈ
          </div>
        </div>

        <div className="p-4 scrollable-content custom-scrollbar flex-1 space-y-4">
          
          {/* User Profile Summary Card */}
          <div className="bg-gradient-to-br from-[#00a884] to-[#008069] text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
                className="w-20 h-20 rounded-full border-4 border-white/20 p-0.5 object-cover mb-3 cursor-pointer hover:scale-105 transition-transform" 
                referrerPolicy="no-referrer"
                onClick={() => openUserProfile(profile.uid)}
                alt=""
              />
              <h3 className="font-bold text-lg leading-tight flex items-center gap-1 justify-center cursor-pointer hover:underline Urdu">
                {profile.displayName}
                {profile.isVerified && <ShieldCheck size={16} className="text-emerald-400 fill-white" />}
              </h3>
              <p className="text-[10px] text-white/85 mb-3 font-bold uppercase tracking-widest">Level: {profile.level || 'Bronze'}</p>
              
              <div className="bg-white/15 px-3 py-1.5 rounded-2xl text-[11px] font-bold Urdu max-w-full truncate mb-3">
                {profile.bio || 'السلام علیکم! میں الفلاح چیٹ استعمال کر رہا ہوں۔'}
              </div>

              <button 
                onClick={() => openUserProfile(profile.uid)}
                className="w-full py-2 bg-white text-[#008069] hover:bg-white/95 rounded-2xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 Urdu"
              >
                <Users size={14} />
                <span>سوشل پروفائل دیکھیں</span>
              </button>
            </div>
          </div>

          {/* App Knowledge & Developer Info Block */}
          <div className="bg-white/50 dark:bg-[#202c33]/50 border border-emerald-100 dark:border-white/5 p-4 rounded-2xl">
            <h4 className="font-black text-[#008069] dark:text-white text-sm mb-3 flex items-center gap-2 Urdu">
              <Sparkles size={16} className="text-amber-500 animate-pulse" /> ڈویلپر معلومات (Info)
            </h4>
            <div className="space-y-2 text-xs text-[#008069]/80 dark:text-gray-400 leading-relaxed font-bold">
              <p>
                <strong className="text-gray-900 dark:text-white">ڈویلپر:</strong> <span className="bg-[#00a884] text-white px-2 py-0.5 rounded-lg font-bold text-[10px]">عبدالرحمن حبیب</span>
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
              className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl hover:bg-emerald-100/50 transition-colors text-center flex flex-col items-center justify-center shadow-sm"
            >
              <p className="text-emerald-600 dark:text-emerald-400 font-black text-lg">{myFollowers.length}</p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 font-bold text-[9px] uppercase tracking-wider">Followers</p>
            </button>
            <button 
              onClick={() => openUserProfile(profile.uid)}
              className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl hover:bg-emerald-100/50 transition-colors text-center flex flex-col items-center justify-center shadow-sm"
            >
              <p className="text-emerald-600 dark:text-emerald-400 font-black text-lg">{myFollowing.length}</p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 font-bold text-[9px] uppercase tracking-wider">Following</p>
            </button>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm">
              <p className="text-emerald-600 dark:text-emerald-400 font-black text-lg">
                {statuses.filter(s => s.userId === profile.uid).length}
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 font-bold text-[9px] uppercase tracking-wider">My Posts</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm">
              <p className="text-emerald-500 font-bold text-lg">
                {statuses.filter(s => s.userId === profile.uid).reduce((acc, s) => acc + (s.viewedBy || []).length, 0)}
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
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-4 px-3 sm:px-6 space-y-4 bg-[#e7f5f1] dark:bg-[#111b21]">
        
        {/* Mobile Header (Collapse layout toggle or simpler top bar) */}
        <div className="w-full max-w-2xl bg-white dark:bg-[#202c33] rounded-2xl p-4 shadow-sm flex items-center justify-between border border-emerald-50 dark:border-white/5 lg:hidden">
          <div className="flex items-center gap-3">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[#128C7E]" 
              alt="Profile"
              onClick={() => openUserProfile(profile.uid)}
            />
            <div>
              <h3 className="font-bold text-[#008069] dark:text-white text-sm flex items-center gap-1">
                {profile.displayName}
                {profile.isVerified && <ShieldCheck size={14} className="text-[#00a884] fill-white" />}
              </h3>
              <button 
                onClick={() => openUserProfile(profile.uid)}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline text-left"
              >
                پروفائل دیکھیں (Profile)
              </button>
            </div>
          </div>
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className="bg-[#00a884] text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Plus size={14} /> نئی پوسٹ
          </button>
        </div>

        {/* Facebook-style "What's on your mind?" Input Box */}
        <div className="w-full max-w-2xl bg-white dark:bg-[#202c33] rounded-2xl p-4 shadow-sm border border-emerald-50 dark:border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'U')}`} 
              className="w-10 h-10 rounded-full object-cover" 
              alt="Profile"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setIsPostModalOpen(true)}
              className="flex-1 bg-[#e7f5f1] dark:bg-[#111b21] hover:bg-emerald-100/50 dark:hover:bg-white/5 text-left px-5 py-3 rounded-full text-sm text-[#008069]/60 dark:text-white/60 font-medium transition-colors"
            >
              کچھ شیئر کریں، {profile.displayName?.split(' ')[0]}؟
            </button>
          </div>
          
          <div className="border-t border-emerald-50 dark:border-white/5 pt-2 flex justify-around items-center text-[11px] font-black text-[#008069] dark:text-white/70">
            <button 
              onClick={() => setIsPostModalOpen(true)} 
              className="flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-white/5 px-4 py-2 rounded-xl transition-colors"
            >
              <Image size={18} className="text-emerald-500" />
              <span>تصویر / اسکرین شاٹ</span>
            </button>
            <button 
              onClick={() => {
                setCaption("✨ Reading Islamic Library...");
                setIsPostModalOpen(true);
              }} 
              className="flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-white/5 px-4 py-2 rounded-xl transition-colors"
            >
              <BookOpen size={18} className="text-blue-500" />
              <span>کتاب کی سفارش</span>
            </button>
          </div>
        </div>

        {/* POSTS LIST (Facebook style) */}
        <div className="w-full max-w-2xl space-y-4">
          <AnimatePresence>
            {statuses.map((post) => (
              <StatusCard 
                key={post.id}
                post={post}
                profile={profile}
                onLike={handleToggleLike}
                onDelete={handleDeletePost}
                onShare={triggerShare}
                onComment={handleAddComment}
                onOpenProfile={(uid) => navigate(`/contacts`)}
                onShowLikes={(p) => setLikesModalPost(p)}
                onShowViews={(p) => setViewsModalPost(p)}
                openComments={openComments}
                setOpenComments={setOpenComments}
                commentInputs={commentInputs}
                setCommentInputs={setCommentInputs}
              />
            ))}
            {/* End of mapping */}
            {statuses.length === 0 && (
              <div className="bg-white dark:bg-[#202c33] rounded-3xl p-12 text-center text-[#008069]/40 border border-emerald-100 dark:border-white/5 shadow-sm w-full">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-black text-[#008069] dark:text-white mb-1 Urdu">کوئی پوسٹ نہیں ملی۔</p>
                <p className="text-xs Urdu font-bold">اپنے خیالات یا کتب کا تبصرہ شیئر کرنے والے پہلے شخص بنیں!</p>
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
              className="bg-[#e7f5f1] dark:bg-[#1c272d] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 dark:border-white/5 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-emerald-100 dark:border-white/5 flex items-center justify-between bg-[#e7f5f1] dark:bg-[#202c33]">
                <h3 className="font-black text-[#008069] dark:text-white text-lg text-center flex-1 Urdu">پوسٹ بنائیں (Create Post)</h3>
                <button 
                  onClick={() => { setIsPostModalOpen(false); setImageDataUrl(''); }} 
                  className="text-[#008069] dark:text-white/70 hover:bg-[#00a884]/10 p-2 rounded-full transition-all"
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
                    <h4 className="font-bold text-[#008069] dark:text-white text-sm flex items-center gap-1">
                      {profile.displayName}
                      {profile.isVerified && <ShieldCheck size={14} className="text-[#00a884] fill-white" />}
                    </h4>
                    <span className="bg-[#00a884]/10 text-[#00a884] dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit mt-0.5">
                      <Globe size={10} /> Public
                    </span>
                  </div>
                </div>

                {/* Text editor */}
                <textarea 
                  rows={4}
                  placeholder={`آپ کے ذہن میں کیا ہے، ${profile.displayName?.split(' ')[0]}؟ اسکرین شاٹ یا کتب شیئر کریں...`}
                  className="w-full bg-transparent border-0 outline-none resize-none text-[#008069] dark:text-white placeholder-[#008069]/40 dark:placeholder-white/40 text-[15px] font-bold focus:ring-0 px-1 Urdu"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />

                {/* Base64 Image Preview block */}
                {imageDataUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-100 dark:border-white/5 bg-white dark:bg-[#111b21] max-h-60 flex items-center justify-center shadow-inner">
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
                <div className="border border-emerald-100 dark:border-white/5 rounded-2xl p-3 flex items-center justify-between bg-white dark:bg-[#111b21]">
                  <span className="text-xs font-black text-[#008069] dark:text-white/70 Urdu">پوسٹ میں شامل کریں (Add)</span>
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
                      className="p-2.5 hover:bg-[#00a884]/10 rounded-full text-[#00a884] transition-colors"
                      title="Attach Photo"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-emerald-100 dark:border-white/5">
                <button 
                  onClick={handlePostStatus}
                  disabled={loading || (!caption.trim() && !imageDataUrl)}
                  className="w-full bg-[#00a884] text-white font-black py-3.5 rounded-2xl shadow-lg hover:bg-[#008f70] transition-all disabled:opacity-50 h-12 flex items-center justify-center Urdu"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'پوسٹ کریں (Post Now)'}
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
              className="bg-[#e7f5f1] dark:bg-[#1c272d] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 dark:border-white/5 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-emerald-100 dark:border-white/5 flex items-center justify-between bg-[#e7f5f1] dark:bg-[#202c33]">
                <h3 className="font-black text-[#008069] dark:text-white text-lg text-center flex-1 Urdu">ٹائم لائن پر شیئر کریں (Share)</h3>
                <button 
                  onClick={() => { setIsShareModalOpen(false); setPostToShare(null); }} 
                  className="text-[#008069] dark:text-white/70 hover:bg-[#00a884]/10 p-2 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                
                {/* Quote text editor */}
                <textarea 
                  rows={3}
                  placeholder="اس پوسٹ کے بارے میں کچھ کہیں... (اختیاری)"
                  className="w-full bg-transparent border-0 outline-none resize-none text-[#008069] dark:text-white placeholder-[#008069]/40 dark:placeholder-white/40 text-[14px] font-bold focus:ring-0 px-1 Urdu"
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                />

                {/* Embedded preview block */}
                <div className="border border-emerald-100 dark:border-white/5 rounded-2xl p-3 bg-white dark:bg-[#111b21] space-y-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <img 
                      src={postToShare.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(postToShare.displayName || 'U')}`} 
                      className="w-7 h-7 rounded-full object-cover" 
                      alt=""
                    />
                    <div>
                      <h4 className="font-bold text-[#008069] dark:text-white text-xs flex items-center gap-1">
                        {postToShare.displayName}
                        {postToShare.isVerified && <ShieldCheck size={12} className="text-[#00a884] fill-white" />}
                      </h4>
                      <p className="text-[9px] text-gray-400 Urdu font-bold">اصل پوسٹ (Original)</p>
                    </div>
                  </div>
                  <p className="text-[#008069]/80 dark:text-white/80 text-xs line-clamp-3 select-text font-bold">{postToShare.caption}</p>
                  {postToShare.imageUrl && (
                    <img 
                      src={postToShare.imageUrl} 
                      className="w-full h-auto max-h-48 object-cover rounded-xl shadow-sm border border-emerald-50 dark:border-white/5" 
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-emerald-100 dark:border-white/5">
                <button 
                  onClick={handleSharePost}
                  disabled={loading}
                  className="w-full bg-[#00a884] text-white font-black py-3.5 rounded-2xl shadow-lg hover:bg-[#008f70] transition-all disabled:opacity-50 h-12 flex items-center justify-center Urdu"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'ابھی شیئر کریں (Share Now)'}
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
              className="bg-[#e7f5f1] dark:bg-[#1c272d] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#e7f5f1] dark:bg-[#202c33] p-4 border-b border-emerald-100 dark:border-white/5 text-[#008069] dark:text-white flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#008069] dark:text-white" />
                  <h3 className="text-lg font-black Urdu">پبلک پروفائل (Public Profile)</h3>
                </div>
                <button 
                  onClick={() => setIsProfileDetailOpen(false)} 
                  className="p-1.5 hover:bg-[#00a884]/10 rounded-full text-[#008069] dark:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* Profile Top Banner / Card */}
                <div className="bg-gradient-to-br from-[#00a884] via-[#008069] to-[#00a884] text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                  
                  {/* Photo with frame */}
                  <div className="relative shrink-0">
                    <img 
                      src={selectedUserDoc?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDoc?.displayName || 'U')}`}
                      className="w-24 h-24 rounded-full border-4 border-white/30 p-0.5 object-cover shadow-lg"
                      alt=""
                    />
                    {selectedUserDoc?.isVerified && (
                      <span className="absolute bottom-1 right-1 bg-[#00a884] text-white rounded-full p-1 shadow border border-white animate-bounce-slow">
                        <ShieldCheck size={14} className="fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Info block */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black flex items-center gap-2 justify-center md:justify-start Urdu">
                      <span className="truncate">{selectedUserDoc?.displayName || 'Ulfah Member'}</span>
                      {selectedUserDoc?.isVerified && <ShieldCheck size={20} className="fill-white shrink-0" />}
                    </h2>
                    <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">Level: {selectedUserDoc?.level || 'Bronze'}</p>
                    <p className="text-sm text-white/95 font-bold Urdu mt-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/5 inline-block max-w-full">
                      {selectedUserDoc?.bio || 'السلام علیکم! میں الفلاح چیٹ استعمال کر رہا ہوں۔'}
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
                      {selectedUserPosts.reduce((acc, p) => acc + (p.viewedBy || []).length, 0)}
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
                            <PostViewRecorder postId={post.id} userId={profile.uid} viewedBy={post.viewedBy || []} />
                            
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
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (post.userId === profile.uid) {
                                      setViewsModalPost(post);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-0.5 transition-colors",
                                    post.userId === profile.uid ? "text-emerald-600 hover:text-emerald-700 hover:underline" : ""
                                  )}
                                >
                                  <Eye size={11} />
                                  <span>{(post.viewedBy || []).length} views</span>
                                </button>
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
              className="bg-[#e7f5f1] dark:bg-[#1c272d] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] border border-emerald-100 dark:border-white/5"
            >
              {/* Header */}
              <div className="bg-[#e7f5f1] dark:bg-[#202c33] p-4 text-[#008069] dark:text-white flex items-center justify-between border-b border-emerald-100 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-[#008069] dark:text-white fill-[#008069] dark:fill-white" />
                  <h3 className="text-base font-black Urdu">پسند کرنے والے (Liked By)</h3>
                </div>
                <button 
                  onClick={() => setLikesModalPost(null)} 
                  className="p-1 hover:bg-[#00a884]/10 rounded-full text-[#008069] dark:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Likes List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {loadingLikesDetails ? (
                  <div className="text-center py-8 text-[#008069]/60 dark:text-white/40 font-bold text-xs animate-pulse">
                    لوڈنگ (Loading)...
                  </div>
                ) : likedUsersDetails.length === 0 ? (
                  <div className="text-center py-8 text-[#008069]/40 dark:text-gray-500 italic text-xs">
                    کوئی ڈیٹا نہیں ملا۔
                  </div>
                ) : (
                  likedUsersDetails.map((user: any) => (
                    <div 
                      key={user.uid} 
                      onClick={() => {
                        setLikesModalPost(null);
                        openUserProfile(user.uid);
                      }}
                      className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-white/5 rounded-2xl cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`}
                          className="w-10 h-10 rounded-full object-cover border border-emerald-50 shadow-sm"
                          alt=""
                        />
                        <div>
                          <h4 className="font-bold text-[#008069] dark:text-gray-200 text-xs flex items-center gap-1.5 hover:underline">
                            <span>{user.displayName}</span>
                            {user.isVerified && <ShieldCheck size={13} className="text-[#00a884] fill-white" />}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-bold">Level: {user.level || 'Bronze'}</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
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

      {/* VIEWED BY MODAL */}
      <AnimatePresence>
        {viewsModalPost && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#e7f5f1] dark:bg-[#1c272d] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] border border-emerald-100 dark:border-white/5"
            >
              {/* Header */}
              <div className="bg-[#e7f5f1] dark:bg-[#202c33] p-4 text-[#008069] dark:text-white flex items-center justify-between border-b border-emerald-100 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#008069] dark:text-white" />
                  <h3 className="text-base font-black Urdu">دیکھنے والے (Viewed By)</h3>
                </div>
                <button 
                  onClick={() => setViewsModalPost(null)} 
                  className="p-1 hover:bg-[#00a884]/10 rounded-full text-[#008069] dark:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Views List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {loadingViewsDetails ? (
                  <div className="text-center py-8 text-[#008069]/60 dark:text-white/40 font-bold text-xs animate-pulse">
                    لوڈنگ (Loading)...
                  </div>
                ) : viewedUsersDetails.length === 0 ? (
                  <div className="text-center py-8 text-[#008069]/40 dark:text-gray-500 italic text-xs">
                    کوئی ڈیٹا نہیں ملا۔
                  </div>
                ) : (
                  viewedUsersDetails.map((user: any) => (
                    <div 
                      key={user.uid} 
                      onClick={() => {
                        setViewsModalPost(null);
                        openUserProfile(user.uid);
                      }}
                      className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-white/5 rounded-2xl cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`}
                          className="w-10 h-10 rounded-full object-cover border border-emerald-50 shadow-sm"
                          alt=""
                        />
                        <div>
                          <h4 className="font-bold text-[#008069] dark:text-gray-200 text-xs flex items-center gap-1.5 hover:underline">
                            <span>{user.displayName}</span>
                            {user.isVerified && <ShieldCheck size={13} className="text-[#00a884] fill-white" />}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-bold">Level: {user.level || 'Bronze'}</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                        Viewed
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
