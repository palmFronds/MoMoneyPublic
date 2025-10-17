import React, {useState} from 'react';
import { Link } from 'react-router-dom';
import '../styles/layout.css';
import Login from './LogAndSign/Login.jsx' ;

const cardData = [
  {
    icon: '🤑',
    title: 'Real-Time $imulations',
    description: "Trade real historical data, like it's the real thing."
  },
  {
    icon: '🎯',
    title: 'Gamified Learning',
    description: 'Learn with XP, milestones, and game-like learning.'
  },
  {
    icon: '🕹️',
    title: 'Track Your Progress',
    description: "Get better every time, trade like it's a game."
  },
  {
    icon: '🪙',
    title: 'Learn by Doing',
    description: '$implified trading that gets you ready for the real thing.'
  }
];


const LandingPage = () => {
  const [showform, setForm] = useState("");

  return (
    <>
    <div className="dashboard-grid">
      {/* Left Nav Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">MoMoney</div>
        <ul className="nav-list">
          <li data-icon="➡️">
            <Link to="#" style={{ color: 'inherit', textDecoration: 'none' }} onClick={() => setForm("login")}>Login</Link>
          </li>
        </ul>
      </nav>

      {showform === "login" && <Login setForm={setForm} />}
      {!showform && (
      <main className="main-content" style={{ padding: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div className="landing-cta">
            <h1>Learn Investing. Game On.</h1>
            <p>$imulate real trades, level up with XP, and master money.</p>
          </div>

          <div className="landing-grid">
            {cardData.map((card, index) => (
              <div key={index} className="landing-card">
                <div className="icon">{card.icon}</div>
                <h4>{card.title}</h4>
                <p>{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      )}
    </div>
    </>
  );
};

export default LandingPage; 