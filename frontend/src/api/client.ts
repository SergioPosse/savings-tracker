import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export function setAuthCredentials(username: string, password: string) {
  const encoded = btoa(`${username}:${password}`);
  client.defaults.headers.common['Authorization'] = `Basic ${encoded}`;
}

export default client;
