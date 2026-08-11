import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Download, Share2, Trash2, Scissors, Flag, X } from "lucide-react";
import API from "../api/axios";
import ReportModal from "../components/ReportModal";

const myId = JSON.parse(localStorage.getItem("user") || "null")?.id;

function CreateReelModal({ replay, videoRef, onClose }) {
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(Math.min(15, replay.duration || 15));
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const useCurrentTime = (setter) => {
    if (videoRef.current) setter(Math.floor(videoRef.current.currentTime));
  };

  const save = async () => {
    if (clipEnd <= clipStart) {
      alert("End time must be after start time");
      return;
    }
    setSaving(true);
    try {
      await API.post(`/reels/from-replay/${replay._id}`, { clipStart, clipEnd, caption });
      alert("Reel created! Check the Reels tab.");
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't create reel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-black text-gray-900 flex items-center gap-1.5">
            <Scissors size={16} className="text-orange-500" /> Create Reel
          </span>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400">START (sec)</label>
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                value={clipStart}
                onChange={(e) => setClipStart(Number(e.target.value))}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-orange-400"
              />
              <button onClick={() => useCurrentTime(setClipStart)} className="text-[10px] font-bold text-orange-500 whitespace-nowrap px-2">
                Use now
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400">END (sec)</label>
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                value={clipEnd}
                onChange={(e) => setClipEnd(Number(e.target.value))}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-orange-400"
              />
              <button onClick={() => useCurrentTime(setClipEnd)} className="text-[10px] font-bold text-orange-500 whitespace-nowrap px-2">
                Use now
              </button>
            </div>
          </div>
        </div>

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption for your Reel..."
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400"
        />

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl"
        >
          {saving ? "Creating..." : "Create Reel"}
        </button>
      </div>
    </div>
  );
}

export default function ReplayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showReelModal, setShowReelModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    API.get(`/replays/${id}`)
      .then(({ data }) => {
        setReplay(data.replay);
        setIsLiked(data.replay.likes?.some((u) => (u._id || u) === myId) || false);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const toggleLike = async () => {
    const { data } = await API.post(`/replays/${id}/like`);
    setIsLiked(data.isLiked);
    setReplay((r) => ({ ...r, likesCount: data.likesCount }));
  };

  const download = async () => {
    try {
      const { data } = await API.get(`/replays/${id}/download`);
      window.open(data.downloadUrl, "_blank");
    } catch (err) {
      alert(err?.response?.data?.message || "Download failed");
    }
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard");
  };

  const remove = async () => {
    if (!confirm("Delete this replay? This can't be undone.")) return;
    try {
      await API.delete(`/replays/${id}`);
      navigate("/replays");
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't delete replay");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white text-sm">Loading...</div>;
  }
  if (!replay) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white text-sm">Replay not found</div>;
  }

  const isOwner = (replay.creator?._id || replay.creator) === myId;

  return (
    <div className="min-h-screen bg-black">
      <div className="relative">
        <video
          ref={videoRef}
          src={replay.videoUrl}
          poster={replay.thumbnailUrl}
          controls
          className="w-full aspect-[9/16] max-h-screen bg-black"
        />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-black/50 text-white rounded-full p-2">
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-white font-bold text-sm">{replay.title || `${replay.creator?.username}'s replay`}</p>
          <p className="text-gray-400 text-xs">@{replay.creator?.username} · {replay.viewCount} views</p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button onClick={toggleLike} className="flex flex-col items-center gap-1">
            <Heart size={22} className={isLiked ? "fill-red-500 text-red-500" : "text-white"} />
            <span className="text-[10px] text-gray-400">{replay.likesCount}</span>
          </button>
          <button onClick={download} className="flex flex-col items-center gap-1">
            <Download size={22} className="text-white" />
            <span className="text-[10px] text-gray-400">Save</span>
          </button>
          <button onClick={share} className="flex flex-col items-center gap-1">
            <Share2 size={22} className="text-white" />
            <span className="text-[10px] text-gray-400">Share</span>
          </button>
          <button onClick={() => setShowReelModal(true)} className="flex flex-col items-center gap-1">
            <Scissors size={22} className="text-orange-500" />
            <span className="text-[10px] text-gray-400">Reel</span>
          </button>
          <button onClick={() => setShowReportModal(true)} className="flex flex-col items-center gap-1">
            <Flag size={22} className="text-white" />
            <span className="text-[10px] text-gray-400">Report</span>
          </button>
          {isOwner && (
            <button onClick={remove} className="flex flex-col items-center gap-1 ml-auto">
              <Trash2 size={22} className="text-red-500" />
              <span className="text-[10px] text-gray-400">Delete</span>
            </button>
          )}
        </div>
      </div>

      {showReelModal && (
        <CreateReelModal replay={replay} videoRef={videoRef} onClose={() => setShowReelModal(false)} />
      )}
      {showReportModal && (
        <ReportModal targetType="replay" targetId={replay._id} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
