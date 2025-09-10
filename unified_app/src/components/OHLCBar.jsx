import React from 'react';

const OHLCBar = ({ ohlc, symbol, watchlistLoading = false }) => {
  if (!ohlc || watchlistLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#2a2e39',
        padding: '8px 16px',
        borderRadius: '6px',
        marginBottom: '12px',
        border: '1px solid #353a4a'
      }}>
        <span style={{ color: '#8b8fa3', fontSize: '14px', fontWeight: '500' }}>
          {symbol} - {watchlistLoading ? 'Loading market data...' : 'Loading OHLC data...'}
        </span>
        {watchlistLoading && (
          <div style={{
            width: '12px',
            height: '12px',
            border: '2px solid #353a4a',
            borderTop: '2px solid #00ffe7',
            borderRadius: '50%',
            animation: 'ohlc-spin 1s linear infinite'
          }} />
        )}
        <style>{`
          @keyframes ohlc-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const { open, high, low, close, volume } = ohlc;
  
  // Calculate price change and percentage
  const priceChange = close - open;
  const priceChangePercent = open !== 0 ? ((priceChange / open) * 100) : 0;
  const isPositive = priceChange >= 0;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#2a2e39',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '12px',
      border: '1px solid #353a4a'
    }}>
      {/* Symbol and current price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#e0e6f0', fontSize: '16px', fontWeight: '600' }}>
          {symbol}
        </span>
        <span style={{ 
          color: isPositive ? '#26a69a' : '#ef5350', 
          fontSize: '18px', 
          fontWeight: '700' 
        }}>
          ${close?.toFixed(2) || '0.00'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ 
            color: isPositive ? '#26a69a' : '#ef5350', 
            fontSize: '14px', 
            fontWeight: '500' 
          }}>
            {isPositive ? '+' : ''}{priceChange?.toFixed(2) || '0.00'}
          </span>
          <span style={{ 
            color: isPositive ? '#26a69a' : '#ef5350', 
            fontSize: '14px', 
            fontWeight: '500' 
          }}>
            ({isPositive ? '+' : ''}{priceChangePercent?.toFixed(2) || '0.00'}%)
          </span>
        </div>
      </div>

      {/* OHLC values */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#8b8fa3', fontSize: '11px', fontWeight: '500', marginBottom: '2px' }}>
            OPEN
          </div>
          <div style={{ color: '#e0e6f0', fontSize: '14px', fontWeight: '600' }}>
            ${open?.toFixed(2) || '0.00'}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#8b8fa3', fontSize: '11px', fontWeight: '500', marginBottom: '2px' }}>
            HIGH
          </div>
          <div style={{ color: '#26a69a', fontSize: '14px', fontWeight: '600' }}>
            ${high?.toFixed(2) || '0.00'}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#8b8fa3', fontSize: '11px', fontWeight: '500', marginBottom: '2px' }}>
            LOW
          </div>
          <div style={{ color: '#ef5350', fontSize: '14px', fontWeight: '600' }}>
            ${low?.toFixed(2) || '0.00'}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#8b8fa3', fontSize: '11px', fontWeight: '500', marginBottom: '2px' }}>
            CLOSE
          </div>
          <div style={{ color: '#e0e6f0', fontSize: '14px', fontWeight: '600' }}>
            ${close?.toFixed(2) || '0.00'}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#8b8fa3', fontSize: '11px', fontWeight: '500', marginBottom: '2px' }}>
            VOL
          </div>
          <div style={{ color: '#e0e6f0', fontSize: '14px', fontWeight: '600' }}>
            {volume?.toLocaleString() || '0'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OHLCBar; 