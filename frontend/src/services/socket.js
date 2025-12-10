import { io } from 'socket.io-client';

let socket;

export function connectSocket() {
  const token = localStorage.getItem('token');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;  // use import.meta.env here

  socket = io(backendUrl, { query: { token } });
  return socket;
}

export function getSocket() {
  return socket;
}
