import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Trophy, Users, Zap, X, DollarSign, Crown, Car, CircleDot, FlaskConical } from "lucide-react";
import GamesAPI from "../api/gamesApi";
import API from "../api/axios";
import BottomNav from "../components/BottomNav";
import { formatCurrency } from "../utils/formatCurrency";

// These four match the model/controller/route/socket folders named in the
// Babylon description doc (ChessGame, RaceGame, PoolGame, BottleFlipGame).
const GAME_TYPES = [
  { id: "chess", label: "Chess", icon: Crown, color: "bg-neutral-800" },
  { id: "racing", label: "Racing", icon: Car, color: "bg-red-500" },
  { id: "pool", label: "Pool", icon: CircleDot, color: "bg-emerald-600" },
  { id: "bottleflip", label: "Bottle Flip", icon: FlaskConical, color: "bg-sky-500" },
];

const MATCH_MODES = [
  { id: "friendly", label: "Friendly", desc: "No stake, just for fun" },
  { id: "private", label: "Private w/ Friends", desc: "Invite-only lobby" },
  { id: "public", label: "Public Matchmaking", desc: "Random opponent" },
  { id: "stake", label: "Real-Money Match", desc: "Both players set a stake" },
];

const STAKE_PRESETS = [5, 10, 25, 50, 100];

function MatchmakingModal({ game, onClose, balance }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("friendly");
  const [stake, setStake] = useState(10);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const startMatch = async () => {
    setError("");
    if (mode === "stake" && stake > balance) {
      setError("Stake exceeds your wallet balance");
      return;
    }
    setSearching(true);
    try {
      // Assumed contract: POST /<gameType>/matchmake { mode, stake }
      // -> { matchId } once an opponent/room is ready (or a private lobby code)
      const { data } = await GamesAPI.post(`/${game.id}/matchmake`, {
        mode,
        stake: mode === "stake" ? stake : 0,
      });
      navigate(`/games/${game.id}/${data.matchId}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't find a match — try again");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <game.icon size={18} className="text-orange-500" /> {game.label}
          </h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            {MATCH_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`w-full text-left p-3 rounded-xl border-2 flex items-center justify-between ${
                  mode === m.id ? "border-orange-400 bg-orange-50/40" : "border-gray-100"
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </div>
                {m.id === "stake" && <DollarSign size={16} className="text-orange-500" />}
              </button>
            ))}
          </div>

          {mode === "stake" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Set your stake</p>
              <div className="grid grid-cols-5 gap-2">
                {STAKE_PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setStake(v)}
                    className={`rounded-xl py-2.5 border-2 font-black text-xs ${
                      stake === v ? "border-orange-400 bg-orange-50/40 text-orange-500" : "border-gray-100 text-gray-700"
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
                Balance: {formatCurrency(balance)} · winner takes stake x2 minus a 10% platform fee
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={startMatch}
            disabled={searching}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Zap size={16} /> {searching ? "Finding a match..." : "Find Match"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState(null);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState("play");

  useEffect(() => {
    API.get("/wallet/me").then(({ data }) => setBalance(data.balance)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "history") {
      // Assumed contract: GET /matches/history -> { matches: [...] }
      GamesAPI.get("/matches/history").then(({ data }) => setHistory(data.matches || [])).catch(() => setHistory([]));
    }
    if (tab === "leaderboard") {
      // Assumed contract: GET /matches/leaderboard -> { players: [...] }
      GamesAPI.get("/matches/leaderboard").then(({ data }) => setLeaderboard(data.players || [])).catch(() => setLeaderboard([]));
    }
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight text-gray-900">GAMES</span>
        <div className="flex items-center gap-1.5 bg-amber-50 text-orange-600 border border-amber-200/60 px-3 py-1.5 rounded-full text-xs font-semibold">
          <DollarSign size={14} />
          {formatCurrency(balance)}
        </div>
      </header>

      <div className="flex border-b border-gray-100 bg-white">
        {[
          { id: "play", label: "Play", icon: Gamepad2 },
          { id: "leaderboard", label: "Leaderboard", icon: Trophy },
          { id: "history", label: "History", icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-center border-b-2 text-xs font-bold flex items-center justify-center gap-1 ${
              tab === t.id ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400"
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-md mx-auto p-3">
        {tab === "play" && (
          <div className="grid grid-cols-2 gap-3">
            {GAME_TYPES.map((game) => (
              <button
                key={game.id}
                onClick={() => setActiveGame(game)}
                className={`${game.color} rounded-2xl p-4 aspect-square flex flex-col items-center justify-center gap-2 text-white`}
              >
                <game.icon size={32} />
                <span className="font-bold text-sm">{game.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="bg-white rounded-2xl divide-y divide-gray-50">
            {leaderboard.length === 0 && <p className="text-center text-xs text-gray-400 py-10">No leaderboard data yet.</p>}
            {leaderboard.map((p, i) => (
              <div key={p.id || i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-400 w-5">{i + 1}</span>
                  <span className="text-sm font-bold">{p.username}</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">{formatCurrency(p.totalWinnings || 0)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="bg-white rounded-2xl divide-y divide-gray-50">
            {history.length === 0 && <p className="text-center text-xs text-gray-400 py-10">No matches played yet.</p>}
            {history.map((m) => (
              <div key={m.matchId} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-bold capitalize">{m.gameType}</p>
                  <p className="text-xs text-gray-400">vs {m.opponentUsername}</p>
                </div>
                <span className={`text-xs font-bold ${m.result === "win" ? "text-emerald-600" : "text-red-500"}`}>
                  {m.result === "win" ? `+${formatCurrency(m.payout || 0)}` : "Loss"}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {activeGame && <MatchmakingModal game={activeGame} balance={balance} onClose={() => setActiveGame(null)} />}
      <BottomNav />
    </div>
  );
    }
