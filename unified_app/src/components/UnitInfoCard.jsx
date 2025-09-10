import React from 'react';
import '../styles/UnitPath.css';

const UnitInfoCard = ({ unit }) => {
  const status = unit
    ? unit.completed
      ? 'Completed'
      : unit.unlocked
        ? 'Unlocked'
        : 'Locked'
    : null;
  return (
    <div className="unit-info-card-card">
      <h3>{unit ? unit.title : 'Go on then.'}</h3>
      <p>{unit ? unit.description : 'Hover over a unit to see its details'}</p>
      {unit && (
        <>
          <div className={`status-badge${unit.completed ? ' completed' : unit.unlocked ? ' unlocked' : ' locked'}`}>{status}</div>
          <div className="xp-reward">
            <span className="xp-icon">⭐</span>
            <span className="xp-amount">+{unit.xp_reward || 100} XP</span>
          </div>
        </>
      )}
    </div>
  );
};

export default UnitInfoCard; 