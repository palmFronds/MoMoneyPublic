import React, { useEffect, useState } from 'react';
import { simulationSeshApi } from '../services/simulationSeshApi';

console.log('Watchlist component rendering');

const Watchlist = ({ currentTick, selectedSymbol, setSelectedSymbol, onLoadingChange }) => {
  // Get session ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('session');
  
  const [symbols, setSymbols] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [hoveredSymbol, setHoveredSymbol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Notify parent of loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading || quotesLoading);
    }
  }, [loading, quotesLoading, onLoadingChange]);

  // Fetch all symbols on mount
  useEffect(() => {
    async function fetchSymbols() {
      try {
        setLoading(true);
        console.log('Fetching symbols for watchlist...');
        const res = await simulationSeshApi.getSymbols();
        console.log('Watchlist symbols response:', res.data);
        setSymbols(res.data);
      } catch (err) {
        console.error('Error fetching symbols for watchlist:', err);
        setSymbols([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSymbols();
  }, []);

  // Fetch quotes for all symbols at the current tick
  useEffect(() => {
    if (!symbols.length || !sessionIdFromUrl) return;
    async function fetchAllQuotes() {
      setQuotesLoading(true);
      const newQuotes = {};
      await Promise.all(symbols.map(async (symbol) => {
        try {
          // Fetch quote for this symbol (backend calculates current tick internally)
          const res = await simulationSeshApi.getQuote({ session_id: sessionIdFromUrl, symbol });
          if (res.data && res.data.last_price !== undefined && res.data.last_price !== null) {
          newQuotes[symbol] = res.data;
          }
        } catch (err) {
          // Ignore errors for missing data
        }
      }));
      setQuotes(newQuotes);
      setQuotesLoading(false);
    }
    fetchAllQuotes();
  }, [symbols, currentTick, sessionIdFromUrl]);

  // Loading state for initial symbols fetch
  if (loading) {
    return (
      <div style={{ background: '#23283a', borderRadius: 8, padding: '10px 0 0 0', minWidth: 300, maxWidth: 340, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 16px 8px 16px', borderBottom: '1.5px solid #353a4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: '#e0e6f0', fontSize: 18 }}>Watchlist</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {quotesLoading && (
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid #353a4a',
                borderTop: '2px solid #00ffe7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            <span style={{ fontSize: 13, color: '#ffb347', background: '#353a4a', borderRadius: 8, padding: '2px 7px' }}>1</span>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <div style={{ padding: '10px 16px 8px 16px', borderBottom: '1.5px solid #353a4a', display: 'flex', alignItems: 'center' }}>
          <select style={{ background: '#23283a', color: '#e0e6f0', border: '1px solid #353a4a', borderRadius: 4, fontSize: 15, fontWeight: 500, padding: '2px 8px', width: '100%' }} disabled>
            <option>My Watchlist</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            width: '60%',
            height: '3px',
            backgroundColor: 'rgba(46, 52, 72, 0.5)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '40%',
              height: '100%',
              backgroundColor: '#00ffe7',
              borderRadius: '2px',
              position: 'absolute',
              left: '-40%',
              animation: 'watchlist-loading-animation 1.5s linear infinite'
            }}></div>
          </div>
          <div style={{ color: '#8b8fa3', fontSize: '12px', textAlign: 'center' }}>
            Loading watchlist...
          </div>
          <style>{`
            @keyframes watchlist-loading-animation {
              from { left: -40%; }
              to { left: 100%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#23283a', borderRadius: 8, padding: '10px 0 0 0', minWidth: 300, maxWidth: 340, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 16px 8px 16px', borderBottom: '1.5px solid #353a4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, color: '#e0e6f0', fontSize: 18 }}>Watchlist</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {quotesLoading && (
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid #353a4a',
              borderTop: '2px solid #00ffe7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          <span style={{ fontSize: 13, color: '#ffb347', background: '#353a4a', borderRadius: 8, padding: '2px 7px' }}>1</span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      <div style={{ padding: '10px 16px 8px 16px', borderBottom: '1.5px solid #353a4a', display: 'flex', alignItems: 'center' }}>
        <select style={{ background: '#23283a', color: '#e0e6f0', border: '1px solid #353a4a', borderRadius: 4, fontSize: 15, fontWeight: 500, padding: '2px 8px', width: '100%' }} disabled>
          <option>My Watchlist</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div className="watchlist-header" style={{ display: 'flex', fontWeight: 600, color: '#8b8fa3', fontSize: 15, borderBottom: '1px solid #23283a', padding: '0 8px 4px 0', marginBottom: 4, marginTop: 8 }}>
          <div style={{ width: 110, paddingLeft: 15 }}>Name</div>
          <div style={{ flex: 1, textAlign: 'right', paddingRight: 12 }}>Price/Change</div>
        </div>
        {symbols.map((symbol, idx) => {
          const price = Number(quotes[symbol]?.last_price);
          const absChange = Number(quotes[symbol]?.abs_change);
          const pctChange = Number(quotes[symbol]?.pct_change);
          const isPositive = absChange >= 0;
          const isSelected = selectedSymbol === symbol;
          const isHovered = hoveredSymbol === symbol;
          return (
            <div
              key={symbol}
              className="watchlist-row"
              onClick={() => setSelectedSymbol(symbol)}
              onMouseEnter={() => setHoveredSymbol(symbol)}
              onMouseLeave={() => setHoveredSymbol(null)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '4px 0',
                borderBottom: '1px solid #202432',
                fontSize: '1.1rem',
                minHeight: 44,
                marginBottom: '4px',
                cursor: 'pointer',
                background: isSelected
                  ? '#004a40'
                  : isHovered
                  ? '#23283a'
                  : 'none',
                color: isSelected ? '#181c24' : undefined,
                fontWeight: isSelected ? 700 : 500,
                borderLeft: isSelected ? '5px solid #26a69a' : '5px solid transparent',
              }}
            >
              <div style={{ width: 110, paddingLeft: 15, color: '#e0e6f0', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.08rem', fontWeight: 700 }}>{symbol}</span>
                <span style={{ color: '#8b8fa3', fontSize: '0.97rem', marginTop: 0, paddingTop: 0, width: '100%', fontWeight: 400, whiteSpace: 'nowrap' }}>some exchange</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', paddingRight: 12, justifyContent: 'center' }}>
                <span style={{ color: isPositive ? '#26a69a' : '#ef5350', fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {price != null && !isNaN(price) ? price.toFixed(2) : '-'}
                </span>
                <span style={{ color: isPositive ? '#26a69a' : '#ef5350', fontSize: '1rem', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'right', width: '100%' }}>
                  {absChange != null && !isNaN(absChange) ? `${isPositive ? '+' : ''}${absChange.toFixed(2)}` : '-'} {pctChange != null && !isNaN(pctChange) ? `${isPositive ? '+' : ''}${pctChange.toFixed(2)}%` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1.5px solid #353a4a', fontSize: 15, color: '#7ee787', textAlign: 'left', userSelect: 'none', pointerEvents: 'none' }}>
        + Add Symbol
      </div>
    </div>
  );
};

export default Watchlist; 