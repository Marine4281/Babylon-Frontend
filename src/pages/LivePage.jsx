import { useState, useEffect, useRef, useCallback } from "react";
import { Radio, Video, Mic, Gift, X, Hand, Users, LogOut } from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import API from "../api/axios";
import BottomNav from "../components/BottomNav";
import { formatCurrency } from "../utils/formatCurrency";
import { connectSocket, joinLiveSocketRoom, leaveLiveSocketRoom, socket } from "../utils/socket";

const myId = JSON.parse(localStorage.getItem("user") || "null")?.id;
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

function GiftBar({ roomId, balance, onSent }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const { data } = await API.post(`/live/${roomId}/gift`, { amount, message: msg });
      onSent(amount, data.balance);
      setOpen(false);
      setMsg("");
    } catch (err) {
      alert(err?.response?.data?.message || "Gift failed");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 shadow-lg"
      >
        <Gift size={20} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 space-y-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Send a gift</span>
        <button onClick={() => setOpen(false)}><X size={18} className="text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {GIFT_PRESETS.map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`rounded-xl py-2.5 border-2 font-black text-sm ${
              amount === v ? "border-orange-400 bg-orange-50/40 text-orange-500" : "border-gray-100 text-gray-700"
            }`}
          >
            ${v}
          </button>
        ))}
      </div>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Add a message..."
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400"
      />
      <p className="text-[10px] text-gray-400">Balance: {formatCurrency(balance)}</p>
      <button
        onClick={send}
        disabled={sending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl"
      >
        {sending ? "Sending..." : `Send $${amount}.00`}
      </button>
    </div>
  );
}

function LiveRoomView({ room, isHost, onClose, onEnded, balance, setBalance }) {
  const client = useRef(null);
  const [remoteVideo, setRemoteVideo] = useState(null);
  const [viewerCount, setViewerCount] = useState(room.viewerCount || 0);
  const [gifts, setGifts] = useState([]);
  const [speakers, setSpeakers] = useState(room.speakers || []);
  const [speakerRequests, setSpeakerRequests] = useState([]);
  const [requestedToSpeak, setRequestedToSpeak] = useState(false);
  const videoContainerRef = useRef(null);

  const iAmPublisher =
    isHost || (room.type === "voice" && speakers.some((s) => (s._id || s) === myId));

  useEffect(() => {
    let mounted = true;

    async function joinAgora() {
      const endpoint = isHost ? null : `/live/${room._id}/join`;
      let agora = room.agora;

      if (endpoint) {
        const { data } = await API.post(endpoint);
        agora = data.agora;
        setViewerCount(data.room.viewerCount);
      }

      const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      client.current = agoraClient;
      await agoraClient.setClientRole(agora.role === "publisher" ? "host" : "audience");
      await agoraClient.join(agora.appId, agora.channelName, agora.token, agora.uid);

      if (agora.role === "publisher") {
        const tracks = [];
        if (room.type === "video") {
          const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          tracks.push(micTrack, camTrack);
          if (mounted && videoContainerRef.current) camTrack.play(videoContainerRef.current);
        } else {
          const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
          tracks.push(micTrack);
        }
        await agoraClient.publish(tracks);
        client.current._localTracks = tracks;
      }

      agoraClient.on("user-published", async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        if (mediaType === "video" && mounted) {
          setRemoteVideo(user.videoTrack);
          setTimeout(() => user.videoTrack.play(videoContainerRef.current), 50);
        }
        if (mediaType === "audio") user.audioTrack.play();
      });
    }

    joinAgora().catch((err) => console.error("Agora join failed:", err));

    connectSocket();
    joinLiveSocketRoom(room._id);

    const onViewerJoined = (p) => p.roomId === room._id && setViewerCount(p.viewerCount);
    const onViewerLeft = (p) => p.roomId === room._id && setViewerCount(p.viewerCount);
    const onGift = (p) => p.roomId === room._id && setGifts((g) => [...g.slice(-4), p]);
    const onEnd = (p) => p.roomId === room._id && onEnded();
    const onSpeakRequested = (p) => p.roomId === room._id && setSpeakerRequests((r) => [...r, p.user]);
    const onSpeakerApproved = (p) => p.roomId === room._id && setSpeakers((s) => [...s, { _id: p.userId }]);
    const onSpeakerRemoved = (p) =>
      p.roomId === room._id && setSpeakers((s) => s.filter((sp) => (sp._id || sp) !== p.userId));

    socket.on("live:viewer_joined", onViewerJoined);
    socket.on("live:viewer_left", onViewerLeft);
    socket.on("live:gift", onGift);
    socket.on("live:ended", onEnd);
    socket.on("live:speak_requested", onSpeakRequested);
    socket.on("live:speaker_approved", onSpeakerApproved);
    socket.on("live:speaker_removed", onSpeakerRemoved);

    return () => {
      mounted = false;
      leaveLiveSocketRoom(room._id);
      socket.off("live:viewer_joined", onViewerJoined);
      socket.off("live:viewer_left", onViewerLeft);
      socket.off("live:gift", onGift);
      socket.off("live:ended", onEnd);
      socket.off("live:speak_requested", onSpeakRequested);
      socket.off("live:speaker_approved", onSpeakerApproved);
      socket.off("live:speaker_removed", onSpeakerRemoved);

      client.current?._localTracks?.forEach((t) => {
        t.stop();
        t.close();
      });
      client.current?.leave().catch(() => {});

      if (!isHost) API.post(`/live/${room._id}/leave`).catch(() => {});
    };
  }, [room._id]);

  const requestSpeak = async () => {
    try {
      await API.post(`/live/voice/${room._id}/request-speak`);
      setRequestedToSpeak(true);
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't request the mic");
    }
  };

  const approveSpeaker = async (userId) => {
    await API.post(`/live/voice/${room._id}/approve-speak/${userId}`);
    setSpeakerRequests((r) => r.filter((u) => u.id !== userId));
  };

  const endRoom = async () => {
    await API.post(`/live/${room._id}/end`);
    onEnded();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div ref={videoContainerRef} className="flex-1 relative bg-neutral-900">
        {room.type === "voice" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <Avatar url={room.host?.avatarUrl} name={room.host?.username} size={72} />
            <span className="text-white font-bold">{room.host?.username}'s voice room</span>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {speakers.map((s) => (
                <div key={s._id || s} className="flex flex-col items-center gap-1">
                  <Avatar url={s.avatarUrl} name={s.username || "Speaker"} size={44} />
                  <span className="text-[10px] text-white/70">{s.username || "Speaker"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <Avatar url={room.host?.avatarUrl} name={room.host?.username} size={32} />
            <span className="text-sm font-bold">{room.host?.username}</span>
            <span className="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Radio size={10} /> LIVE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white text-xs flex items-center gap-1">
              <Users size={14} /> {viewerCount}
            </span>
            <button onClick={onClose} className="text-white"><X size={22} /></button>
          </div>
        </div>

        <div className="absolute bottom-24 left-4 space-y-1.5">
          {gifts.map((g, i) => (
            <div key={i} className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Gift size={12} className="text-orange-400" />
              <strong>{g.from.username}</strong> sent ${g.amount.toFixed(2)} {g.message}
            </div>
          ))}
        </div>

        {isHost && room.type === "voice" && speakerRequests.length > 0 && (
          <div className="absolute top-16 right-4 bg-white rounded-xl p-2 space-y-1.5 shadow-lg">
            {speakerRequests.map((u) => (
              <button
                key={u.id}
                onClick={() => approveSpeaker(u.id)}
                className="flex items-center gap-2 text-xs font-semibold px-2 py-1 hover:bg-orange-50 rounded-lg"
              >
                <Avatar url={u.avatarUrl} name={u.username} size={22} /> Approve @{u.username}
              </button>
            ))}
          </div>
        )}

        {!isHost && room.type === "voice" && !iAmPublisher && (
          <button
            onClick={requestSpeak}
            disabled={requestedToSpeak}
            className="absolute bottom-4 left-4 bg-white/90 disabled:opacity-60 text-gray-900 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5"
          >
            <Hand size={14} /> {requestedToSpeak ? "Requested" : "Raise Hand"}
          </button>
        )}

        {isHost ? (
          <button
            onClick={endRoom}
            className="absolute bottom-4 right-4 bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5"
          >
            <LogOut size={14} /> End Live
          </button>
        ) : (
          <GiftBar roomId={room._id} balance={balance} onSent={(amt, bal) => setBalance(bal)} />
        )}
      </div>
    </div>
  );
}

export default function LivePage() {
  const [tab, setTab] = useState("voice");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isHostView, setIsHostView] = useState(false);
  const [balance, setBalance] = useState(0);

  const loadRooms = useCallback((type) => {
    setLoading(true);
    API.get(`/live?type=${type}`)
      .then(({ data }) => setRooms(data.rooms))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRooms(tab);
    API.get("/wallet/me").then(({ data }) => setBalance(data.balance)).catch(() => {});
  }, [tab, loadRooms]);

  const goLive = async () => {
    const title = prompt(`Title for your ${tab} room:`, "") || "";
    try {
      const { data } = await API.post(`/live/${tab}`, { title });
      setIsHostView(true);
      setActiveRoom(data.room ? { ...data.room, agora: data.agora } : { ...data, agora: data.agora });
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't start live room");
    }
  };

  const watchRoom = (room) => {
    setIsHostView(false);
    setActiveRoom(room);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight text-gray-900">LIVE</span>
        <button
          onClick={goLive}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5"
        >
          {tab === "voice" ? <Mic size={14} /> : <Video size={14} />} Go Live
        </button>
      </header>

      <div className="flex border-b border-gray-100 bg-white">
        {[
          { id: "voice", label: "Voice Rooms" },
          { id: "video", label: "Livestreams" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3.5 text-center border-b-2 text-xs font-bold ${
              tab === t.id ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-md mx-auto p-3 grid grid-cols-2 gap-3">
        {loading && <p className="col-span-2 text-center text-xs text-gray-400 py-10">Loading...</p>}
        {!loading && rooms.length === 0 && (
          <p className="col-span-2 text-center text-xs text-gray-400 py-10">No one's live right now.</p>
        )}
        {rooms.map((room) => (
          <button
            key={room._id}
            onClick={() => watchRoom(room)}
            className="bg-neutral-900 rounded-xl overflow-hidden relative aspect-[3/4] text-left"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar url={room.host?.avatarUrl} name={room.host?.username} size={48} />
            </div>
            <span className="absolute top-2 left-2 bg-red-500 text-[9px] font-bold text-white px-1.5 py-0.5 rounded flex items-center gap-1">
              <Radio size={9} /> LIVE
            </span>
            <span className="absolute top-2 right-2 bg-black/60 text-[9px] font-bold text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Users size={9} /> {room.viewerCount}
            </span>
            <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-bold truncate">
              {room.title || `${room.host?.username}'s room`}
            </div>
          </button>
        ))}
      </main>

      {activeRoom && (
        <LiveRoomView
          room={activeRoom}
          isHost={isHostView}
          balance={balance}
          setBalance={setBalance}
          onClose={() => setActiveRoom(null)}
          onEnded={() => {
            setActiveRoom(null);
            loadRooms(tab);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
    }
