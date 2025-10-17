import React, { useState, useEffect, useContext, useRef, createRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/layout.css';
import '../styles/UnitPath.css';
import { AuthContext } from "./context/AuthContext";
import coinIcon from '../assets/coin.png';
import { db } from "../../firebase_setup/firebase";
import { collection, doc, getDocs, setDoc, query, where } from "firebase/firestore";
import UnitInfoCard from './UnitInfoCard';

const UnitDashboard = () => {
  const [units, setUnits] = useState([]);
  const [userProgress, setUserProgress] = useState([]); // Store unlocked levels
  const [hoveredUnit, setHoveredUnit] = useState(null);
  const coinRefs = useRef([]);
  const [xp, setXp] = useState(1234);
  const [streak, setStreak] = useState(7);
  const [dailyGoals] = useState([
    { id: 1, title: "Complete 3 Lessons", progress: 2, target: 3, reward: 50 },
    { id: 2, title: "Earn 100 XP", progress: 75, target: 100, reward: 25 },
    { id: 3, title: "Maintain 7-Day Streak", progress: 7, target: 7, reward: 100 }
  ]);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userID = user?.uid;

  useEffect(() => {
    fetch("http://localhost:8000/units/")
      .then((res) => res.json())
      .then(setUnits)
      .catch((err) => console.error("Failed to fetch units", err));
  }, []);

  // Fetch or create user unit progress in Firestore
  useEffect(() => {
    if (!userID || units.length === 0) return;
    const fetchOrCreateUserUnitProgress = async () => {
      const progressRef = collection(db, "user_unit_progress");
      const q = query(progressRef, where("uid", "==", userID));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Progress exists, load it
        const progressArr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserProgress(progressArr);
      } else {
        // Progress does not exist, create it for all units (only first unlocked)
        const progressArr = units.map((unit, idx) => ({
          uid: userID,
          unit_id: unit.id,
          unlocked: idx === 0,
          completed: false,
        }));
        // Batch create
        await Promise.all(progressArr.map(async (progress) => {
          await setDoc(doc(progressRef), progress);
        }));
        setUserProgress(progressArr);
      }
    };
    fetchOrCreateUserUnitProgress();
  }, [userID, units]);

  // Ensure refs array matches units length
  useEffect(() => {
    if (units.length !== coinRefs.current.length) {
      coinRefs.current = Array(units.length).fill().map((_, i) => coinRefs.current[i] || createRef());
    }
  }, [units.length]);

  // Helper: Check if a unit is unlocked/completed
  const getUnitStatus = (unitId) => {
    const progress = userProgress.find(p => p.unit_id === unitId);
    if (!progress) return { unlocked: false, completed: false };
    return { unlocked: progress.unlocked, completed: progress.completed };
  };

  const handleGoToUnit = (unitId, unlocked) => {
    if (unlocked) {
      navigate(`/unitpath?unit=${unitId}`);
    }
  };

  useEffect(() => {
    if (coinRefs.current[0] && coinRefs.current[0].current) {
      coinRefs.current[0].current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [units]);

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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '0vh' }}>
          {/* Header Row with Info Card and Title */}
          <div className="unit-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            <UnitInfoCard unit={hoveredUnit} />
            <div className="unit-info-card">
              <h1 className="unit-title">Learning Path</h1>
              <p className="unit-description">Select a unit to start your journey</p>
            </div>
          </div>

          {/* Centered Adventure Track for Units */}
          <div className="adventure-track-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300, paddingTop: '90px' }}>
            <div className="adventure-track">
              {units.length === 0 ? (
                <div className="loading-track">Loading units...</div>
              ) : (
                <>
                  <div className="adventure-track-scroll" style={{ position: 'relative', zIndex: 1000 }}>
                    <div className="coin-nodes">
                      {units.map((unit, index) => {
                        const { unlocked, completed } = getUnitStatus(unit.id);
                        return (
                          <div
                            key={unit.id}
                            className={`coin-node${unlocked ? ' unlocked' : ' locked'}${completed ? ' completed' : ''}`}
                            onClick={() => handleGoToUnit(unit.id, unlocked)}
                            onMouseEnter={() => setHoveredUnit({ ...unit, ...getUnitStatus(unit.id) })}
                            onMouseLeave={() => setHoveredUnit(null)}
                            ref={coinRefs.current[index]}
                          >
                            <div className="coin-wrapper">
                              <img src={coinIcon} alt="Coin" className="coin-icon" />
                              {completed && (
                                <>
                                  <div className="completion-sparkle">✨</div>
                                  <div className="xp-glow-ring"></div>
                                </>
                              )}
                              {!unlocked && (
                                <div className="lock-overlay">🔒</div>
                              )}
                              <div className="node-number">{index + 1}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Track Path */}
                  <div className="track-path">
                    <div className="track-line"></div>
                    <div className="track-glow"></div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Centered Stats Below Track */}
          <div className="player-stats" style={{ margin: '0 auto 0 auto', justifyContent: 'center' }}>
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
                <div className="stat-value">{units.filter(u => getUnitStatus(u.id).completed).length}</div>
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
};

export default UnitDashboard;