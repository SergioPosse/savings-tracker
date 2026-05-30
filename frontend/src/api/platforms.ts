import client from './client';
import type { Platform } from '../types';

export const getPlatforms = () => client.get<Platform[]>('/platforms').then(r => r.data);

export const createPlatform = (name: string, color: string) =>
  client.post<Platform>('/platforms', { name, color }).then(r => r.data);

export const updatePlatform = (id: number, name: string, color: string) =>
  client.put<Platform>(`/platforms/${id}`, { name, color }).then(r => r.data);

export const deletePlatform = (id: number) =>
  client.delete(`/platforms/${id}`).then(r => r.data);
