import React from 'react';
import '../styles/UnitPath.css';

const LessonInfoCard = ({ lesson }) => {
  const status = lesson
    ? lesson.completed
      ? 'Completed'
      : lesson.unlocked
        ? 'Unlocked'
        : 'Locked'
    : null;
  return (
    <div className="lesson-info-card-card">
      <h3>{lesson ? lesson.title : 'No Lesson Selected'}</h3>
      <p>{lesson ? lesson.description : 'Hover over a lesson to see its details'}</p>
      {lesson && (
        <>
          <div className={`status-badge${lesson.completed ? ' completed' : lesson.unlocked ? ' unlocked' : ' locked'}`}>{status}</div>
          <div className="xp-reward">
            <span className="xp-icon">⭐</span>
            <span className="xp-amount">+{lesson.xp_reward || 100} XP</span>
          </div>
        </>
      )}
    </div>
  );
};

export default LessonInfoCard; 