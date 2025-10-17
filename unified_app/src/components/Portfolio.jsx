import React, { useState, useContext } from 'react';
import { simulationSeshApi } from '../services/simulationSeshApi';
import { AuthContext } from './context/AuthContext';

const Portfolio = ({ positions, sessionCash, loading = false, watchlistLoading = false }) => {
  const { user } = useContext(AuthContext);
  
  // Get session ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('session');
  
  console.log('Portfolio component received:', { positions, sessionCash, loading, watchlistLoading });
  console.log('Portfolio: Using session ID:', sessionIdFromUrl);
  console.log('Positions length:', positions ? positions.length : 'positions is null/undefined');
  console.log('Positions type:', typeof positions);
  console.log('Session cash:', sessionCash);
  
  // Show loading state if either loading prop is true
  const isAnyLoading = loading || watchlistLoading;
  
  // Log each position's exit conditions
  if (Array.isArray(positions)) {
    positions.forEach((position, index) => {
      console.log(`Position ${index} (${position.symbol}):`, {
        symbol: position.symbol,
        stop_loss_price: position.stop_loss_price,
        take_profit_price: position.take_profit_price,
        holdings: position.holdings
      });
    });
  }
  
  // State for inline editing
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValues, setEditValues] = useState({ stopLoss: '', takeProfit: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local state for optimistic updates
  const [localPositions, setLocalPositions] = useState(positions);
  
  // Update local positions when props change
  React.useEffect(() => {
    if (positions && Array.isArray(positions)) {
      setLocalPositions(positions);
    }
  }, [positions]);
  
  // Use localPositions for rendering instead of positions prop
  const displayPositions = localPositions || positions || [];
  
  // Check if positions is an array and has data
  const hasPositions = Array.isArray(displayPositions) && displayPositions.length > 0;
  console.log('Has positions:', hasPositions, 'Positions length:', displayPositions.length);
  
  // Calculate total portfolio value
  const totalValue = displayPositions.reduce((sum, position) => {
    return sum + (position.market_value || 0);
  }, 0);

  // Calculate total P&L
  const totalPnL = displayPositions.reduce((sum, position) => {
    return sum + (position.pnl || 0);
  }, 0);

  // Handle edit button click
  const handleEditClick = (position) => {
    setEditingPosition(position.symbol);
    setEditValues({
      stopLoss: position.stop_loss_price ? position.stop_loss_price.toString() : '',
      takeProfit: position.take_profit_price ? position.take_profit_price.toString() : ''
    });
  };

  // Handle save changes
  const handleSaveChanges = async (position) => {
    if (!sessionIdFromUrl) {
      alert('No session ID available. Please refresh the page.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const currentPrice = position.current_price || position.last_price || 0;
      
      // Validation
      const stopLoss = parseFloat(editValues.stopLoss);
      const takeProfit = parseFloat(editValues.takeProfit);
      
      if (editValues.stopLoss && (isNaN(stopLoss) || stopLoss >= currentPrice)) {
        alert('Stop loss must be below the current price');
        return;
      }
      
      if (editValues.takeProfit && (isNaN(takeProfit) || takeProfit <= currentPrice)) {
        alert('Take profit must be above the current price');
        return;
      }
      
      // Call API to update exit conditions
      const response = await simulationSeshApi.setExitConditions({
        session_id: sessionIdFromUrl,
        user_id: user?.uid,
        symbol: position.symbol,
        stop_loss: editValues.stopLoss ? stopLoss : null,
        take_profit: editValues.takeProfit ? takeProfit : null,
      });
      
      console.log('Exit conditions updated successfully:', response.data);
      
      // Close editing mode
      setEditingPosition(null);
      setEditValues({ stopLoss: '', takeProfit: '' });
      
      // Trigger portfolio refresh
      if (window.refreshPortfolio) {
        console.log('Triggering portfolio refresh after save...');
        window.refreshPortfolio();
      } else {
        console.warn('window.refreshPortfolio is not available after save');
      }
      
    } catch (error) {
      console.error('Error updating exit conditions:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update exit conditions';
      alert(`Failed to update exit conditions: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingPosition(null);
    setEditValues({ stopLoss: '', takeProfit: '' });
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle remove exit condition
  const handleRemoveExitCondition = async (position, type) => {
    if (!sessionIdFromUrl) {
      alert('No session ID available. Please refresh the page.');
      return;
    }
    
    try {
      console.log('Removing exit condition:', { position, type });
      
      // Optimistically update the local state immediately for instant UI feedback
      setLocalPositions(prevPositions => {
        return prevPositions.map(pos => {
          if (pos.symbol === position.symbol) {
            const updatedPosition = { ...pos };
            if (type === 'stopLoss') {
              updatedPosition.stop_loss_price = null;
            } else if (type === 'takeProfit') {
              updatedPosition.take_profit_price = null;
            }
            return updatedPosition;
          }
          return pos;
        });
      });
      
      console.log('🔄 Optimistically updated positions for immediate UI feedback');
      
      const updateData = {
        session_id: sessionIdFromUrl,
        user_id: user?.uid,
        symbol: position.symbol,
        stop_loss: type === 'stopLoss' ? null : position.stop_loss_price,
        take_profit: type === 'takeProfit' ? null : position.take_profit_price,
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await simulationSeshApi.setExitConditions(updateData);
      
      console.log('Exit condition removed successfully:', response.data);
      
      // Trigger portfolio refresh to ensure data consistency with server
      if (window.refreshPortfolio) {
        console.log('Triggering portfolio refresh...');
        window.refreshPortfolio();
      } else {
        console.warn('window.refreshPortfolio is not available');
      }
      
    } catch (error) {
      console.error('Error removing exit condition:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to remove exit condition';
      alert(`Failed to remove exit condition: ${errorMessage}`);
      
      // If the API call fails, revert the optimistic update by refreshing
      if (window.refreshPortfolio) {
        console.log('🔄 Refreshing portfolio after error to restore correct state');
        window.refreshPortfolio();
      }
    }
  };

  return (
    <div style={{ 
      background: '#23283a', 
      borderRadius: 8, 
      padding: 16, 
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Portfolio Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        borderBottom: '1px solid #2e3448',
        paddingBottom: 12
      }}>
        <h3 style={{ margin: 0, color: '#e0e6f0', fontSize: 16 }}>Portfolio</h3>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#8b8fa3', fontSize: 12 }}>Total Value</div>
          <div style={{ color: '#e0e6f0', fontSize: 16, fontWeight: 'bold' }}>
            ${(totalValue + sessionCash).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Cash Balance */}
      <div style={{ 
        background: '#2a2e39', 
        borderRadius: 6, 
        padding: 12, 
        marginBottom: 16,
        border: '1px solid #2e3448'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#8b8fa3', fontSize: 12 }}>Cash 🪙</div>
            <div style={{ color: '#e0e6f0', fontSize: 14, fontWeight: 'bold' }}>
              ${sessionCash.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#8b8fa3', fontSize: 12 }}>Total P&L 💰</div>
            <div style={{ 
              color: totalPnL >= 0 ? '#7ee787' : '#ff6b81', 
              fontSize: 14, 
              fontWeight: 'bold' 
            }}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 8,
          padding: '0 4px'
        }}>
          <span style={{ color: '#8b8fa3', fontSize: 12, fontWeight: 'bold' }}>Positions</span>
          <span style={{ color: '#8b8fa3', fontSize: 12 }}>{displayPositions.length} holdings</span>
        </div>
        
        {isAnyLoading ? (
          <div style={{ 
            background: '#2a2e39', 
            borderRadius: 6, 
            padding: '24px 16px',
            border: '1px solid #2e3448',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
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
                animation: 'portfolio-loading-animation 1.5s linear infinite'
              }}></div>
            </div>
            <div style={{ color: '#8b8fa3', fontSize: '12px', textAlign: 'center' }}>
              Loading portfolio data...
            </div>
            <style>{`
              @keyframes portfolio-loading-animation {
                from { left: -40%; }
                to { left: 100%; }
              }
            `}</style>
          </div>
        ) : displayPositions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#8b8fa3', 
            padding: '32px 16px',
            fontSize: 14
          }}>
            No positions yet
          </div>
        ) : (
          <div style={{ 
            background: '#2a2e39', 
            borderRadius: 6, 
            overflow: 'hidden',
            border: '1px solid #2e3448'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#23283a', borderBottom: '1px solid #2e3448' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Symbol</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Avg</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>P&L</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Stop</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Target</th>
                  <th style={{ textAlign: 'center', padding: '8px', color: '#e0e6f0', fontSize: 11, fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayPositions
                  .filter(position => position.holdings > 0)
                  .map((position, index) => {
                    console.log(`🔄 Rendering position ${index}: ${position.symbol}, stop_loss: ${position.stop_loss_price}, take_profit: ${position.take_profit_price}`);
                    return (
                    <tr key={index} style={{ borderBottom: '1px solid #2e3448' }}>
                      <td style={{ padding: '8px', color: '#e0e6f0', fontSize: 12, fontWeight: 'bold' }}>
                        {position.symbol}
                      </td>
                      <td style={{ padding: '8px', color: '#e0e6f0', fontSize: 12, textAlign: 'right' }}>
                        {position.holdings}
                      </td>
                      <td style={{ padding: '8px', color: '#e0e6f0', fontSize: 12, textAlign: 'right' }}>
                        ${(position.avg_price || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', color: '#e0e6f0', fontSize: 12, textAlign: 'right' }}>
                        ${(position.current_price || position.last_price || 0).toFixed(2)}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        color: (position.pnl || 0) >= 0 ? '#7ee787' : '#ff6b81', 
                        fontSize: 12, 
                        textAlign: 'right',
                        fontWeight: 'bold'
                      }}>
                        {position.pnl >= 0 ? '+' : ''}${(position.pnl || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', color: '#e0e6f0', fontSize: 12, textAlign: 'right' }}>
                        {editingPosition === position.symbol ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.stopLoss}
                            onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                            style={{
                              width: '60px',
                              background: '#23283a',
                              border: '1px solid #2e3448',
                              color: '#e0e6f0',
                              fontSize: 11,
                              padding: '2px 4px',
                              borderRadius: 3,
                              textAlign: 'right'
                            }}
                            placeholder="0.00"
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <span>{position.stop_loss_price ? `$${position.stop_loss_price.toFixed(2)}` : '-'}</span>
                            {position.stop_loss_price && (
                              <button
                                onClick={() => {
                                  console.log('🔄 Remove stop loss button clicked for:', position.symbol);
                                  handleRemoveExitCondition(position, 'stopLoss');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ff6b81',
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  padding: '0 2px'
                                }}
                                title="Remove stop loss"
                              >
                                ×
                              </button>
                            )}
                            {!position.stop_loss_price && console.log('🔄 No stop loss button for:', position.symbol)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', color: '#e0e6f0', fontSize: 12, textAlign: 'right' }}>
                        {editingPosition === position.symbol ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.takeProfit}
                            onChange={(e) => handleInputChange('takeProfit', e.target.value)}
                            style={{
                              width: '60px',
                              background: '#23283a',
                              border: '1px solid #2e3448',
                              color: '#e0e6f0',
                              fontSize: 11,
                              padding: '2px 4px',
                              borderRadius: 3,
                              textAlign: 'right'
                            }}
                            placeholder="0.00"
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <span>{position.take_profit_price ? `$${position.take_profit_price.toFixed(2)}` : '-'}</span>
                            {position.take_profit_price && (
                              <button
                                onClick={() => {
                                  console.log('🔄 Remove take profit button clicked for:', position.symbol);
                                  handleRemoveExitCondition(position, 'takeProfit');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ff6b81',
                                  cursor: 'pointer',
                                  fontSize: 10,
                                  padding: '0 2px'
                                }}
                                title="Remove take profit"
                              >
                                ×
                              </button>
                            )}
                            {!position.take_profit_price && console.log('🔄 No take profit button for:', position.symbol)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {editingPosition === position.symbol ? (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleSaveChanges(position)}
                              disabled={isSubmitting}
                              style={{
                                background: '#26a69a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 3,
                                padding: '2px 6px',
                                fontSize: 10,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.6 : 1
                              }}
                            >
                              {isSubmitting ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSubmitting}
                              style={{
                                background: '#2e3448',
                                color: '#e0e6f0',
                                border: 'none',
                                borderRadius: 3,
                                padding: '2px 6px',
                                fontSize: 10,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(position)}
                            style={{
                              background: '#2e3448',
                              color: '#e0e6f0',
                              border: 'none',
                              borderRadius: 3,
                              padding: '2px 6px',
                              fontSize: 10,
                              cursor: 'pointer'
                            }}
                            title="Edit stop loss and take profit"
                          >
                            ✏️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
