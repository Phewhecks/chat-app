import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import api from './services/api';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.get('/users/me').then(r => setUser(r.data)).catch(()=>localStorage.removeItem('token'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded shadow p-4 w-full max-w-md">
        {user ? <Chat user={user} onLogout={()=>{localStorage.removeItem('token');setUser(null)}} /> : <Login onLogin={setUser}/>}
      </div>
    </div>
  );
}
