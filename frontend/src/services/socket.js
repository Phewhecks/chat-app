import { io } from 'socket.io-client';

let socket;

export function connectSocket() {
  const token = localStorage.getItem('token');
  const backendUrl = process.env.REACT_APP_BACKEND_URL; // dynamically use backend URL

  socket = io(backendUrl, { query: { token } });
  return socket;
}

export function getSocket() {
  return socket;
}
