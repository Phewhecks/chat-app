import React, { useEffect, useState, useRef } from 'react';
import { connectSocket, getSocket } from '../services/socket';
import api from '../services/api';

export default function Chat({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ users: 0, chats: 0 });
  const chatRef = useRef();

  useEffect(() => {
    const s = connectSocket();

    function handleHistory(msgs) {
      setMessages(msgs);
    }

    function handleMessage(msg) {
      setMessages(prev => [...prev, msg]);
    }

    function handleUserJoin(d) {
      console.log(d.username + ' joined');
    }

    function handleUserLeft(d) {
      console.log(d.username + ' left');
    }

    s.on('chat:history', handleHistory);
    s.on('message', handleMessage);
    s.on('user:join', handleUserJoin);
    s.on('user:left', handleUserLeft);

    return () => {
      s.off('chat:history', handleHistory);
      s.off('message', handleMessage);
      s.off('user:join', handleUserJoin);
      s.off('user:left', handleUserLeft);
    };
  }, []);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data));
  }, [messages.length]);

  const send = () => {
    if (sending) return;
    if (!text.trim()) return;

    setSending(true);
    getSocket().emit('message', { text });
    setText('');
    setTimeout(() => setSending(false), 300);
  };

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md flex flex-col h-[700px]">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-blue-700">Welcome, {user.username}</h2>
        <button
  onClick={onLogout}
  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded shadow transition"
>
  Logout
</button>

      </div>

      {/* Stats */}
      <p className="text-sm text-gray-600 mb-5">
        Users online: <span className="font-semibold text-blue-600">{stats.users}</span> | Chats: <span className="font-semibold text-blue-600">{stats.chats}</span>
      </p>

      {/* Messages container */}
      <div
        ref={chatRef}
        className="flex-grow overflow-auto border border-blue-200 rounded-lg p-4 bg-blue-50 mb-5 shadow-inner flex flex-col gap-2"
      >
        {messages.map(m => (
          <div
            key={m._id}
            className={`max-w-[80%] p-3 rounded-md shadow-sm break-words ${
              m.username === user.username
                ? 'bg-blue-600 text-white self-end'
                : 'bg-white text-gray-900 border border-gray-300 self-start'
            }`}
          >
            <b>{m.username}</b>: {m.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <input
        className="border border-blue-300 rounded-md p-3 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="Type message..."
        disabled={sending}
        aria-label="Message input"
      />

      {/* Send Button */}
      <button
        onClick={send}
        disabled={sending}
        className={`w-full py-3 rounded-md font-semibold text-white transition-colors ${
          sending ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        aria-label="Send message"
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
