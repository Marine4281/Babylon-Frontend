import { useState, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Gift, Bookmark, Gamepad2, X, Send, Wallet } from "lucide-react";
import API from "../api/axios";
import BottomNav from "../components/BottomNav";
import { formatCurrency } from "../utils/formatCurrency";
import { formatRelativeTime } from "../utils/formatDate";

const GIFT_PRESETS = [5, 10, 25, 50];

function Avatar({ url, name, size = 40 }) {
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );
}

function GiftModal({ post, walletBalance, onClose, onSent }) {
  const [amount, setAmount] = useState(25);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!amount || amount <= 0) return;
    setSending(true);
    setError("");
    try {
      const { data } = await API.post(`/posts/${post._id}/comments/gift`, { amount, text });
      onSent(data, amount);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't send gift");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-1.5">
            <Gift size={18} className="text-orange-500" /> Gift Creator
          </h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {GIFT_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-xl py-3 flex flex-col items-center border-2 transition ${
                  amount === v ? "border-orange-400 bg-orange-50/40" : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <span className={`text-sm font-black ${amount === v ? "text-orange-500" : "text-gray-800"}`}>${v}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a highlight comment..."
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400"
          />
          <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-xs text-gray-500">
            <span>Available Wallet Balance:</span>
            <span className="font-bold text-gray-900">{formatCurrency(walletBalance)}</span>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={sending}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Send size={16} /> {sending ? "Sending..." : `Send $${amount}.00 Gift Comment`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentsSheet({ post, onClose, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");

  useEffect(() => {
    API.get(`/posts/${post._id}/comments`)
      .then(({ data }) => setComments(data.comments))
      .finally(() => setLoading(false));
  }, [post._id]);

  const submit = async () => {
    if (!text.trim()) return;
    const { data } = await API.post(`/posts/${post._id}/comments`, { text });
    setComments((c) => [data, ...c]);
    setText("");
    onCommentAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-lg">Comments</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {loading && <p className="text-xs text-gray-400 text-center">Loading...</p>}
          {!loading && comments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No comments yet — be the first.</p>
          )}
          {comments.map((c) => (
            <div
              key={c._id}
              className={`flex items-start gap-2 p-2 rounded-xl ${c.isGift ? "bg-amber-50/70 border border-amber-200/50" : ""}`}
            >
              <Avatar url={c.author?.avatarUrl} name={c.author?.username} size={28} />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold">{c.author?.username}</span>
                  {c.isGift && (
                    <span className="bg-amber-100 text-orange-600 font-black text-[10px] px-1.5 py-0.5 rounded-md">
                      ${c.giftAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-800 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a comment..."
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-orange-400"
          />
          <button onClick={submit} className="text-orange-500 font-bold text-sm px-2">Post</button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, walletBalance, onLike, onSave, onGifted, onCommentOpen }) {
  return (
    <div className="bg-white border-b border-gray-100 md:border md:rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center justify-between p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar url={post.author?.avatarUrl} name={post.author?.username} />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm">{post.author?.username}</span>
              {post.author?.countryCode && <span className="text-xs">{post.author.countryCode}</span>}
              {post.author?.isVerified && <span className="text-orange-500 text-xs">✓</span>}
            </div>
            <p className="text-xs text-gray-400">{formatRelativeTime(post.createdAt)}</p>
          </div>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
          <Gamepad2 size={14} /> Challenge
        </button>
      </div>

      {post.media?.[0] && (
        <div className="bg-gray-100 aspect-square overflow-hidden">
          <img src={post.media[0]} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-4">
          <button onClick={() => onLike(post)} className="flex items-center gap-1.5">
            <Heart size={22} className={post.isLiked ? "fill-red-500 text-red-500" : "text-gray-700"} />
            <span className="text-xs font-semibold">{post.likesCount}</span>
          </button>
          <button onClick={() => onCommentOpen(post)} className="flex items-center gap-1.5 text-gray-700">
            <MessageCircle size={22} />
            <span className="text-xs font-semibold">{post.commentsCount}</span>
          </button>
          <button
            onClick={() => onGifted(post, "open")}
            className="flex items-center gap-1.5 text-orange-500 font-extrabold text-xs"
          >
            <Gift size={22} /> Gift Post
          </button>
        </div>
        <button onClick={() => onSave(post)}>
          <Bookmark size={22} className={post.isSaved ? "fill-orange-500 text-orange-500" : "text-gray-700"} />
        </button>
      </div>

      <div className="px-3.5 pb-4 space-y-2">
        {post.caption && (
          <p className="text-sm">
            <span className="font-bold mr-1">{post.author?.username}</span>
            {post.caption}
          </p>
        )}
        {post.topGiftComment && (
          <div className="bg-amber-50/70 border border-amber-200/50 rounded-xl p-2.5 flex items-start gap-2">
            <Avatar url={post.topGiftComment.author?.avatarUrl} name={post.topGiftComment.author?.username} size={26} />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold">{post.topGiftComment.author?.username}</span>
                <span className="bg-amber-100 text-orange-600 font-black text-[10px] px-1.5 py-0.5 rounded-md">
                  ${post.topGiftComment.giftAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-800 mt-0.5">{post.topGiftComment.text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [giftTarget, setGiftTarget] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);

  const loadFeed = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await API.get(`/posts?page=${pageNum}&limit=10`);
      setPosts((prev) => (pageNum === 1 ? data.posts : [...prev, ...data.posts]));
      setHasMore(data.posts.length === 10);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1);
    API.get("/wallet/me").then(({ data }) => setBalance(data.balance)).catch(() => {});
  }, [loadFeed]);

  const handleLike = async (post) => {
    setPosts((ps) => ps.map((p) => (p._id === post._id ? { ...p, isLiked: !p.isLiked, likesCount: p.likesCount + (p.isLiked ? -1 : 1) } : p)));
    try {
      const { data } = await API.post(`/posts/${post._id}/like`);
      setPosts((ps) => ps.map((p) => (p._id === post._id ? { ...p, isLiked: data.isLiked, likesCount: data.likesCount } : p)));
    } catch {
      loadFeed(1);
    }
  };

  const handleSave = async (post) => {
    setPosts((ps) => ps.map((p) => (p._id === post._id ? { ...p, isSaved: !p.isSaved } : p)));
    try {
      await API.post(`/posts/${post._id}/save`);
    } catch {
      loadFeed(1);
    }
  };

  const handleGiftSent = (comment, amount) => {
    setBalance((b) => b - amount);
    setPosts((ps) =>
      ps.map((p) =>
        p._id === giftTarget._id
          ? { ...p, commentsCount: p.commentsCount + 1, giftTotal: (p.giftTotal || 0) + amount, topGiftComment: comment }
          : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight text-gray-900">
          BABYL<span className="text-orange-500">ON</span>
        </span>
        <div className="flex items-center gap-1.5 bg-amber-50 text-orange-600 border border-amber-200/60 px-3 py-1.5 rounded-full text-xs font-semibold">
          <Wallet size={14} />
          {formatCurrency(balance)}
        </div>
      </header>

      <main className="max-w-md mx-auto pt-2">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            walletBalance={balance}
            onLike={handleLike}
            onSave={handleSave}
            onGifted={(p) => setGiftTarget(p)}
            onCommentOpen={(p) => setCommentTarget(p)}
          />
        ))}

        {loading && <p className="text-center text-xs text-gray-400 py-6">Loading...</p>}
        {!loading && posts.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-12">No posts yet — be the first to share something.</p>
        )}
        {!loading && hasMore && posts.length > 0 && (
          <button
            onClick={() => {
              const next = page + 1;
              setPage(next);
              loadFeed(next);
            }}
            className="w-full text-xs font-semibold text-orange-500 py-4"
          >
            Load more
          </button>
        )}
      </main>

      {giftTarget && (
        <GiftModal post={giftTarget} walletBalance={balance} onClose={() => setGiftTarget(null)} onSent={handleGiftSent} />
      )}
      {commentTarget && (
        <CommentsSheet
          post={commentTarget}
          onClose={() => setCommentTarget(null)}
          onCommentAdded={() =>
            setPosts((ps) => ps.map((p) => (p._id === commentTarget._id ? { ...p, commentsCount: p.commentsCount + 1 } : p)))
          }
        />
      )}

      <BottomNav />
    </div>
  );
            }
