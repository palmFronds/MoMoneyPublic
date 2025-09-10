import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage.jsx';
import UnitDashboard from './components/UnitDashboard.jsx';
import UnitPath from './components/UnitPath.jsx';
import TradeDashboard from './components/TradeDashboard.jsx';
import ChatApp from "./components/chatbot.jsx";
import TradingWindow from './components/TradingWindow';
import QuizViewer from './components/QuizViewer.jsx';
import MicrolearningViewer from './components/MicrolearningViewer.jsx';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/learn" element={
            <ProtectedRoute>
              <UnitDashboard />
            </ProtectedRoute>
          } />
          <Route path="/unitpath" element={
            <ProtectedRoute>
              <UnitPath />
            </ProtectedRoute>
          } />
          <Route path="/trades" element={
            <ProtectedRoute>
              <TradeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/trading" element={
            <ProtectedRoute>
              <TradingWindow />
            </ProtectedRoute>
          } />
          <Route path="/AIChat" element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          } />
          <Route path="/quiz/:levelId/:unit" element={
            <ProtectedRoute>
              <QuizViewer />
            </ProtectedRoute>
          } />
          <Route path="/microlearning/:levelId/:unit" element={
            <ProtectedRoute>
              <MicrolearningViewer />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
