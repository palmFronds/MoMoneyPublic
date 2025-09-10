import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { simulationSeshApi } from '../services/simulationSeshApi';

const FundamentalPanel = ({ symbol = 'MSFT', watchlistLoading = false }) => {
  // Get session ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('session');
  
  // Debug logging
  console.log('🔍 FundamentalPanel: Component rendered');
  console.log('🔍 FundamentalPanel: Symbol prop:', symbol);
  console.log('🔍 FundamentalPanel: Watchlist loading:', watchlistLoading);
  console.log('🔍 FundamentalPanel: Session ID from URL:', sessionIdFromUrl);
  console.log('🔍 FundamentalPanel: Full URL:', window.location.href);
  
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    // Don't load indicators until watchlist is ready
    if (watchlistLoading) {
      console.log('🔍 FundamentalPanel: Skipping load - watchlist still loading');
      setLoading(true);
      return;
    }
    
    if (!sessionIdFromUrl) {
      setError('No session ID available');
      setLoading(false);
      setHasAttemptedLoad(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    setHasAttemptedLoad(true);
    
    const source = axios.CancelToken.source();

    const fetchIndicators = async () => {
      try {
        console.log('🔍 FundamentalPanel: Making API call with params:', {
          session_id: sessionIdFromUrl,
          symbol,
        });
        
        const res = await simulationSeshApi.getIndicators(
          {
            session_id: sessionIdFromUrl,
            symbol,
          },
          { cancelToken: source.token }
        );
        console.log(`Fundamental Panel: Successfully fetched data for ${symbol}`, res.data);
        setIndicators(res.data);
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log('Request canceled:', err.message);
        } else {
          const errorMsg = err.response?.data?.detail || 'Failed to load indicators';
          console.error(`Fundamental Panel: Error fetching data for ${symbol}:`, errorMsg);
          console.error(`Fundamental Panel: Full error:`, err);
          setError(errorMsg);
          setIndicators(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchIndicators();

    return () => {
      source.cancel('useEffect cleanup: Canceling the request.');
    };
  }, [symbol, sessionIdFromUrl, watchlistLoading]);

  const formatValue = (value, prefix = '', suffix = '', decimals = 2) => {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    if (isNaN(num)) return '-';
    return `${prefix}${num.toFixed(decimals)}${suffix}`;
  };
  
  const formatLargeNumber = (value) => {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    if (isNaN(num)) return '-';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };
  
  return (
    <div style={{
      background: '#23283a',
      borderRadius: 8,
      padding: 16,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #2e3448',
      boxSizing: 'border-box'
    }}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div style={{
            width: '80%',
            height: '4px',
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
              animation: 'loading-animation 1.5s linear infinite'
            }}></div>
          </div>
          <div style={{ marginTop: '10px', color: '#8b8fa3', fontSize: '12px' }}>
            Loading {symbol}...
          </div>
          <style>{`
            @keyframes loading-animation {
              from { left: -40%; }
              to { left: 100%; }
            }
          `}</style>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ff6b81', textAlign: 'center' }}>
          {error}
        </div>
      ) : !indicators && hasAttemptedLoad ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#8b8fa3', textAlign: 'center' }}>
          No data available for {symbol}.
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            borderBottom: '1px solid #2e3448',
            paddingBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, color: '#e0e6f0', fontSize: 14, fontWeight: 'bold' }}>
                Fundamental & Technical Data 📈📉
              </h3>
              {loading && (
                <div style={{
                  width: '10px',
                  height: '10px',
                  border: '2px solid #2e3448',
                  borderTop: '2px solid #00ffe7',
                  borderRadius: '50%',
                  animation: 'fundamental-spin 1s linear infinite'
                }} />
              )}
            </div>
            <span style={{ color: '#8b8fa3', fontSize: 12, fontWeight: 'bold' }}>
              {symbol}
            </span>
            <style>{`
              @keyframes fundamental-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>

          {/* Data Grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Row 1 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>Market Cap</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatLargeNumber(indicators.MarketCap)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>P/E Ratio</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.PE_Ratio)}
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>ROE</div>
                <div style={{ color: indicators.ROE > 0 ? '#7ee787' : '#ff6b81', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.ROE, '', '%')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>Debt/Equity</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.Debt_to_Equity)}
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>52W High</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators['52W_High'], '$')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>52W Low</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators['52W_Low'], '$')}
                </div>
              </div>
            </div>

            {/* Row 4 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>Dividend Yield</div>
                <div style={{ color: '#7ee787', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.Dividend_Yield, '', '%')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>Beta</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.Beta)}
                </div>
              </div>
            </div>

            {/* Row 5 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>RSI (14)</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.RSI_14)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>MACD</div>
                <div style={{ color: indicators.MACD > 0 ? '#7ee787' : '#ff6b81', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.MACD, indicators.MACD > 0 ? '+' : '')}
                </div>
              </div>
            </div>

            {/* Row 6 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>ATR (14)</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.ATR_14)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>VWAP</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.VWAP, '$')}
                </div>
              </div>
            </div>

            {/* Row 7 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>SMA (20)</div>
                <div style={{ color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators.SMA_20, '$')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#8b8fa3', fontSize: 10, marginBottom: 2 }}>5D Change %</div>
                <div style={{ color: indicators['5D_Change%'] > 0 ? '#7ee787' : '#ff6b81', fontSize: 12, fontWeight: 'bold' }}>
                  {formatValue(indicators['5D_Change%'], '', '%')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FundamentalPanel;