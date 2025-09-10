import axios from 'axios';
import { getBackendUrl, getWebSocketUrl, getChartApiUrl, currentConfig } from '../config/api';

class ChartDataService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.websocket = null;
    this.isConnected = false;
  }

  // Get chart data for a symbol and interval
  async getChartData(symbol, interval = '30s', days = 7, sessionId = null) {
    const cacheKey = `${symbol}-${interval}-${days}-${sessionId || 'no-session'}`;
    
    console.log(`🔍 ChartDataService: Getting chart data for ${symbol}`);
    console.log(`🔍 ChartDataService: Cache key: ${cacheKey}`);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < currentConfig.CACHE_DURATION) {
        console.log(`✅ ChartDataService: Using cached data for ${symbol}`);
        return cached.data;
      } else {
        console.log(`🔄 ChartDataService: Cache expired for ${symbol}`);
      }
    }

    try {
      const params = { interval, days };
      if (sessionId) {
        params.session_id = sessionId;
      }
      
      console.log(`🔍 ChartDataService: Making API call for ${symbol} with params:`, params);
      const response = await axios.get(getChartApiUrl(`/${symbol}`), { params });

      console.log(`🔍 ChartDataService: API response for ${symbol}:`, response);

      const data = response.data.data || [];
      
      console.log(`🔍 ChartDataService: Extracted data for ${symbol}:`, data);
      console.log(`🔍 ChartDataService: Data length:`, data.length);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      console.log(`✅ ChartDataService: Successfully got ${data.length} data points for ${symbol}`);
      return data;
    } catch (error) {
      console.error(`❌ ChartDataService: Error fetching chart data for ${symbol}:`, error);
      console.error(`❌ ChartDataService: Error response:`, error.response?.data);
      return [];
    }
  }

  // Get chart data by tick range
  async getChartDataByRange(symbol, startTick, endTick, interval = '30s') {
    try {
      const response = await axios.get(getChartApiUrl(`/${symbol}/range`), {
        params: { start_tick: startTick, end_tick: endTick, interval }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching chart data by range:', error);
      return [];
    }
  }

  // Get specific tick data
  async getTickData(symbol, tick, interval = '30s') {
    try {
      const response = await axios.get(getChartApiUrl(`/${symbol}/tick/${tick}`), {
        params: { interval }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching tick data:', error);
      return null;
    }
  }

  // Get available intervals
  async getAvailableIntervals() {
    try {
      const response = await axios.get(getChartApiUrl('/intervals'));
      return response.data.intervals || [];
    } catch (error) {
      console.error('Error fetching intervals:', error);
      return ['30s', '1min', '5min', '30min'];
    }
  }

  // Get symbols for an interval
  async getSymbolsForInterval(interval = '30s') {
    try {
      const response = await axios.get(getChartApiUrl(`/symbols/${interval}`));
      return response.data.symbols || [];
    } catch (error) {
      console.error('Error fetching symbols:', error);
      return [];
    }
  }

  // Get symbol metadata
  async getSymbolMetadata(symbol, interval = '30s') {
    try {
      const response = await axios.get(getChartApiUrl(`/metadata/${symbol}`), {
        params: { interval }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching symbol metadata:', error);
      return null;
    }
  }

  // Subscribe to real-time updates
  subscribeToRealtimeUpdates(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol).add(callback);

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol);
        }
      }
    };
  }

  // Connect to WebSocket for real-time updates
  connectWebSocket(sessionId) {
    if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = new WebSocket(getWebSocketUrl(`/sim/stream/${sessionId}`));

    this.websocket.onopen = () => {
      console.log('WebSocket connected for chart data');
      this.isConnected = true;
      // Emit connection status change
      this.emitConnectionStatusChange();
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle real-time tick data
        if (data.tick !== undefined && data.prices) {
          // Notify all subscribers
          this.subscribers.forEach((callbacks, symbol) => {
            if (data.prices[symbol]) {
              const tickData = {
                timestamp: data.timestamp || new Date().toISOString(),
                open: data.prices[symbol],
                high: data.prices[symbol],
                low: data.prices[symbol],
                close: data.prices[symbol],
                volume: 0, // Volume not available in real-time stream
                tick: data.tick
              };

              callbacks.forEach(callback => {
                callback(tickData);
              });
            }
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      // Emit connection status change
      this.emitConnectionStatusChange();
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
      // Emit connection status change
      this.emitConnectionStatusChange();
    };
  }

  // Emit connection status change
  emitConnectionStatusChange() {
    // Dispatch a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('websocketStatusChange', {
      detail: { isConnected: this.isConnected }
    }));
  }

  // Disconnect WebSocket
  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }

  // Clear cache for a specific symbol (useful when tick changes)
  clearCacheForSymbol(symbol, interval = '30s', days = 7, sessionId = null) {
    const cacheKey = `${symbol}-${interval}-${days}-${sessionId || 'no-session'}`;
    this.cache.delete(cacheKey);
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // Preload data for better performance
  async preloadData(symbols, interval = '30s', days = 7) {
    const promises = symbols.map(symbol => 
      this.getChartData(symbol, interval, days)
    );

    try {
      await Promise.all(promises);
      console.log('Chart data preloaded successfully');
    } catch (error) {
      console.error('Error preloading chart data:', error);
    }
  }
}

// Create singleton instance
const chartDataService = new ChartDataService();

export default chartDataService; 