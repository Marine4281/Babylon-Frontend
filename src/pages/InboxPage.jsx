import { useState, useEffect, useRef } from "react";
import { PenSquare, X, Send, DollarSign } from "lucide-react";
import API from "../api/axios";
import BottomNav from "../components/BottomNav";
import { formatRelativeTime } from "../utils/formatDate";
import { connectSocket, joinConversation, leaveConversation, socket } from "../utils/socket";

const myId = JSON.parse(localStorage.getItem("user") || "null")?.id;

function Avatar({ url, name, size = 44 }) {
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

function ChatWindow({ conversation, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const other = !conversation.isGroup ? conversation.participants.find((p) => p._id !== myId) : null;
  const title = conversation.isGroup ? conversation.groupName : other?.username;

  useEffect(() => {
    setLoading(true);
    API.get(`/conversations/${conversation._id}/messages`)
      .then(({ data }) => setMessages(data.messages))
      .finally(() => setLoading(false));
    API.patch(`/conversations/${conversation._id}/read`).catch(() => {});

    connectSocket();
    joinConversation(conversation._id);
    const onNewMessage = (msg) => {
      if (msg.conversation === conversation._id || msg.conversation?._id === conversation._id) {
        setMessages((m) => [...m, msg]);
      }
    };
    socket.on("new_message", onNewMessage);
    return () => {
      leaveConversation(conversation._id);
      socket.off("new_message", onNewMessage);
    };
  }, [conversation._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const body = text;
    setText("");
    const { data } = await API.post(`/conversations/${conversation._id}/messages`, { text: body });
    setMessages((m) => [...m, data]);
  };

  const sendMoney = async () => {
    if (conversation.isGroup) return alert("Direct transfers aren't supported in group chats");
    const amount = prompt(`Send money to @${other?.username} ($):`, "10");
    if (!amount || isNaN(amount)) return;
    try {
      const { data } = await API.post(`/conversations/${conversation._id}/transfer`, { amount: Number(amount) });
      setMessages((m) => [...m, data]);
    } catch (err) {
      alert(err?.response?.data?.message || "Transfer failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {!conversation.isGroup && <Avatar url={other?.avatarUrl} name={other?.username} size={36} />}
          <span className="font-bold text-sm">{title}</span>
        </div>
        <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {loading && <p className="text-center text-xs text-gray-400">Loading...</p>}
        {messages.map((m) => {
          const mine = (m.sender?._id || m.sender) === myId;
          return (
            <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.isMoneyTransfer
                    ? "bg-amber-50 border border-amber-200 text-amber-700 font-semibold"
                    : mine
                    ? "bg-orange-500 text-white"
                    : "bg-white border border-gray-100"
                }`}
              >
                {m.isMoneyTransfer && <DollarSign size={14} className="inline mr-1 -mt-0.5" />}
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
        <button onClick={sendMoney} className="text-orange-500 shrink-0"><DollarSign size={20} /></button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message..."
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-orange-400"
        />
        <button onClick={send} className="text-orange-500 shrink-0"><Send size={20} /></button>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [tab, setTab] = useState("dms");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    API.get("/conversations")
      .then(({ data }) => setConversations(data.conversations))
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter((c) => (tab === "dms" ? !c.isGroup : c.isGroup));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight text-gray-900">MESSAGES</span>
        <button className="text-gray-700"><PenSquare size={18} /></button>
      </header>

      <div className="flex border-b border-gray-100 bg-white sticky top-[57px] z-20">
        {[
          { id: "dms", label: "Direct Messages" },
          { id: "groups", label: "Group Chats" },
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

      <main className="max-w-md mx-auto bg-white min-h-screen divide-y divide-gray-50">
        {loading && <p className="text-center text-xs text-gray-400 py-10">Loading...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-10">
            {tab === "dms" ? "No conversations yet." : "No group chats yet."}
          </p>
        )}
        {filtered.map((c) => {
          const other = !c.isGroup ? c.participants.find((p) => p._id !== myId) : null;
          return (
            <div
              key={c._id}
              onClick={() => setActive(c)}
              className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar url={c.isGroup ? c.groupAvatarUrl : other?.avatarUrl} name={c.isGroup ? c.groupName : other?.username} />
                <div className="min-w-0">
                  <span className="font-bold text-sm text-gray-900 truncate block">
                    {c.isGroup ? c.groupName : other?.username}
                  </span>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessageText || "No messages yet"}</p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0 pl-2">
                {c.lastMessageAt && formatRelativeTime(c.lastMessageAt)}
              </span>
            </div>
          );
        })}
      </main>

      {active && <ChatWindow conversation={active} onClose={() => setActive(null)} />}
      <BottomNav />
    </div>
  );
                  }
