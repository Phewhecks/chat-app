import { io } from 'socket.io-client';
let socket;

export function connectSocket() {
  const token = localStorage.getItem('token');
  socket = io('http://localhost:4000', { query: { token } });
  return socket;
}

export function getSocket() {
  return socket;
}
