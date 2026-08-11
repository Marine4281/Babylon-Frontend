import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Flag } from "lucide-react";
import API from "../api/axios";
import ReportModal from "../components/ReportModal";

const myId = JSON.parse(localStorage.getItem("user") || "null")?.id;

function ReelCard({ reel }) {
  const [isLiked, setIsLiked] = useState(reel.likes?.some((u) => (u._id || u) === myId) || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [showReport, setShowReport] = useState(false);

  const toggleLike = async () => {
    const { data } = await API.post(`/reels/${reel._id}/like`);
    setIsLiked(data.isLiked);
    setLikesCount(data.likesCount);
  };

  return (
    <div className="h-screen w-full snap-start relative bg-black flex items-center justify-center">
      <video
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        autoPlay
        onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
      />

      <div className="absolute bottom-6 left-4 right-16 text-white">
        <p className="font-bold text-sm">@{reel.creator?.username}</p>
        {reel.caption && <p className="text-xs text-white/80 mt-1">{reel.caption}</p>}
      </div>

      <div className="absolute bottom-8 right-3 flex flex-col items-center gap-4">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart size={26} className={isLiked ? "fill-red-500 text-red-500" : "text-white"} />
          <span className="text-[10px] text-white">{likesCount}</span>
        </button>
        <button onClick={() => setShowReport(true)} className="flex flex-col items-center gap-1">
          <Flag size={24} className="text-white" />
          <span className="text-[10px] text-white">Report</span>
        </button>
      </div>

      {showReport && (
        <ReportModal targetType="reel" targetId={reel._id} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/reels?limit=20")
      .then(({ data }) => setReels(data.reels))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <button onClick={() => navigate(-1)} className="fixed top-4 left-4 z-50 bg-black/50 text-white rounded-full p-2">
        <ArrowLeft size={18} />
      </button>

      {loading && (
        <div className="h-screen flex items-center justify-center text-white text-sm">Loading...</div>
      )}
      {!loading && reels.length === 0 && (
        <div className="h-screen flex items-center justify-center text-white text-sm">No Reels yet.</div>
      )}

      <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
        {reels.map((reel) => (
          <ReelCard key={reel._id} reel={reel} />
        ))}
      </div>
    </div>
  );
}
