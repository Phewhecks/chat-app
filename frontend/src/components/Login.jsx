import React, { useState } from 'react';
import api from '../services/api';

export default function Login({ onLogin }) {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [registerMode, setReg] = useState(false);
  const [error, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const path = registerMode ? '/auth/register' : '/auth/login';
    try {
      const res = await api.post(path, { username, password });
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.user);
    } catch (err) {
      setErr(err.response?.data?.message || 'Error');
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">{registerMode ? 'Register' : 'Login'}</h2>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input className="border p-2 w-full" value={username} onChange={e=>setU(e.target.value)} placeholder="Username" />
        <input className="border p-2 w-full" type="password" value={password} onChange={e=>setP(e.target.value)} placeholder="Password" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-full">{registerMode ? 'Sign Up' : 'Login'}</button>
      </form>
      <button onClick={()=>setReg(!registerMode)} className="text-sm text-blue-500 mt-2 underline">
        {registerMode ? 'Already have an account?' : 'Create one'}
      </button>
    </div>
  );
}

