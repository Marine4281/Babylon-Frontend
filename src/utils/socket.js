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

// room = a conversation id, OR `live_<roomId>` for a live room —
// the server's single join_room/leave_room handler branches on the prefix.
export function joinRoom(room) {
  if (socket.connected) socket.emit("join_room", room);
}

export function leaveRoom(room) {
  if (socket.connected) socket.emit("leave_room", room);
}

// Convenience wrappers used by InboxPage
export const joinConversation = (id) => joinRoom(id);
export const leaveConversation = (id) => leaveRoom(id);

// Convenience wrappers used by LivePage
export const joinLiveSocketRoom = (roomId) => joinRoom(`live_${roomId}`);
export const leaveLiveSocketRoom = (roomId) => leaveRoom(`live_${roomId}`);
