import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginPage({ setUserRole }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      if (response.data.status === 'success') {
        setLoginStatus('Login successful!');
        setUserRole(response.data.role);
        navigate('/upload');
      } else {
        setLoginStatus('Login failed. Invalid credentials.');
      }
    } catch (error) {
      setLoginStatus('Login error. Backend unreachable or CORS issue.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      <p>{loginStatus}</p>
    </div>
  );
}

export default LoginPage;