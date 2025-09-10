import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TradingWindow.css';
import { simulationSeshApi } from '../services/simulationSeshApi';
import chartDataService from '../services/chartDataService';
import axios from 'axios';
import Watchlist from './Watchlist';
import RealTimeChart from './RealTimeChart';
import Portfolio from './Portfolio';
import OHLCBar from './OHLCBar';
import FundamentalPanel from './FundamentalPanel';
import cloudImage from '../assets/cloud.png'; // Import the cloud image
import tree1Image from '../assets/tree1.png'; // Import tree1
import tree2Image from '../assets/tree2.png'; // Import tree2
import { AuthContext } from './context/AuthContext';

const TradingWindow = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Get session ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('session');
  
  // Debug logging for authentication and session
  console.log('🔍 TradingWindow: Component rendered');
  console.log('🔍 TradingWindow: User object:', user);
  console.log('🔍 TradingWindow: User UID:', user?.uid);
  console.log('🔍 TradingWindow: Session ID from URL:', sessionIdFromUrl);
  console.log('🔍 TradingWindow: Full URL:', window.location.href);
  
  // Check if session ID is available
  if (!sessionIdFromUrl) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: '#ff6b81',
        fontSize: '18px',
        textAlign: 'center'
      }}>
        <div>
          <h2>No Session ID Provided</h2>
          <p>Please access the trading window through the dashboard with a valid session.</p>
          <p>URL should be: /trading?session=YOUR_SESSION_ID</p>
        </div>
      </div>
    );
  }
  
  console.log('TradingWindow: Using session ID:', sessionIdFromUrl);
  
  // State for trade form
  const [selectedSymbol, setSelectedSymbol] = useState('MSFT');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState('BUY');
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [tif, setTif] = useState('DAY');
  const [tradeResult, setTradeResult] = useState(null);
  const [tradeError, setTradeError] = useState(null);
  const [sessionCash, setSessionCash] = useState(10000); // Default starting balance

  // WebSocket state
  const ws = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsMessages, setWsMessages] = useState([]);
  const [currentTick, setCurrentTick] = useState(0);

  // State for chart and portfolio
  const [chartData, setChartData] = useState([]);
  const [interval, setInterval] = useState('30s');
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderTab, setOrderTab] = useState('Working');

  // Additional state
  const [buyingPower, setBuyingPower] = useState(0);
  const [latestPrice, setLatestPrice] = useState(0);
  const [quote, setQuote] = useState(null);
  const [ohlc, setOhlc] = useState(null);

  // Add state for stop-loss and take-profit toggles and values
  const [showStopLoss, setShowStopLoss] = useState(false);
  const [showTakeProfit, setShowTakeProfit] = useState(false);
  const [stopLossValue, setStopLossValue] = useState('');
  const [takeProfitValue, setTakeProfitValue] = useState('');

  // Add state for orders
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');

  // Add validation state
  const [tradeValidation, setTradeValidation] = useState({
    valid: true,
    error: null,
    can_buy: true,
    can_sell: true,
    current_cash: 0,
    current_holdings: 0,
    max_affordable_quantity: 0,
    max_sellable_quantity: 0
  });

  // Add loading state for fundamental data
  const [fundamentalLoading, setFundamentalLoading] = useState(false);
  
  // Add data caching for better performance
  const [dataCache, setDataCache] = useState(new Map());
  const [portfolioCache, setPortfolioCache] = useState(null);
  const [lastPortfolioFetch, setLastPortfolioFetch] = useState(0);
  
  // Add debounced validation
  const [validationTimeout, setValidationTimeout] = useState(null);

  // Chart data service ref
  const chartServiceRef = useRef(null);

  // Watchlist loading state
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  // Bottom panel tab state
  const [bottomPanelTab, setBottomPanelTab] = useState('portfolio'); // 'portfolio' or 'orders'

  // Debug logging for tab state
  console.log('Current bottom panel tab:', bottomPanelTab);
  console.log('Current positions state:', positions);
  console.log('Current sessionCash state:', sessionCash);

  // Handle watchlist loading state changes
  const handleWatchlistLoadingChange = (isLoading) => {
    console.log('🔄 Watchlist loading state changed:', isLoading);
    setWatchlistLoading(isLoading);
  };

  // Fetch portfolio function
  const fetchPortfolio = async () => {
    console.log('🔄 fetchPortfolio called');
    console.log('🔄 User object:', user);
    console.log('🔄 User UID:', user?.uid);
    console.log('🔄 Session ID from URL:', sessionIdFromUrl);
    
    // Don't fetch portfolio until watchlist is loaded and session is ready
    if (watchlistLoading) {
      console.log('🔄 Skipping portfolio fetch - watchlist still loading');
      return;
    }
    
    // Check cache first (cache for 5 seconds)
    const now = Date.now();
    if (portfolioCache && (now - lastPortfolioFetch) < 5000) {
      console.log('🔄 Using cached portfolio data');
      setPositions(portfolioCache.portfolio || []);
      if (portfolioCache.session && portfolioCache.session.cash !== undefined) {
        setSessionCash(portfolioCache.session.cash);
      }
      return;
    }
    
    try {
      const res = await simulationSeshApi.getPortfolio({
        user_id: user?.uid,
        session_id: sessionIdFromUrl,
      });
      console.log('🔄 Portfolio data received:', res.data);
      
      // Cache the result
      setPortfolioCache(res.data);
      setLastPortfolioFetch(now);
      
      // Handle new response structure with portfolio and session data
      if (res.data && res.data.portfolio) {
        console.log('🔄 Setting positions from portfolio data:', res.data.portfolio);
        setPositions(res.data.portfolio);
        // Update session cash from session data
        if (res.data.session && res.data.session.cash !== undefined) {
          setSessionCash(res.data.session.cash);
        }
      } else {
        // Fallback for old response structure
        console.log('🔄 Setting positions from fallback data:', res.data);
        setPositions(res.data || []);
      }
      
    } catch (err) {
      console.error('❌ Error fetching portfolio:', err);
      // Don't set positions to empty array on error, keep existing data
      if (err.response?.status === 404) {
        console.log('🔄 Portfolio 404 - session may not be ready yet, will retry');
      }
    }
  };

  // Fetch portfolio on mount and when session_id or user changes
  useEffect(() => {
    if (user?.uid && !watchlistLoading) {
      fetchPortfolio();
    }
  }, [user?.uid, sessionIdFromUrl, watchlistLoading]);

  // Also fetch portfolio when watchlist finishes loading
  useEffect(() => {
    if (user?.uid && !watchlistLoading) {
      // Small delay to ensure session is ready
      const timer = setTimeout(() => {
        fetchPortfolio();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [watchlistLoading]);

  // Retry portfolio fetch on 404 errors
  useEffect(() => {
    if (user?.uid && !watchlistLoading) {
      const retryTimer = setTimeout(() => {
        // Retry portfolio fetch after 3 seconds if we haven't loaded it yet
        if (positions.length === 0 && !portfolioCache) {
          console.log('🔄 Retrying portfolio fetch after delay');
          fetchPortfolio();
        }
      }, 3000);
      return () => clearTimeout(retryTimer);
    }
  }, [watchlistLoading, positions.length, portfolioCache]);

  // Expose refresh function globally for Portfolio component
  useEffect(() => {
    window.refreshPortfolio = fetchPortfolio;
    return () => {
      delete window.refreshPortfolio;
    };
  }, []);

  // Validate trade function
  const validateTrade = async () => {
    if (!user?.uid || !selectedSymbol || !quantity || !latestPrice) {
      return;
    }

    try {
      const action = side === 'BUY' ? 'buy' : 'sell';
      const params = {
        session_id: sessionIdFromUrl,
        user_id: user.uid,
        symbol: selectedSymbol,
        action,
        quantity: Number(quantity),
        price: latestPrice
      };

      const response = await axios.post('http://localhost:8000/sim/validate-trade', null, { params });
      setTradeValidation(response.data);
    } catch (error) {
      console.error('Validation error:', error);
      setTradeValidation({
        valid: false,
        error: error.response?.data?.error || 'Validation failed',
        can_buy: false,
        can_sell: false,
        current_cash: 0,
        current_holdings: 0,
        max_affordable_quantity: 0,
        max_sellable_quantity: 0
      });
    }
  };

  // Validate trade when form inputs change
  useEffect(() => {
    // Clear existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    // Set new timeout for debounced validation
    const timeout = setTimeout(() => {
      validateTrade();
    }, 300); // 300ms delay
    
    setValidationTimeout(timeout);
    
    // Cleanup on unmount
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [selectedSymbol, side, quantity, latestPrice, user?.uid, sessionIdFromUrl]);

  // Initialize chart data service
  useEffect(() => {
    chartServiceRef.current = chartDataService;
    
    // Connect to WebSocket for real-time updates
    chartDataService.connectWebSocket(sessionIdFromUrl);
    
    // Listen for WebSocket connection status changes
    const handleWebSocketStatusChange = (event) => {
      setWsConnected(event.detail.isConnected);
    };
    
    window.addEventListener('websocketStatusChange', handleWebSocketStatusChange);
    
    // Update connection status based on chartDataService
    const updateConnectionStatus = () => {
      setWsConnected(chartDataService.getConnectionStatus());
    };
    
    // Check connection status periodically
    const connectionInterval = setInterval(updateConnectionStatus, 1000);
    
    // Initial check
    updateConnectionStatus();
    
    return () => {
      clearInterval(connectionInterval);
      window.removeEventListener('websocketStatusChange', handleWebSocketStatusChange);
      chartDataService.disconnectWebSocket();
    };
  }, []);

  // Fetch chart data when symbol, interval, or current tick changes
  useEffect(() => {
    async function fetchChartData() {
      try {
        console.log(`🔍 TradingWindow: Fetching chart data for ${selectedSymbol} at tick ${currentTick}`);
        console.log(`🔍 TradingWindow: Using interval: ${interval}, session: ${sessionIdFromUrl}`);
        
        // Clear cache for this symbol when tick changes to ensure fresh data
        chartDataService.clearCacheForSymbol(selectedSymbol, interval, 7, sessionIdFromUrl);
        const data = await chartDataService.getChartData(selectedSymbol, interval, 7, sessionIdFromUrl);
        
        console.log(`🔍 TradingWindow: Chart data received for ${selectedSymbol}:`, data);
        console.log(`🔍 TradingWindow: Data length:`, data?.length);
        console.log(`🔍 TradingWindow: First data point:`, data?.[0]);
        console.log(`🔍 TradingWindow: Last data point:`, data?.[data?.length - 1]);
        
        if (data && data.length > 0) {
          console.log(`✅ TradingWindow: Setting chart data with ${data.length} points`);
        setChartData(data);
        } else {
          console.log(`❌ TradingWindow: No chart data received for ${selectedSymbol}`);
          setChartData([]);
        }
      } catch (error) {
        console.error('❌ TradingWindow: Error fetching chart data:', error);
        setChartData([]);
      }
    }
    
    fetchChartData();
  }, [selectedSymbol, interval, currentTick]);

  // Subscribe to real-time updates for selected symbol
  useEffect(() => {
    if (!chartDataService) return;

    const unsubscribe = chartDataService.subscribeToRealtimeUpdates(selectedSymbol, (newData) => {
      setChartData(prevData => {
        // Add new data point to the end
        const updatedData = [...prevData, newData];
        
        // Keep only last 1000 data points for performance
        if (updatedData.length > 1000) {
          return updatedData.slice(-1000);
        }
        
        return updatedData;
      });
    });

    return unsubscribe;
  }, [selectedSymbol]);

  // Fetch buying power (cash) on mount and after trades
  useEffect(() => {
    async function fetchBuyingPower() {
      try {
        // Check if user is authenticated
        if (!user?.uid) {
          console.log('⚠️ fetchBuyingPower: User not authenticated, skipping API call');
          setBuyingPower(0);
          return;
        }
        
        // Use the portfolio endpoint to get cash (buying power)
        // If you have a dedicated endpoint for cash, use that instead
        const res = await simulationSeshApi.getPortfolio({
          user_id: user?.uid,
          session_id: sessionIdFromUrl,
        });
        // Handle new response structure with portfolio and session data
        if (res.data && res.data.session && res.data.session.cash !== undefined) {
          setBuyingPower(res.data.session.cash);
        } else if (res.data && res.data.length > 0 && res.data[0].cash !== undefined) {
          // Fallback for old response structure
          setBuyingPower(res.data[0].cash);
        } else {
          // fallback: fetch from a dedicated endpoint if available
          setBuyingPower(0);
        }
      } catch {
        setBuyingPower(0);
      }
    }
    fetchBuyingPower();
  }, [tradeResult, user?.uid, sessionIdFromUrl]);

  // Optimized combined data fetch for faster symbol switching
  useEffect(() => {
    if (!selectedSymbol || !sessionIdFromUrl) return;
    
    const fetchSymbolData = async () => {
      // Check cache first
      const cacheKey = `${selectedSymbol}_${sessionIdFromUrl}`;
      const cachedData = dataCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedData && (now - cachedData.timestamp) < 3000) { // Cache for 3 seconds
        console.log('🔄 Using cached symbol data for:', selectedSymbol);
        setQuote(cachedData.quote);
        setOhlc(cachedData.ohlc);
        setLatestPrice(cachedData.latestPrice);
        setFundamentalLoading(false);
        return;
      }
      
      try {
        console.log('🔄 Fetching fresh symbol data for:', selectedSymbol);
        
        // Fetch quote and OHLC data in parallel for faster loading
        const [quoteRes, ohlcRes] = await Promise.all([
          simulationSeshApi.getQuote({
            session_id: sessionIdFromUrl,
            symbol: selectedSymbol,
          }),
          simulationSeshApi.getOhlc({
            session_id: sessionIdFromUrl,
            symbol: selectedSymbol,
          })
        ]);
        
        // Update all related state at once
        const newData = {
          quote: quoteRes.data,
          ohlc: ohlcRes.data,
          latestPrice: quoteRes.data?.last_price || 0,
          timestamp: now
        };
        
        setQuote(newData.quote);
        setOhlc(newData.ohlc);
        setLatestPrice(newData.latestPrice);
        
        // Cache the result
        setDataCache(prev => new Map(prev).set(cacheKey, newData));
        
      } catch (error) {
        console.error('Error fetching symbol data:', error);
        setQuote(null);
        setOhlc(null);
        setLatestPrice(0);
      } finally {
        setFundamentalLoading(false);
      }
    };
    
    fetchSymbolData();
  }, [selectedSymbol, sessionIdFromUrl]); // Removed currentTick dependency for faster switching

  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      try {
        // Check if user is authenticated
        if (!user?.uid) {
          console.log('⚠️ fetchOrders: User not authenticated, skipping API call');
          setOrders([]);
          return;
        }
        
        // Map frontend tab values to backend status values
        const statusMap = {
          'Working': 'pending',
          'Filled': 'filled',
          'Canceled': 'canceled'
        };
        
        const res = await simulationSeshApi.getOrders({
          session_id: sessionIdFromUrl,
          user_id: user?.uid,
          status: statusMap[orderTab]
        });
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setOrders([]);
      }
    }
    fetchOrders();
  }, [orderTab, user?.uid, sessionIdFromUrl]);

  // Filter orders based on type and status
  const filteredOrders = orders.filter(order => {
    if (orderTypeFilter === 'all') return true;
    return order.order_type === orderTypeFilter;
  });

  // WebSocket message handler
  useEffect(() => {
    if (!ws.current) return;

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWsMessages(prev => [...prev, data]);

      // Update current tick
      if (data.tick !== undefined) {
        setCurrentTick(data.tick);
      }

      // Update portfolio and session cash
      if (data.portfolio) {
        setPositions(data.portfolio.positions || []);
        // Update session cash from the portfolio data
        if (data.portfolio.session) {
          setSessionCash(data.portfolio.session.cash);
        }
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // Calculate current tick's date and time
  const getCurrentTickDateTime = () => {
    if (currentTick === undefined) {
      return 'Loading...';
    }
    
    try {
      // Get the first data point to determine the session start time
      if (!chartData || chartData.length === 0) {
        return 'Loading...';
      }
      
      const firstDataPoint = chartData[0];
      if (!firstDataPoint || !firstDataPoint.timestamp) {
        return 'Loading...';
      }
      
      const sessionStartTime = new Date(firstDataPoint.timestamp);
      const totalTicks = chartData.length;
      
      if (totalTicks === 0) {
        return 'Loading...';
      }
      
      // Calculate the time for the current tick based on the session duration
      // Use the same logic as the backend: (currentTick / totalTicks) * sessionDuration
      const sessionDurationSeconds = 86400; // 24 hours default, but should come from session
      const elapsedSeconds = (currentTick / totalTicks) * sessionDurationSeconds;
      const currentTickTime = new Date(sessionStartTime.getTime() + (elapsedSeconds * 1000));
      
      return currentTickTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error calculating tick date/time:', error);
      return 'Loading...';
    }
  };

  // Calculate amount and max shares
  let priceForCalc = latestPrice;
  if (orderType === 'limit') {
    priceForCalc = Number(limitPrice) || latestPrice;
  }
  // For STOP orders, we use the current market price for amount calculation
  // since that's what will be paid when the stop is triggered
  const amountEst = priceForCalc * Number(quantity || 0);
  const maxShares = priceForCalc > 0 ? Math.floor(sessionCash / priceForCalc) : 0;

  // Handle interval change
  const handleIntervalChange = (newInterval) => {
    setInterval(newInterval);
  };

  // Handle symbol change with loading state
  const handleSymbolChange = (newSymbol) => {
    setSelectedSymbol(newSymbol);
    setFundamentalLoading(true);
    
    // Clear form values when switching symbols
    setLimitPrice('');
    setStopLossValue('');
    setTakeProfitValue('');
    setShowStopLoss(false);
    setShowTakeProfit(false);
    
    // Reset validation
    setTradeValidation({
      valid: true,
      error: null,
      can_buy: true,
      can_sell: true,
      current_cash: 0,
      current_holdings: 0,
      max_affordable_quantity: 0,
      max_sellable_quantity: 0
    });
    
    // Clear cache for the new symbol to ensure fresh data
    const cacheKey = `${newSymbol}_${sessionIdFromUrl}`;
    setDataCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(cacheKey);
      return newCache;
    });
  };

  // Trade form submit handler
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setTradeResult(null);
    setTradeError(null);
    try {
      const action = side === 'BUY' ? 'buy' : 'sell';
      const params = {
        session_id: sessionIdFromUrl,
        user_id: user?.uid,
        symbol: selectedSymbol,
        action,
        quantity: Number(quantity),
        order_type: orderType.toLowerCase(),
      };

      // Set price based on order type
      if (orderType === 'market') {
        params.price = latestPrice;
      } else if (orderType === 'limit') {
        params.price = Number(limitPrice);
      } else if (orderType === 'stop') {
        params.price = Number(stopLossValue);
      }

      // Add stop loss and take profit if enabled
      if (showStopLoss && stopLossValue) {
        params.stop_loss = Number(stopLossValue);
      }
      if (showTakeProfit && takeProfitValue) {
        params.take_profit = Number(takeProfitValue);
      }

      const res = await simulationSeshApi.trade(params);
      setTradeResult(res.data);
      
      // Reconnect WebSocket if it was disconnected
      if (!wsConnected) {
        ws.current = simulationSeshApi.getStream(sessionIdFromUrl);
        ws.current.onopen = () => {
          console.log('WebSocket reconnected');
          setWsConnected(true);
        };
        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
        };
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };
        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
            if (data.error) {
              console.error('WebSocket error:', data.error);
              return;
            }
            if (data.status === 'ended') {
              console.log('Session ended');
              return;
            }
            if (data.tick !== undefined) {
              setCurrentTick(data.tick);
            }
            if (data.portfolio) {
              setPositions(data.portfolio);
            }
            if (data.cash !== undefined) {
              setSessionCash(data.cash);
            }
            setWsMessages((msgs) => [...msgs, JSON.stringify(data)]);
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
      }
    } catch (err) {
      console.error('Trade error:', err);
      setTradeError(err.response?.data?.detail || err.message);
    }
  };

  // Automatically connect to WebSocket on mount
  useEffect(() => {
    if (ws.current) ws.current.close();
    ws.current = simulationSeshApi.getStream(sessionIdFromUrl);
    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };
    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        if (data.error) {
          console.error('WebSocket error:', data.error);
          return;
        }
        if (data.status === 'ended') {
          console.log('Session ended');
          return;
        }
        if (data.tick !== undefined) {
          setCurrentTick(data.tick);
        }
        if (data.portfolio) {
          setPositions(data.portfolio);
        }
        if (data.cash !== undefined) {
          setSessionCash(data.cash);
        }
        setWsMessages((msgs) => [...msgs, JSON.stringify(data)]);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  // Status map for order status mapping
  const statusMap = {
    'Working': 'pending',
    'Filled': 'filled',
    'Canceled': 'canceled'
  };

  // Refresh portfolio when trades are placed
  useEffect(() => {
    if (tradeResult) {
      // Refresh portfolio data after successful trade
      fetchPortfolio();
    }
  }, [tradeResult]);

  return (
    <div className="sim-trading-window">
      <div className="sim-main-layout" style={{ display: 'flex', height: '100vh', width: '100vw', minWidth: 0 }}>
        {/* Left: Trade Form */}
        <div className="sim-trade-panel" style={{ width: 420, background: '#1c212b', borderRight: '2px solid #23283a', display: 'flex', flexDirection: 'column', minWidth: 410, maxWidth: 420, flexShrink: 0, padding: 0, margin: 0 }}>
          {/* Fundamental Panel - Top */}
          <div style={{ height: 400, padding: 8, borderBottom: '2px solid #23283a' }}>
            <FundamentalPanel symbol={selectedSymbol} watchlistLoading={watchlistLoading} />
          </div>
          
          {/* Trade Form - Bottom */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }} />
            <form className="sim-trade-form" onSubmit={handlePlaceOrder} style={{ marginTop: 'auto', marginBottom: 0, background: '#181c24', borderRadius: 10, padding: 18, boxShadow: '0 2px 8px #000a', minWidth: 410, maxWidth: 420, width: 410, fontSize: 15 }}>
              {/* Loading Bar for Fundamental Data */}
              {fundamentalLoading && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    width: '100%',
                    height: '3px',
                    backgroundColor: 'rgba(46, 52, 72, 0.5)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: '40%',
                      height: '100%',
                      backgroundColor: '#00ffe7',
                      borderRadius: '2px',
                      position: 'absolute',
                      left: '-40%',
                      animation: 'trade-form-loading-animation 1.5s linear infinite'
                    }}></div>
                  </div>
                  <div style={{ color: '#8b8fa3', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
                    Loading {selectedSymbol} data...
                  </div>
                  <style>{`
                    @keyframes trade-form-loading-animation {
                      from { left: -40%; }
                      to { left: 100%; }
                    }
                  `}</style>
                </div>
              )}
              
              {/* Side Selection */}
              <div style={{ display: 'flex', marginBottom: 10 }}>
                <button type="button" className={side === 'BUY' ? 'sim-buy active' : 'sim-buy'} style={{ flex: 1, fontSize: 18, fontWeight: 700, borderRadius: '7px 0 0 7px', height: 34, background: side === 'BUY' ? '#26a69a' : '#23283a', color: side === 'BUY' ? '#fff' : '#7ee787', border: 'none', transition: 'background 0.2s' }} onClick={() => setSide('BUY')}>Buy</button>
                <button type="button" className={side === 'SELL' ? 'sim-sell active' : 'sim-sell'} style={{ flex: 1, fontSize: 18, fontWeight: 700, borderRadius: '0 7px 7px 0', height: 34, background: side === 'SELL' ? '#ef5350' : '#23283a', color: side === 'SELL' ? '#fff' : '#ff6b81', border: 'none', transition: 'background 0.2s' }} onClick={() => setSide('SELL')}>Sell</button>
              </div>
              {/* Order Type & Amount */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Order Type</label>
                  <select value={orderType} onChange={e => setOrderType(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 7, background: '#23283a', color: '#e0e6f0', border: '1.2px solid #2e3448', fontSize: 14, paddingLeft: 8 }}>
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Quantity</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 7, background: '#23283a', color: '#e0e6f0', border: '1.2px solid #2e3448', fontSize: 14, paddingLeft: 8, outline: 'none' }} />
                </div>
              </div>
              {/* Limit Price - Only show for LIMIT orders */}
              {orderType === 'limit' && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Limit Price</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#23283a', border: '1.2px solid #2e3448', borderRadius: 7, height: 28, paddingLeft: 8 }}>
                    <span style={{ color: '#8b8fa3', marginRight: 3 }}>$</span>
                    <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#e0e6f0', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>
              )}
              {/* Stop Price - Only show for STOP orders */}
              {orderType === 'stop' && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Stop Price</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#23283a', border: '1.2px solid #2e3448', borderRadius: 7, height: 28, paddingLeft: 8 }}>
                    <span style={{ color: '#8b8fa3', marginRight: 3 }}>$</span>
                    <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#e0e6f0', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>
              )}
              {/* Time-in-Force & Extended Hours */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Time-in-Force</label>
                  <select value={tif} onChange={e => setTif(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 7, background: '#23283a', color: '#e0e6f0', border: '1.2px solid #2e3448', fontSize: 14, paddingLeft: 8 }}>
                    <option value="DAY">Day</option>
                    <option value="GTC">GTC</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Extended Hours</label>
                  <select style={{ width: '100%', height: 28, borderRadius: 7, background: '#23283a', color: '#e0e6f0', border: '1.2px solid #2e3448', fontSize: 14, paddingLeft: 8 }} disabled>
                    <option>No</option>
                  </select>
                </div>
              </div>
              {/* Stop-Loss & Take-Profit Toggles - Only show for MARKET and LIMIT orders */}
              {(orderType === 'market' || orderType === 'limit') && (
                <>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div onClick={() => setShowStopLoss(v => !v)} style={{ width: 28, height: 16, borderRadius: 9, background: showStopLoss ? '#ff6b81' : '#23283a', border: '1.2px solid #2e3448', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: showStopLoss ? 12 : 2, transition: 'left 0.2s' }} />
                      </div>
                      <span style={{ fontWeight: 500, color: showStopLoss ? '#ff6b81' : '#8b8fa3', fontSize: 12 }}>Stop-Loss</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div onClick={() => setShowTakeProfit(v => !v)} style={{ width: 28, height: 16, borderRadius: 9, background: showTakeProfit ? '#7ee787' : '#23283a', border: '1.2px solid #2e3448', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: showTakeProfit ? 12 : 2, transition: 'left 0.2s' }} />
                      </div>
                      <span style={{ fontWeight: 500, color: showTakeProfit ? '#7ee787' : '#8b8fa3', fontSize: 12 }}>Take-Profit</span>
                    </div>
                  </div>

                  {/* Stop-Loss & Take-Profit Inputs */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Stop Price</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#23283a', border: '1.2px solid #2e3448', borderRadius: 7, height: 28, paddingLeft: 8, width: '100%' }}>
                        <span style={{ color: '#8b8fa3', marginRight: 3 }}>$</span>
                        <input type="number" value={showStopLoss ? stopLossValue : ''} onChange={e => setStopLossValue(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#e0e6f0', fontSize: 14, outline: 'none' }} disabled={!showStopLoss} />
                      </div>
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Take Profit</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#23283a', border: '1.2px solid #2e3448', borderRadius: 7, height: 28, paddingLeft: 8, width: '100%' }}>
                        <span style={{ color: '#8b8fa3', marginRight: 3 }}>$</span>
                        <input type="number" value={showTakeProfit ? takeProfitValue : ''} onChange={e => setTakeProfitValue(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#e0e6f0', fontSize: 14, outline: 'none' }} disabled={!showTakeProfit} />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* Estimated Amount */}
              <div className="sim-form-group" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 1, display: 'block' }}>Estimated Amount</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#23283a', border: '1.2px solid #2e3448', borderRadius: 7, height: 28, paddingLeft: 8 }}>
                  <span style={{ color: '#8b8fa3', marginRight: 3 }}>$</span>
                  <span style={{ color: '#e0e6f0', fontSize: 14 }}>{amountEst.toFixed(2)}</span>
                </div>
              </div>
              {/* Place Order Button */}
              <button 
                type="submit" 
                className={side === 'BUY' ? 'sim-buy' : 'sim-sell'} 
                style={{ 
                  width: '100%', 
                  fontSize: 15, 
                  fontWeight: 700, 
                  padding: '0.5rem 0', 
                  borderRadius: 7, 
                  marginBottom: 8, 
                  background: side === 'BUY' ? '#26a69a' : '#ef5350', 
                  color: '#fff', 
                  border: 'none', 
                  boxShadow: '0 2px 8px #0004', 
                  transition: 'background 0.2s',
                  opacity: !tradeValidation.valid ? 0.5 : 1,
                  cursor: !tradeValidation.valid ? 'not-allowed' : 'pointer'
                }}
                disabled={!tradeValidation.valid}
              >
                {!tradeValidation.valid ? (tradeValidation.error || 'Invalid Trade') : 'Place Order'}
              </button>
              
              {/* Validation Error Display */}
              {!tradeValidation.valid && tradeValidation.error && (
                <div style={{ 
                  color: '#ff6b81', 
                  fontSize: 12, 
                  marginBottom: 8, 
                  padding: 8, 
                  background: 'rgba(255, 107, 129, 0.1)', 
                  borderRadius: 4,
                  border: '1px solid rgba(255, 107, 129, 0.3)'
                }}>
                  {tradeValidation.error}
                </div>
              )}
              
              {/* Validation Info Display */}
              {tradeValidation.valid && (
                <div style={{ 
                  color: '#7ee787', 
                  fontSize: 12, 
                  marginBottom: 8, 
                  padding: 8, 
                  background: 'rgba(126, 231, 135, 0.1)', 
                  borderRadius: 4,
                  border: '1px solid rgba(126, 231, 135, 0.3)'
                }}>
                  {side === 'BUY' ? 
                    `Can buy up to ${tradeValidation.max_affordable_quantity || 0} shares` :
                    `Can sell up to ${tradeValidation.max_sellable_quantity || 0} shares`
                  }
                </div>
              )}
              
              {/* Buying Power & Max Shares */}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b8fa3', fontSize: 12, marginTop: 4 }}>
                <div>Buying Power: ${tradeValidation.current_cash?.toFixed(2) || sessionCash.toFixed(2)}</div>
                <div>Current Holdings: {tradeValidation.current_holdings || 0}</div>
              </div>
            </form>
            {tradeError && <div style={{ color: '#ff6b81', marginTop: 8 }}>Trade Error: {tradeError}</div>}
          </div>
        </div>
        {/* Watchlist Panel */}
        <div style={{ width: 340, minWidth: 320, maxWidth: 360, background: 'none', borderRight: '2px solid #23283a', display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, padding: 0 }}>
          <Watchlist
            currentTick={currentTick}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={handleSymbolChange}
            onLoadingChange={handleWatchlistLoadingChange}
          />
        </div>
        {/* Right: Chart (top) + Portfolio (bottom) */}
        <div className="sim-right-panel" style={{ maxWidth: '66.66vw' }}>
          <div className="sim-chart-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: '#e0e6f0' }}>{selectedSymbol}</h2>
              <button
                onClick={() => navigate('/trades')}
                style={{
                  background: '#ff6b81',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => e.target.style.background = '#ff4757'}
                onMouseLeave={(e) => e.target.style.background = '#ff6b81'}
              >
                ×
              </button>
            </div>
            
            {/* OHLC Bar and Scenery */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <img 
                src={tree1Image}
                alt="Decorative tree one"
                style={{
                  position: 'absolute',
                  top: '-49px', // Adjust to align with the cloud
                  left: '250px', // Position to the left of the cloud
                  width: '40px', // Adjust size as needed
                  pointerEvents: 'none'
                }}
              />
              <img 
                src={cloudImage} 
                alt="Decorative cloud" 
                style={{ 
                  position: 'absolute', 
                  top: '-100px', 
                  left: '390px', 
                  width: '70px', 
                  opacity: 1,
                  pointerEvents: 'none'
                }} 
              />
              <img
                src={tree2Image}
                alt="Decorative tree two"
                style={{
                  position: 'absolute',
                  top: '-39px', // Adjust to align with the cloud
                  left: '225px', // Position to the right of the cloud
                  width: '34px', // Adjust size as needed
                  pointerEvents: 'none'
                }}
              />
              <OHLCBar ohlc={ohlc} symbol={selectedSymbol} watchlistLoading={watchlistLoading} />
            </div>
            
            <div style={{ position: 'relative', flex: 1, background: '#23283a', borderRadius: 8 }}>
              {/* Chart Controls */}
              <div style={{
                position: 'absolute', 
                top: 10, 
                right: 10, 
                zIndex: 10,
                display: 'flex',
                gap: 8,
                background: 'rgba(35, 40, 58, 0.9)',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #2e3448'
              }}>
                {/* Interval Selector */}
                <select 
                  value={interval} 
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  style={{
                    background: '#23283a',
                    color: '#e0e6f0',
                    border: '1px solid #2e3448',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    outline: 'none'
                  }}
                >
                  <option value="30s">30s</option>
                  <option value="1min">1m</option>
                  <option value="5min">5m</option>
                  <option value="30min">30m</option>
                </select>
              </div>

              {/* Real-Time Chart Component */}
              <RealTimeChart
                symbol={selectedSymbol}
                data={chartData}
                interval={interval}
                currentTick={currentTick}
                isConnected={wsConnected}
                onIntervalChange={handleIntervalChange}
                positions={positions}
                currentPrice={latestPrice}
              />
            </div>
          </div>
          <div className="sim-bottom-panel">
            {/* Main Tab Navigation */}
            <div className="sim-orders-tabs">
              <button 
                className={bottomPanelTab === 'portfolio' ? 'active' : ''} 
                onClick={() => setBottomPanelTab('portfolio')}
                style={{
                  background: bottomPanelTab === 'portfolio' ? '#26a69a' : 'transparent',
                  color: bottomPanelTab === 'portfolio' ? '#fff' : '#8b8fa3',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: bottomPanelTab === 'portfolio' ? 'bold' : 'normal'
                }}
              >
                Portfolio
              </button>
              <button 
                className={bottomPanelTab === 'orders' ? 'active' : ''} 
                onClick={() => setBottomPanelTab('orders')}
                style={{
                  background: bottomPanelTab === 'orders' ? '#26a69a' : 'transparent',
                  color: bottomPanelTab === 'orders' ? '#fff' : '#8b8fa3',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: bottomPanelTab === 'orders' ? 'bold' : 'normal'
                }}
              >
                Orders
              </button>
            </div>

            {/* Portfolio Tab Content */}
            {bottomPanelTab === 'portfolio' && (
              <div style={{ 
                flex: 1, 
                padding: '16px'
              }}>
                <Portfolio 
                  positions={positions} 
                  sessionCash={sessionCash} 
                  loading={false} // Always show portfolio data immediately
                  watchlistLoading={watchlistLoading}
                />
              </div>
            )}

            {/* Orders Tab Content */}
            {bottomPanelTab === 'orders' && (
              <>
                <div className="sim-orders-tabs" style={{ marginTop: 8 }}>
                  {['Working', 'Filled', 'Canceled'].map(tab => (
                    <button 
                      key={tab} 
                      className={orderTab === tab ? 'active' : ''} 
                      onClick={() => setOrderTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="sim-orders-table" style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#23283a' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2e3448', background: '#2a2e39' }}>
                        <th style={{ textAlign: 'left', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '15%' }}>Symbol</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '15%' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '15%' }}>Side</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '15%' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '15%' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '15%' }}>Status</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 12, width: '10%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} style={{ borderBottom: '1px solid #2e3448' }}>
                          <td style={{ padding: '8px', color: '#e0e6f0', width: '15%' }}>{order.symbol}</td>
                          <td style={{ padding: '8px', color: '#e0e6f0', width: '15%', textTransform: 'capitalize' }}>{order.order_type}</td>
                          <td style={{ padding: '8px', color: order.action === 'buy' ? '#7ee787' : '#ff6b81', width: '15%', textTransform: 'capitalize' }}>{order.action}</td>
                          <td style={{ padding: '8px', color: '#e0e6f0', width: '15%', textAlign: 'right' }}>{order.quantity}</td>
                          <td style={{ padding: '8px', color: '#e0e6f0', width: '15%', textAlign: 'right' }}>${order.price.toFixed(2)}</td>
                          <td style={{ padding: '8px', color: '#e0e6f0', width: '15%', textAlign: 'right', textTransform: 'capitalize' }}>{order.status}</td>
                          <td style={{ padding: '8px', width: '10%', textAlign: 'right' }}>
                            {order.status === 'pending' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await simulationSeshApi.cancelOrder({ 
                                      session_id: sessionIdFromUrl, 
                                      user_id: user?.uid,
                                      order_id: order.id 
                                    });
                                    // Immediately fetch updated orders
                                    const res = await simulationSeshApi.getOrders({
                                      session_id: sessionIdFromUrl,
                                      user_id: user?.uid,
                                      status: statusMap[orderTab]
                                    });
                                    setOrders(res.data);
                                  } catch (err) {
                                    console.error('Error canceling order:', err);
                                  }
                                }}
                                style={{
                                  background: '#2a2e39',
                                  color: '#ff6b81',
                                  border: '1px solid #2e3448',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#8b8fa3' }}>
                            No orders found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingWindow;