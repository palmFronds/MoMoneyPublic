import axios from 'axios';
import { getSimApiUrl, getWebSocketUrl } from '../config/api';

export const simulationSeshApi = {
  // Trade endpoint (POST)
  trade: async ({ session_id, user_id, symbol, action, quantity, order_type, price, stop_loss, take_profit }) => {
    if (!user_id) {
      throw new Error('user_id is required for trade requests');
    }
    if (!session_id) {
      throw new Error('session_id is required for trade requests');
    }
    // session_id and user_id are required, others are optional
    const params = {
      session_id: session_id,
      user_id: user_id,
      symbol,
      action,
      quantity,
      order_type,
      price,
    };
    if (stop_loss) params.stop_loss = stop_loss;
    if (take_profit) params.take_profit = take_profit;
    return axios.post(getSimApiUrl('/trade'), null, { params });
  },

  // Get orders for a session
  getOrders: async ({ session_id, user_id, status }) => {
    if (!user_id) {
      throw new Error('user_id is required for order requests');
    }
    if (!session_id) {
      throw new Error('session_id is required for order requests');
    }
    const params = {
      session_id: session_id,
      user_id: user_id,
    };
    if (status) params.status = status;
    return axios.get(getSimApiUrl('/orders'), { params });
  },

  // Cancel an order
  cancelOrder: async ({ session_id, user_id, order_id }) => {
    if (!user_id) {
      throw new Error('user_id is required for cancel order requests');
    }
    if (!session_id) {
      throw new Error('session_id is required for cancel order requests');
    }
    return axios.post(getSimApiUrl(`/orders/${order_id}/cancel`), null, {
      params: {
        session_id: session_id,
        user_id: user_id,
      },
    });
  },

  // WebSocket stream for prices/portfolio
  getStream: (session_id) => {
    if (!session_id) {
      throw new Error('session_id is required for WebSocket connection');
    }
    // Returns a WebSocket instance
    const wsUrl = getWebSocketUrl(`/sim/stream/${session_id}`);
    console.log('Connecting to WebSocket:', wsUrl);
    return new WebSocket(wsUrl);
  },

  // Get portfolio for a user/session
  getPortfolio: async ({ user_id, session_id }) => {
    if (!user_id) {
      throw new Error('user_id is required for portfolio requests');
    }
    if (!session_id) {
      throw new Error('session_id is required for portfolio requests');
    }
    return axios.get(getSimApiUrl('/portfolio'), {
      params: {
        user_id: user_id,
        session_id: session_id,
      },
    });
  },

  // Get quote for a symbol in a session
  getQuote: async ({ session_id, symbol }) => {
    if (!session_id) {
      throw new Error('session_id is required for quote requests');
    }
    return axios.get(getSimApiUrl(`/quote/${session_id}/${symbol}`));
  },

  // Get all symbols for the watchlist
  getSymbols: async () => {
    return axios.get(getSimApiUrl('/symbols'));
  },

  // Get OHLC for a symbol in a session
  getOhlc: async ({ session_id, symbol }) => {
    if (!session_id) {
      throw new Error('session_id is required for OHLC requests');
    }
    return axios.get(getSimApiUrl(`/ohlc/${session_id}/${symbol}`));
  },

  // Set exit conditions (stop-loss and take-profit) for a position
  setExitConditions: async ({ session_id, user_id, symbol, stop_loss, take_profit }) => {
    if (!user_id) {
      throw new Error('user_id is required for exit conditions requests');
    }
    if (!session_id) {
      throw new Error('session_id is required for exit conditions requests');
    }
    return axios.post(getSimApiUrl('/set_exit_conditions'), {
      session_id: session_id,
      symbol,
      stop_loss,
      take_profit,
    }, {
      params: {
        user_id: user_id,
      }
    });
  },

  // Get fundamental and technical indicators
  getIndicators: async ({ session_id, symbol }, options) => {
    if (!session_id) {
      throw new Error('session_id is required for indicators requests');
    }
    return axios.get(getSimApiUrl(`/fundamentals/${session_id}/${symbol}`), options);
  },
}; 