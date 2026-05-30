import client from './client';
import type { Asset, PricesData, Transaction } from '../types';

export const getAssets = () => client.get<Asset[]>('/assets').then(r => r.data);
export const getPrices = () => client.get<PricesData>('/prices').then(r => r.data);
export const createAsset = (data: Partial<Asset>) => client.post<Asset>('/assets', data).then(r => r.data);
export const addQuantity = (id: number, amount: number, note?: string) =>
  client.post<Asset>(`/assets/${id}/add`, { amount, note }).then(r => r.data);
export const updateAsset = (id: number, data: Partial<Asset>) =>
  client.put<Asset>(`/assets/${id}`, data).then(r => r.data);
export const deleteAsset = (id: number) => client.delete(`/assets/${id}`).then(r => r.data);
export const getTransactions = (id: number) =>
  client.get<Transaction[]>(`/assets/${id}/transactions`).then(r => r.data);
