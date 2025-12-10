import React, { useEffect, useState, useRef } from 'react';
import { connectSocket, getSocket } from '../services/socket';
import api from '../services/api';

export default function Chat({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ users: 0, chats: 0 });
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]); // list of usernames currently online
  const chatRef = useRef();
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const s = connectSocket();

    function handleHistory(msgs) {
      setMessages(msgs);
    }

    function handleMessage(msg) {
      setMessages(prev => [...prev, msg]);
    }

    function handleOnlineUpdate(d) {
      // expected payload: { users: [username1, username2, ...] }
      if (!d || !Array.isArray(d.users)) return;
      setOnlineUsers(d.users);
    }

    function handleUserJoin(d) {
      console.log(d.username + ' joined');
    }

    function handleUserLeft(d) {
      console.log(d.username + ' left');
    }

    function handleHistoryDeleted() {
      setMessages([]);
      setTypingUsers([]);
    }


    function handleUserTyping(d) {
      if (!d || !d.username) return;
      if (d.username === user.username) return;

      setTypingUsers(prev => {
        const exists = prev.includes(d.username);
        if (d.typing) {
          if (exists) return prev;
          return [...prev, d.username];
        } else {
          if (!exists) return prev;
          return prev.filter(u => u !== d.username);
        }
      });
    }

    s.on('chat:history', handleHistory);
    s.on('message', handleMessage);
    s.on('user:join', handleUserJoin);
    s.on('user:left', handleUserLeft);
    s.on('user:typing', handleUserTyping);
    s.on('online:update', handleOnlineUpdate);
    s.on('history:deleted', handleHistoryDeleted);

    return () => {
      s.off('chat:history', handleHistory);
      s.off('message', handleMessage);
      s.off('user:join', handleUserJoin);
      s.off('user:left', handleUserLeft);
      s.off('user:typing', handleUserTyping);
      s.off('online:update', handleOnlineUpdate);
      s.off('history:deleted', handleHistoryDeleted);
      try { getSocket()?.emit('typing', { typing: false }); } catch(e) {}
    };
  }, [user.username]);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data));
  }, [messages.length]);

  const send = () => {
    if (sending) return;
    if (!text.trim()) return;

    setSending(true);
    getSocket().emit('message', { text });
    setText('');
    emitTyping(false);
    setTimeout(() => setSending(false), 300);
  };

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const loadHistory = (limit = 50) => {
    try {
      // ask the server to send history via socket -> server should respond with 'chat:history'
      getSocket()?.emit('get:history', { limit });
    } catch (e) {
      console.error('Failed to request history', e);
      // fallback: alert or handle gracefully
    }
  };

  const deleteHistory = async () => {
    const ok = window.confirm('Delete ALL chat history for everyone? This cannot be undone. Continue?');
    if (!ok) return;

    try {
      // axios delete with body uses the `data` field
      await api.delete('/messages', { data: { confirm: true } });
      // server will emit 'history:deleted' to all clients; handleHistoryDeleted will clear UI
    } catch (err) {
      console.error('Failed to delete history', err);
      alert('Failed to delete history. Check console for details.');
    }
  };

  const emitTyping = (isTyping) => {
    try {
      getSocket()?.emit('typing', { typing: !!isTyping });
      isTypingRef.current = !!isTyping;
    } catch (e) {}
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (!isTypingRef.current) {
      emitTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1500);
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return <div className="text-sm text-gray-600 mb-2">{typingUsers[0]} is typing...</div>;
    return <div className="text-sm text-gray-600 mb-2">{typingUsers.length} users are typing...</div>;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md flex flex-col h-[700px]">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-blue-700">Welcome, {user.username}</h2>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded shadow transition"
        >
          Logout
        </button>
      </div>
      

      <p className="text-sm text-gray-600 mb-5">
        Users online: <span className="font-semibold text-blue-600">{onlineUsers.length}</span> | Chats: <span className="font-semibold text-blue-600">{stats.chats}</span>
      </p>
      {onlineUsers.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">Online: {onlineUsers.join(', ')}</p>
      )}

      <div
        ref={chatRef}
        className="flex-grow overflow-auto border border-blue-200 rounded-lg p-4 bg-blue-50 mb-2 shadow-inner flex flex-col gap-2"
      >
        {messages.length === 0 && (
         <div className="mb-3 flex gap-3 items-center">
          <button
            onClick={() => loadHistory(50)}
            className="text-sm text-blue-600 hover:underline"
            aria-label="Load chat history"
            title="Load previous messages (only if you want to see them)"
          >
            Load history
          </button>

          <button
            onClick={deleteHistory}
            className="text-sm text-red-600 hover:underline"
            aria-label="Delete chat history"
            title="Delete all chat history for everyone (requires confirmation)"
          >
            Delete history
          </button>
        </div>
      )}
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

      {renderTypingIndicator()}

      <input
        className="border border-blue-300 rounded-md p-3 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        value={text}
        onChange={handleInputChange}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="Type message..."
        disabled={sending}
        aria-label="Message input"
      />

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