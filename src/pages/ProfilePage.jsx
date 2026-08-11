import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Wallet, ArrowDownCircle, ArrowUpCircle, Send, BadgeCheck, Camera } from "lucide-react";
import API from "../api/axios";
import BottomNav from "../components/BottomNav";
import { formatCurrency } from "../utils/formatCurrency";

function initials(name = "") {
  return (name.trim()[0] || "U").toUpperCase();
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!storedUser?.username) return;
    Promise.all([API.get(`/users/${storedUser.username}`), API.get("/wallet/me")])
      .then(([profileRes, walletRes]) => {
        setProfile(profileRes.data);
        setBalance(walletRes.data.balance);
      })
      .finally(() => setLoading(false));
  }, [storedUser?.username]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const { data } = await API.post("/users/me/avatar", formData);
      setProfile((p) => ({ ...p, avatarUrl: data.avatarUrl }));
    } catch (err) {
      alert(err?.response?.data?.message || "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const uploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("cover", file);
      const { data } = await API.post("/users/me/cover-photo", formData);
      setProfile((p) => ({ ...p, coverPhotoUrl: data.coverPhotoUrl }));
    } catch (err) {
      alert(err?.response?.data?.message || "Cover photo upload failed");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const walletAction = async (type) => {
    if (type === "deposit") {
      const amount = prompt("Amount to deposit ($):", "50");
      if (!amount || isNaN(amount)) return;
      setBusy(true);
      try {
        const { data } = await API.post("/wallet/deposit", { amount: Number(amount) });
        setBalance(data.balance);
      } catch (err) {
        alert(err?.response?.data?.message || "Deposit failed");
      } finally {
        setBusy(false);
      }
    } else if (type === "withdraw") {
      const amount = prompt("Amount to withdraw ($):", "20");
      if (!amount || isNaN(amount)) return;
      setBusy(true);
      try {
        const { data } = await API.post("/wallet/withdraw", { amount: Number(amount) });
        setBalance(data.balance);
      } catch (err) {
        alert(err?.response?.data?.message || "Withdraw failed");
      } finally {
        setBusy(false);
      }
    } else if (type === "transfer") {
      const username = prompt("Recipient username:");
      if (!username) return;
      const amount = prompt("Amount to send ($):", "10");
      if (!amount || isNaN(amount)) return;
      setBusy(true);
      try {
        const { data } = await API.post("/wallet/transfer", { username, amount: Number(amount) });
        setBalance(data.balance);
        alert(`Sent $${Number(amount).toFixed(2)} to @${username}`);
      } catch (err) {
        alert(err?.response?.data?.message || "Transfer failed");
      } finally {
        setBusy(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <p className="text-xs text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight text-gray-900">MY IDENTITY</span>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-md mx-auto bg-white min-h-screen">
        <div className="relative">
          <div className="h-28 bg-gradient-to-r from-orange-400 to-orange-500 overflow-hidden">
            {profile?.coverPhotoUrl && (
              <img src={profile.coverPhotoUrl} alt="Cover" className="w-full h-full object-cover opacity-70" />
            )}
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" onChange={uploadCover} className="hidden" />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute top-2 right-2 bg-black/40 hover:bg-black/55 text-white rounded-full p-2 disabled:opacity-60"
          >
            <Camera size={14} />
          </button>

          <div className="absolute top-16 left-4 p-1 bg-white rounded-full shadow-md">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-orange-100 text-orange-600 font-black text-2xl flex items-center justify-center">
                {initials(profile?.fullName || profile?.username)}
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-1.5 disabled:opacity-60"
            >
              <Camera size={11} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-8 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-black tracking-tight">{profile?.username}</h2>
            {profile?.countryCode && <span className="text-sm">{profile.countryCode}</span>}
            {profile?.isVerified && <BadgeCheck size={16} className="text-orange-500" />}
          </div>
          {profile?.bio && <p className="text-xs text-gray-700 leading-relaxed pt-1">{profile.bio}</p>}

          <div className="flex items-center gap-4 pt-2.5 text-xs">
            <span className="text-gray-500">
              <strong className="text-gray-900 font-bold">{profile?.followingCount ?? 0}</strong> Following
            </span>
            <span className="text-gray-500">
              <strong className="text-gray-900 font-bold">{profile?.followersCount ?? 0}</strong> Followers
            </span>
            <span className="text-gray-500">
              <strong className="text-gray-900 font-bold">{profile?.postsCount ?? 0}</strong> Posts
            </span>
          </div>
        </div>

        <div className="mx-4 mt-5 p-4 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl text-white space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Babylon Core Wallet</span>
              <h3 className="text-2xl font-black tracking-tight">{formatCurrency(balance)}</h3>
            </div>
            <div className="bg-white/10 p-2.5 rounded-xl text-orange-500">
              <Wallet size={20} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              disabled={busy}
              onClick={() => walletAction("deposit")}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"
            >
              <ArrowDownCircle size={14} /> Deposit
            </button>
            <button
              disabled={busy}
              onClick={() => walletAction("withdraw")}
              className="bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"
            >
              <ArrowUpCircle size={14} /> Withdraw
            </button>
            <button
              disabled={busy}
              onClick={() => walletAction("transfer")}
              className="bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"
            >
              <Send size={14} /> P2P Send
            </button>
          </div>
        </div>

        <div className="px-4 mt-6 py-10 text-center text-gray-400 text-xs">
          Post, broadcast, and saved grids will appear here once the backend exposes
          per-user listing endpoints.
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
