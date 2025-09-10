import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/QuizViewer.css';
import {AuthContext} from "./context/AuthContext";
import { getBackendUrl } from '../config/api.js';

export default function QuizViewer() {
  const { levelId, unit } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userID = user?.uid;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/quiz/api/${levelId}?user_id=${userID}&unit=${unit}`);
        if (!response.ok) throw new Error('Failed to load quiz');
        const data = await response.json();
        setQuestions(data.questions || []);
        setCurrentIndex(0);
        setSelectedOption(null);
        setShowExplanation(false);
        setExplanation('');
        setIsCorrect(null);
        setCorrectOptionId(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [levelId, unit, userID]);

  const handleOptionSelect = (optionId) => setSelectedOption(optionId);

  const handleSubmitAnswer = async () => {
    if (!selectedOption) return;
    const question = questions[currentIndex];
    try {
      const response = await fetch('http://localhost:8000/quiz/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level_id: parseInt(levelId),
          question_order: question.order,
          question_id: question.id,  // <-- send this now
          selected_option_id: selectedOption,
          user_id: userID,
          unit: parseInt(unit)
        })
      });
      
      if (!response.ok) throw new Error('Failed to submit answer');
      const result = await response.json();
      setExplanation(result.explanation);
      setIsCorrect(result.is_correct);
      setCorrectOptionId(result.correct_option_id);
      setShowExplanation(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setExplanation('');
      setIsCorrect(null);
      setCorrectOptionId(null);
    } else {
      // Mark level as completed and unlock next, then navigate based on backend response
      try {
        const response = await fetch(getBackendUrl(`/level/api/complete`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userID,
            level_id: parseInt(levelId)
          })
        });
        const data = await response.json();
        // Handle redirection based on backend response (same as MicrolearningViewer)
        if (data.redirect === 'next_level' && data.next_level) {
          if (data.next_level_type === 'quiz') {
            navigate(`/quiz/${data.next_level}/${unit}`);
          } else {
            navigate(`/microlearning/${data.next_level}/${unit}`);
          }
        } else if (data.redirect === 'next_unit' && data.next_level && data.next_unit) {
          if (data.next_level_type === 'quiz') {
            navigate(`/quiz/${data.next_level}/${data.next_unit}`);
          } else {
            navigate(`/microlearning/${data.next_level}/${data.next_unit}`);
          }
        } else if (data.redirect === 'dashboard') {
          navigate('/learn'); // or '/unitdashboard' if that's your dashboard route
        } else {
          // fallback: go to unit path
          navigate(`/unitpath?unit=${unit}`);
        }
      } catch (e) {
        // Optionally handle error (show message, etc)
        navigate(`/unitpath?unit=${unit}`);
      }
    }
  };

  if (loading) return <div className="quiz-viewer"><div className="loading">Loading quiz...</div></div>;
  if (error) return <div className="quiz-viewer"><div className="error">Error: {error}</div></div>;
  if (!questions.length) return <div className="quiz-viewer"><div className="error">No questions found.</div></div>;

  const question = questions[currentIndex];

  return (
    <div className="quiz-viewer">
      <div className="quiz-box">
        <div className="close-btn" onClick={() => navigate(`/unitpath?unit=${unit}`)}>×</div>
        <div className="quiz-content">
          <div className="top-bar">
            <div className="image-container" id="question-image">
              Question {currentIndex + 1}
            </div>
            {showExplanation && (
              <button id="next-btn" onClick={handleNext} className="next-button">
                {currentIndex < questions.length - 1 ? 'Next >' : 'Finish'}
              </button>
            )}
          </div>
          <div className="question" id="question-text">{question.text}</div>
          {!showExplanation ? (
            <div className="options-container">
              <ul className="options" id="options-list">
                {question.options.map((option) => (
                  <li key={option.id}>
                    <label>
                      <input
                        type="radio"
                        name="selected_option_id"
                        value={option.id}
                        checked={selectedOption === option.id}
                        onChange={() => handleOptionSelect(option.id)}
                      />
                      {option.text}
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!selectedOption}
                className="submit-button"
              >
                Submit Answer
              </button>
            </div>
          ) : (
            <>
              <div className="answer-feedback">
                <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </div>
              </div>
              <div className="options-container">
                <ul className="options" id="options-list">
                  {question.options.map((option) => {
                    let optionClass = '';
                    if (isCorrect) {
                      if (option.id === selectedOption) optionClass = 'correct-option';
                    } else {
                      if (option.id === correctOptionId) optionClass = 'correct-option';
                      else if (option.id === selectedOption) optionClass = 'incorrect-option';
                    }
                    return (
                      <li key={option.id} className={optionClass}>
                        <label>
                          <input
                            type="radio"
                            name="selected_option_id"
                            value={option.id}
                            checked={selectedOption === option.id}
                            disabled
                          />
                          {option.text}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {showExplanation && !isCorrect && explanation && (
                <div className="explanation-section" id="explanation-box">
                  <div className="explanation-text" id="explanation-text">{explanation}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 