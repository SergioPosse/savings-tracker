import axios from 'axios';

export async function login(username: string, password: string) {
  const res = await axios.post('/api/auth/login', { username, password });
  return res.data as { success: boolean; userId: number; username: string };
}

export async function register(username: string, password: string) {
  const res = await axios.post('/api/auth/register', { username, password });
  return res.data as { success: boolean; userId: number; username: string };
}
