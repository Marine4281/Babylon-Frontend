import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || "https://rps2-backend.onrender.com/api").replace(/\/api\/?$/, "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export function connectSocket() {
  const token = localStorage.getItem("token");
  if (!token) return;
  socket.auth = { token };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

export function joinConversation(conversationId) {
  if (socket.connected) socket.emit("join_conversation", conversationId);
}

export function leaveConversation(conversationId) {
  if (socket.connected) socket.emit("leave_conversation", conversationId);
}
