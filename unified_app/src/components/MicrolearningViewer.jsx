import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBackendUrl } from '../config/api.js';
import {AuthContext} from "./context/AuthContext";
import '../styles/MicrolearningViewer.css';

export default function MicrolearningViewer() {
  const { levelId, unit } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userID = user?.uid;

  const [microlearningData, setMicrolearningData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log(`Component rendered: levelId=${levelId}, currentPage=${currentPage}`);

  useEffect(() => {
    console.log(`useEffect triggered: levelId=${levelId}, currentPage=${currentPage}`);
    loadMicrolearningData();
  }, [levelId, currentPage]);

  const loadMicrolearningData = async () => {
    setLoading(true);
    try {
      console.log(`Loading microlearning: levelId=${levelId}, currentPage=${currentPage}`);
      const response = await fetch(getBackendUrl(`/microlearning/api/${levelId}/${currentPage}?user_id=${userID}&unit=${unit}`));
      if (!response.ok) throw new Error('Failed to load microlearning');
      const data = await response.json();
      console.log('Microlearning data:', data);
      setMicrolearningData(data);
    } catch (err) {
      console.error('Error loading microlearning:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    console.log(`handleNext called: has_next=${microlearningData?.has_next}, currentPage=${currentPage}`);
    if (microlearningData?.has_next) {
      console.log(`Setting currentPage to ${currentPage + 1}`);
      setCurrentPage(currentPage + 1);
    } else {
      console.log('Completing lesson');
      // Complete lesson and return to unit path
      completeLesson();
    }
  };

  const handleReadMore = () => {
    // This could open additional content or expand current content
    console.log('Read more clicked');
  };

  const completeLesson = async () => {
    try {
      console.log(`Completing level ${levelId} for user ${userID}`);
      const response = await fetch(getBackendUrl(`/level/api/complete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userID,
          level_id: parseInt(levelId)
        })
      });
      const data = await response.json();
      console.log("Complete API response:", data);
      // Handle redirection based on backend response
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
    } catch (err) {
      console.error('Error completing lesson:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="microlearning-viewer">
        <div className="loading">Loading microlearning...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="microlearning-viewer">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="microlearning-viewer">
      <button
        className="close-microlearning"
        onClick={() => navigate(`/unitpath?unit=${unit}`)}
        aria-label="Close"
      >
        ×
      </button>
      <div className="container">
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${microlearningData?.progress_percent || 0}%` }}
          ></div>
        </div>
        
        <div className="image-box">
          {microlearningData?.image || 'Image Placeholder'}
        </div>
        
        <div className="title">
          {microlearningData?.title}
        </div>
        
        <ul>
          {microlearningData?.bullets?.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
        
        <div className="buttons">
          <button className="button" onClick={handleReadMore}>
            Read More
          </button>
          <button className="button" onClick={handleNext}>
            {microlearningData?.has_next ? 'Next' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
} 