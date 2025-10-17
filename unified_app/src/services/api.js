import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Trading related API calls
export const tradingApi = {
  // Market Data
  getMarketOverview: () => api.get('/market/overview'),
  getStockQuote: (symbol) => api.get(`/market/quote/${symbol}`),
  getStockChart: (symbol, interval) => api.get(`/market/chart/${symbol}`, { params: { interval } }),
  
  // Portfolio
  getPortfolio: () => api.get('/portfolio'),
  getPositions: () => api.get('/portfolio/positions'),
  getWatchlist: () => api.get('/portfolio/watchlist'),
  
  // Trading
  placeOrder: (orderData) => api.post('/trading/order', orderData),
  cancelOrder: (orderId) => api.delete(`/trading/order/${orderId}`),
  getOrders: () => api.get('/trading/orders'),
  
  // Account
  getAccountInfo: () => api.get('/account/info'),
  getAccountBalance: () => api.get('/account/balance'),
  getTransactionHistory: () => api.get('/account/transactions'),
};

export default tradingApi;
