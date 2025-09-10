import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/layout.css';
import '../styles/UnitPath.css';
import { AuthContext } from "./context/AuthContext";
import { getBackendUrl } from '../config/api';
import { getDoc, doc} from "firebase/firestore";
import coinIcon from '../assets/coin.png';
import LessonInfoCard from './LessonInfoCard';

function UnitPath() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { user } = useContext(AuthContext);
  const userID = user?.uid;
  const unit = parseInt(params.get('unit')) || 1;
  const [nodes, setNodes] = useState([]);
  const [unitData, setUnitData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredLesson, setHoveredLesson] = useState(null);
  const [xp, setXp] = useState(1234);
  const [xpGoal] = useState(2000);
  const [streak, setStreak] = useState(7);
  const [dailyGoals] = useState([
    { id: 1, title: "Complete 3 Lessons", progress: 2, target: 3, reward: 50 },
    { id: 2, title: "Earn 100 XP", progress: 75, target: 100, reward: 25 },
    { id: 3, title: "Maintain 7-Day Streak", progress: 7, target: 7, reward: 100 }
  ]);

  useEffect(() => {
    fetch(`http://localhost:8000/level/user/${userID}?unit=${unit}`)
      .then((res) => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNodes(data);
        } else {
          setNodes([]);
        }
      })
      .catch((err) => {
        setNodes([]);
        console.error("Failed to fetch nodes", err);
      });
  }, [userID, unit]);

  useEffect(() => {
    fetch(`http://localhost:8000/units/${unit}`)
      .then((res) => res.json())
      .then(setUnitData)
      .catch((err) => console.error("Failed to fetch unit", err));
  }, [unit]);

  const handleNodeClick = (node) => {
    if (node.unlocked) {
      if (node.type === 'quiz') {
        window.location.href = `/quiz/${node.id}/${unit}`;
      } else if (node.type === 'microlearning') {
        window.location.href = `/microlearning/${node.id}/${unit}`;
      }
    }
  };

  const getNodeTeaser = (node) => {
    switch (node.type) {
      case 'microlearning': return 'Learn key concepts through interactive content';
      case 'quiz': return 'Test your knowledge with challenging questions';
      case 'checkpoint': return 'Review and reinforce your learning';
      default: return 'Master new trading skills';
    }
  };

  const getNodeStatus = (node) => {
    if (node.completed) return { text: 'Completed', class: 'completed' };
    if (node.unlocked) return { text: 'Unlocked', class: 'unlocked' };
    return { text: 'Locked', class: 'locked' };
  };

  return (
    <div className="dashboard-grid">
      {/* Left Nav Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">MoMoney</div>
        <ul className="nav-list">
          <li data-icon="🏠"><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link></li>
          <li data-icon="📚" className="active"><Link to="/learn" style={{ color: 'inherit', textDecoration: 'none' }}>Learn</Link></li>
          <li data-icon="💹"><Link to="/trades" style={{ color: 'inherit', textDecoration: 'none' }}>Trade</Link></li>
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

      {/* Main Content + Right Sidebar Layout */}
      <main className="main-content adventure-main" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh' }}>
        {/* Main Centered Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          {/* Header Row with Lesson Title Card and Lesson Info Card */}
          <div className="lesson-header-row">
            <div className="unit-info-card" style={{ margin: '0 auto', textAlign: 'center', maxWidth: 600 }}>
              <h1 className="unit-title">{unitData?.title || 'Loading...'}</h1>
              <p className="unit-description">{unitData?.content || 'Master the fundamentals of trading through interactive lessons'}</p>
            </div>
            <LessonInfoCard lesson={hoveredLesson} />
          </div>

          {/* Centered Adventure Track */}
          <div className="adventure-track-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300 }}>
            <div className="adventure-track">
              {nodes.length === 0 ? (
                <div className="loading-track">Loading adventure track...</div>
              ) : (
                <>
                  {/* Track Path */}
                  <div className="track-path">
                    <div className="track-line"></div>
                    <div className="track-glow"></div>
                  </div>
                  {/* Coin Nodes */}
                  <div className="coin-nodes">
                    {nodes.map((node, index) => {
                      const status = getNodeStatus(node);
                      return (
                        <div
                          key={node.id}
                          className={`coin-node ${status.class}`}
                          onClick={() => handleNodeClick(node)}
                          onMouseEnter={() => setHoveredLesson(node)}
                          onMouseLeave={() => setHoveredLesson(null)}
                        >
                          <div className="coin-wrapper">
                            <img src={coinIcon} alt="Coin" className="coin-icon" />
                            {node.completed && (
                              <>
                                <div className="completion-sparkle">✨</div>
                                <div className="xp-glow-ring"></div>
                              </>
                            )}
                            {!node.unlocked && (
                              <div className="lock-overlay">🔒</div>
                            )}
                            <div className="node-number">{index + 1}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Centered Stats Below Track */}
          <div className="player-stats" style={{ margin: '0.5rem auto 0 auto', justifyContent: 'center' }}>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-value">{xp}</div>
                <div className="stat-label">Total XP</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-value">{streak}</div>
                <div className="stat-label">Day Streak</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">{nodes.filter(n => n.completed).length}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Daily Missions */}
        <aside className="right-sidebar" style={{ minWidth: 340, maxWidth: 400, marginLeft: 32, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <div className="daily-goals-ribbon">
            <div className="ribbon-header">
              <h3>🎯 Daily Missions</h3>
              <div className="streak-display">
                <span className="streak-flame">🔥</span>
                <span className="streak-count">{streak} Day Streak</span>
              </div>
            </div>
            <div className="mission-cards">
              {dailyGoals.map(goal => {
                const progress = Math.min(goal.progress, goal.target);
                const percentage = (progress / goal.target) * 100;
                return (
                  <div key={goal.id} className="mission-card">
                    <div className="mission-header">
                      <h4>{goal.title}</h4>
                      <div className="mission-reward">+{goal.reward} XP</div>
                    </div>
                    <div className="mission-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <div className="progress-text">{progress}/{goal.target}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default UnitPath;
