// Centralized API Configuration
// Change this value to update the backend port across the entire application
export const API_CONFIG = {
  // Backend server configuration
  BACKEND_PORT: 8000,
  BACKEND_HOST: 'localhost',
  BACKEND_PROTOCOL: 'http',
  WS_PROTOCOL: 'ws',
  
  // API endpoints
  SIM_BASE_PATH: '/sim',
  CHART_BASE_PATH: '/chart_data',
  
  // Timeouts
  REQUEST_TIMEOUT: 10000, // 10 seconds
  WS_RECONNECT_DELAY: 3000, // 3 seconds
  
  // Cache settings
  CACHE_DURATION: 30000, // 30 seconds
  MAX_CACHE_SIZE: 100, // Maximum number of cached items
};

// Helper functions to generate URLs
export const getBackendUrl = (path = '') => {
  const { BACKEND_PROTOCOL, BACKEND_HOST, BACKEND_PORT } = API_CONFIG;
  return `${BACKEND_PROTOCOL}://${BACKEND_HOST}:${BACKEND_PORT}${path}`;
};

export const getWebSocketUrl = (path = '') => {
  const { WS_PROTOCOL, BACKEND_HOST, BACKEND_PORT } = API_CONFIG;
  return `${WS_PROTOCOL}://${BACKEND_HOST}:${BACKEND_PORT}${path}`;
};

export const getSimApiUrl = (endpoint = '') => {
  return getBackendUrl(`${API_CONFIG.SIM_BASE_PATH}${endpoint}`);
};

export const getChartApiUrl = (endpoint = '') => {
  return getBackendUrl(`${API_CONFIG.CHART_BASE_PATH}${endpoint}`);
};

// Environment-specific overrides
export const getApiConfig = () => {
  const env = import.meta.env.MODE;
  
  // Override with environment variables if available
  const config = { ...API_CONFIG };
  
  if (import.meta.env.VITE_BACKEND_PORT) {
    config.BACKEND_PORT = parseInt(import.meta.env.VITE_BACKEND_PORT);
  }
  
  if (import.meta.env.VITE_BACKEND_HOST) {
    config.BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST;
  }
  
  if (import.meta.env.VITE_BACKEND_PROTOCOL) {
    config.BACKEND_PROTOCOL = import.meta.env.VITE_BACKEND_PROTOCOL;
  }
  
  return config;
};

// Export the current configuration
export const currentConfig = getApiConfig(); 