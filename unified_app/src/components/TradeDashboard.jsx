import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/layout.css';
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { AuthContext } from './context/AuthContext';
import { getUserSimulationSessions } from '../../firebase_setup/simulationSessionUtils';
import { getBackendUrl } from '../config/api';
import axios from 'axios';
import storeClosedSign from '../assets/pixel-sign-store-closed-8-260nw-2480337137 (1).png';

const mainContentStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  minHeight: '100vh',
  padding: '24px',
  width: '100%',
  background: '#0f1419',
  overflowY: 'auto',
  scrollbarWidth: 'none', /* Firefox */
  msOverflowStyle: 'none', /* IE and Edge */
  '&::-webkit-scrollbar': {
    display: 'none', /* Chrome, Safari and Opera */
  },
};

const innerWrapperStyle = {
  margin: '0 auto',
  width: '100%',
  maxWidth: 1200,
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '8px',
};

const titleStyle = {
  fontFamily: 'Fira Mono, monospace',
  color: '#fff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 8px 0',
};

const subtitleStyle = {
  color: '#8b8fa3',
  fontSize: '16px',
  margin: '0',
  fontWeight: '400',
};

const sessionsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',
  marginBottom: '32px',
};

const cardStyle = {
  background: '#1c212b',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #2e3448',
  transition: 'all 0.2s ease',
  position: 'relative',
  overflow: 'hidden',
};

const activeCardStyle = {
  ...cardStyle,
  border: '1px solid #26a69a',
  boxShadow: '0 4px 12px rgba(38, 166, 154, 0.15)',
};

const inactiveCardStyle = {
  ...cardStyle,
  opacity: '0.8',
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const sessionTitleStyle = {
  fontFamily: 'Fira Mono, monospace',
  fontSize: '20px',
  fontWeight: '600',
  color: '#fff',
  margin: '0',
  lineHeight: '1.2',
};

const pnlStyle = (pnl) => ({
  fontSize: '18px',
  fontWeight: '700',
  color: pnl >= 0 ? '#26a69a' : '#ef5350',
  margin: '0',
  fontFamily: 'Fira Mono, monospace',
});

const statusBadgeStyle = (isActive) => ({
  fontSize: '12px',
  fontWeight: '600',
  padding: '4px 8px',
  borderRadius: '6px',
  background: isActive ? 'rgba(38, 166, 154, 0.2)' : 'rgba(139, 143, 163, 0.2)',
  color: isActive ? '#26a69a' : '#8b8fa3',
  border: `1px solid ${isActive ? '#26a69a' : '#2e3448'}`,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

const progressContainerStyle = {
  marginBottom: '16px',
};

const progressBarStyle = {
  background: '#2e3448',
  borderRadius: '6px',
  height: '8px',
  overflow: 'hidden',
  marginBottom: '8px',
};

const progressFillStyle = (progress) => ({
  height: '100%',
  background: 'linear-gradient(90deg, #26a69a, #7ee787)',
  borderRadius: '6px',
  width: `${progress}%`,
  transition: 'width 0.3s ease',
});

const progressLabelStyle = {
  fontSize: '12px',
  color: '#8b8fa3',
  textAlign: 'center',
  fontFamily: 'Fira Mono, monospace',
};

const metricsStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  fontSize: '14px',
  color: '#e0e6f0',
};

const cashStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#fff',
  fontFamily: 'Fira Mono, monospace',
};

const durationStyle = {
  fontSize: '12px',
  color: '#8b8fa3',
  textAlign: 'center',
  fontFamily: 'Fira Mono, monospace',
};

const enterButtonStyle = {
  width: '100%',
  background: '#26a69a',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'Fira Mono, monospace',
};

const enterButtonHoverStyle = {
  background: '#2bbbad',
  transform: 'translateY(-1px)',
  boxShadow: '0 4px 12px rgba(38, 166, 154, 0.3)',
};

const leaderboardSectionStyle = {
  background: '#1c212b',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #2e3448',
};

const leaderboardTitleStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#fff',
  margin: '0 0 20px 0',
  fontFamily: 'Fira Mono, monospace',
};

const leaderboardTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '16px',
};

const tableHeaderStyle = {
  background: '#2e3448',
  color: '#8b8fa3',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid #3e4458',
};

const tableRowStyle = {
  borderBottom: '1px solid #2e3448',
  transition: 'background 0.2s ease',
};

const tableCellStyle = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#e0e6f0',
};

const rankCellStyle = (rank) => ({
  ...tableCellStyle,
  fontWeight: '600',
  color: rank <= 3 ? '#ffd700' : '#e0e6f0',
});

const pnlCellStyle = (pnl) => ({
  ...tableCellStyle,
  color: pnl >= 0 ? '#26a69a' : '#ef5350',
  fontWeight: '600',
  fontFamily: 'Fira Mono, monospace',
});

const comingSoonStyle = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#8b8fa3',
};

const comingSoonTitleStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#fff',
  margin: '0 0 8px 0',
  fontFamily: 'Fira Mono, monospace',
};

const comingSoonTextStyle = {
  fontSize: '14px',
  color: '#8b8fa3',
  margin: '0 0 16px 0',
};

const timestampStyle = {
  fontSize: '12px',
  color: '#6b7280',
  fontStyle: 'italic',
};

// Custom hook for learn page navigation with auto-refresh
const useLearnPageNavigation = () => {
  const navigate = useNavigate();
  
  const navigateToLearn = () => {
    navigate('/learn');
    // Small delay to ensure navigation completes, then refresh
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };
  
  return navigateToLearn;
};

const TradeDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingSession, setActivatingSession] = useState(null);
  const { user } = useContext(AuthContext);
  const navigateToLearn = useLearnPageNavigation();

  // Fetch user's simulation sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (user?.uid) {
        try {
          setLoading(true);
          const userSessions = await getUserSimulationSessions(user.uid);
          setSessions(userSessions);
        } catch (error) {
          console.error('Error fetching simulation sessions:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSessions();
  }, [user?.uid]);

  // Get user name or email for greeting
  const userName = user?.displayName || user?.email || 'Trader';

  // Format P&L
  const formatPnL = (pnl) => {
    const absValue = Math.abs(pnl);
    if (absValue >= 1000000) {
      return `${pnl >= 0 ? '+' : '-'}$${(absValue / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `${pnl >= 0 ? '+' : '-'}$${(absValue / 1000).toFixed(0)}K`;
    } else {
      return `${pnl >= 0 ? '+' : '-'}$${absValue.toFixed(0)}`;
    }
  };

  // Calculate progress and time remaining
  const calculateProgress = (session) => {
    if (!session.is_active) return 0;
    const totalTicks = Math.round((session.duration_seconds / 86400) * 780);
    return totalTicks > 0 ? (session.current_tick / totalTicks) * 100 : 0;
  };

  const formatTimeRemaining = (session) => {
    if (!session.is_active) return 'Not started';
    
    const totalTicks = Math.round((session.duration_seconds / 86400) * 780);
    const remainingTicks = totalTicks - session.current_tick;
    const remainingSeconds = (remainingTicks / totalTicks) * session.duration_seconds;
    
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    
    return `${hours}h ${minutes}m remaining`;
  };

  const handleContinueSession = async (sessionId) => {
    try {
      setActivatingSession(sessionId);
      
      const response = await axios.post(getBackendUrl('/sim/activate-session'), {
        session_id: sessionId
      });
      
      if (response.data.success) {
        console.log('Session activated successfully for continuation:', response.data.message);
        window.location.href = `/trading?session=${sessionId}`;
      } else {
        console.error('Failed to activate session for continuation');
        alert('Failed to activate session. Please try again.');
      }
    } catch (error) {
      console.error('Error activating session for continuation:', error);
      alert('Failed to activate session. Please try again.');
    } finally {
      setActivatingSession(null);
    }
  };

  // Mock leaderboard data
  const leaderboardData = [
    { rank: 1, username: "TradingPro", pnl: 125000 },
    { rank: 2, username: "MarketMaster", pnl: 98000 },
    { rank: 3, username: "StockWizard", pnl: 87500 },
    { rank: 4, username: "FinanceGuru", pnl: 72000 },
    { rank: 5, username: "InvestorElite", pnl: 65000 },
    { rank: 6, username: userName, pnl: 45000 },
    { rank: 7, username: "TradingNewbie", pnl: 32000 },
    { rank: 8, username: "MarketLearner", pnl: 28000 },
  ];

  if (loading) {
    return (
      <div className="dashboard-grid">
        <nav className="nav-bar">
          <div className="nav-logo">MoMoney</div>
          <ul className="nav-list">
            <li data-icon="🏠"><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link></li>
            <li data-icon="📚" onClick={navigateToLearn} style={{ cursor: 'pointer' }}>Learn</li>
            <li data-icon="💹" className="active"><Link to="/trades" style={{ color: 'inherit', textDecoration: 'none' }}>Trade</Link></li>
            <li data-icon="🤖"><Link to="/AIChat" style={{ color: 'inherit', textDecoration: 'none' }}>MO AI</Link></li>
            <li data-icon="🏆">
              <div className="nav-item-with-sub">
                <span>Leaderboard</span>
                <span className="coming-soon">coming soon!</span>
              </div>
            </li>
            <li data-icon="🎯">
              <div className="nav-item-with-sub">
                <span>Quests</span>
                <span className="coming-soon">coming soon!</span>
              </div>
            </li>
            <li data-icon="✨">
              <div className="nav-item-with-sub">
              <span>Achievements</span>
              <span className="coming-soon">coming soon!</span>
            </div>
          </li>
          </ul>
        </nav>
        <main className="main-content" style={mainContentStyle}>
          <div style={innerWrapperStyle}>
            <div style={headerStyle}>
              <h1 style={titleStyle}>Loading your trading sessions...</h1>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      {/* Left Nav Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">MoMoney</div>
        <ul className="nav-list">
            <li data-icon="🏠"><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link></li>
          <li data-icon="📚" onClick={navigateToLearn} style={{ cursor: 'pointer' }}>Learn</li>
          <li data-icon="💹" className="active"><Link to="/trades" style={{ color: 'inherit', textDecoration: 'none' }}>Trade</Link></li>
          <li data-icon="🤖"><Link to="/AIChat" style={{ color: 'inherit', textDecoration: 'none' }}>MO AI</Link></li>
          <li data-icon="🏆">
            <div className="nav-item-with-sub">
              <span>Leaderboard</span>
              <span className="coming-soon">coming soon</span>
            </div>
          </li>
          <li data-icon="🎯">
            <div className="nav-item-with-sub">
              <span>Quests</span>
              <span className="coming-soon">coming soon</span>
            </div>
          </li>
          <li data-icon="✨">
            <div className="nav-item-with-sub">
              <span>Achievements</span>
              <span className="coming-soon">coming soon</span>
            </div>
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content" style={{
        ...mainContentStyle,
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <div style={innerWrapperStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <h1 style={titleStyle}>Trading Dashboard 🪙</h1>
            <p style={subtitleStyle}>Welcome back, {userName}! Time to make Mo Money.</p>
          </div>
          
          {/* Sessions Grid */}
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8b8fa3', fontSize: '16px', padding: '40px' }}>
              No simulation sessions found. Create your first session to start trading!
            </div>
          ) : (
            <div style={sessionsGridStyle}>
              {sessions.map((session) => {
                const progress = calculateProgress(session);
                const totalTicks = Math.round((session.duration_seconds / 86400) * 780);
                
                return (
                  <div
                    key={session.id}
                    style={session.is_active ? activeCardStyle : inactiveCardStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = session.is_active 
                        ? '0 4px 12px rgba(38, 166, 154, 0.15)' 
                        : 'none';
                    }}
                  >
                    {/* Card Header */}
                    <div style={cardHeaderStyle}>
                      <div>
                        <h3 style={sessionTitleStyle}>{session.label}</h3>
                        {session.label === 'Practice Session 2' && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#8b8fa3', 
                            marginTop: '4px',
                            fontStyle: 'italic',
                            textAlign: 'left'
                          }}>
                            Coming Soon
                          </div>
                        )}
                      </div>
                      <span style={statusBadgeStyle(session.is_active)}>
                        {session.is_active ? (
                          <>
                            🔓 Unlocked
                          </>
                        ) : (
                          <>
                            🔒 Locked
                          </>
                        )}
                      </span>
                    </div>

                    {/* P&L */}
                    <div style={{ marginBottom: '16px' }}>
                      <p style={pnlStyle(session.pnl)}>P&L: {formatPnL(session.pnl)}</p>
                    </div>

                    {/* Progress Bar */}
                    <div style={progressContainerStyle}>
                      <div style={progressBarStyle}>
                        <div style={progressFillStyle(progress)}></div>
                      </div>
                      <div style={progressLabelStyle}>
                        Tick {session.current_tick} / {totalTicks}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div style={metricsStyle}>
                      <span>Cash: <span style={cashStyle}>${session.cash.toLocaleString()}</span></span>
                      <span>{formatTimeRemaining(session)}</span>
                    </div>

                    {/* Duration */}
                    <div style={durationStyle}>
                      Duration: {(session.duration_seconds / 3600).toFixed(1)} hours
                    </div>

                    {/* Store Closed Sign Overlay - Only for locked sessions */}
                    {!session.is_active && (
                      <img 
                        src={storeClosedSign}
                        alt="Store Closed"
                        style={{
                          position: 'absolute',
                          bottom: '20px',
                          right: '20px',
                          width: '110px',
                          height: 'auto',
                          pointerEvents: 'none',
                          zIndex: 1,
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                          transform: 'rotate(-5deg)',
                        }}
                      />
                    )}

                    {/* Enter Button - Only for active sessions */}
                    {session.is_active && (
                      <button
                        style={enterButtonStyle}
                        onMouseEnter={(e) => {
                          Object.assign(e.target.style, enterButtonHoverStyle);
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#26a69a';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                        onClick={() => handleContinueSession(session.id)}
                        disabled={activatingSession === session.id}
                      >
                        {activatingSession === session.id ? 'Entering...' : 'Enter Session'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Section */}
          <div style={leaderboardSectionStyle}>
            <h2 style={leaderboardTitleStyle}>🏆 Leaderboard</h2>
            
            <div style={comingSoonStyle}>
              <h3 style={comingSoonTitleStyle}>Coming Soon</h3>
              <p style={comingSoonTextStyle}>
                Compete with other traders and climb the ranks. Leaderboard updates weekly.
              </p>
              
              {/* Preview Table */}
              <table style={leaderboardTableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Rank</th>
                    <th style={tableHeaderStyle}>Username</th>
                    <th style={tableHeaderStyle}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.slice(0, 8).map((entry) => (
                    <tr key={entry.rank} style={tableRowStyle}>
                      <td style={rankCellStyle(entry.rank)}>
                        {entry.rank <= 3 && (
                          <span style={{ marginRight: '8px' }}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                        #{entry.rank}
                      </td>
                      <td style={tableCellStyle}>
                        {entry.username === userName ? (
                          <span style={{ fontWeight: '600', color: '#26a69a' }}>
                            {entry.username} (You)
                          </span>
                        ) : (
                          entry.username
                        )}
                      </td>
                      <td style={pnlCellStyle(entry.pnl)}>P&L: {formatPnL(entry.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <p style={timestampStyle}>
                Last updated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TradeDashboard;