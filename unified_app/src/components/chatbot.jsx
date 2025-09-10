import React, { useEffect, useRef, useState, useContext } from 'react';
import '../styles/chat.css';
import '../styles/layout.css';
import { Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { db } from '../../firebase_setup/firebase';
import { collection, addDoc, getDocs, orderBy, query, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import pixelSign from '../assets/pixel-sign-store-closed-8-260nw-2480337137 (1).png';
// Try to import uuid, fallback to timestamp if not available
let uuidv4 = () => Date.now().toString();
try { uuidv4 = require('uuid').v4; } catch {}

const COOLDOWN = 10000;

function timeAgo(ts) {
  if (!ts) return '';
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// TypingDots animated component
const TypingDots = () => {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev === "..." ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span className="typing-dots">{dots}</span>;
};

const AskMo = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]); // [{id, preview, createdAt}]
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastSentTime, setLastSentTime] = useState(() => Number(localStorage.getItem('lastSentTime')) || 0);
  const [warning, setWarning] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // conversation id to delete
  const chatWindowRef = useRef(null);
  const socketRef = useRef(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // WebSocket setup
  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:8000/ws/chat'); // Use your backend URL
    socketRef.current.onopen = () => {
      console.log('WebSocket connected');
    };
    socketRef.current.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const aiResponse = data[data.length - 1];
        if (aiResponse?.role === 'ai') {
          setIsTyping(false);
          setMessages(prevMsgs => {
            const updatedMsgs = prevMsgs.map(msg =>
              msg.sender === 'ai' && msg.text === '...' ? { ...msg, text: aiResponse.content } : msg
            );
            // Save the updatedMsgs (user + ai) into Firestore
            if (user?.uid && selectedConvId) {
              const convRef = doc(db, 'conversations', user.uid, 'threads', selectedConvId);
              updateDoc(convRef, { messages: updatedMsgs });
            }
            return updatedMsgs;
          });
        }
      } catch (e) {
        console.error('WebSocket message parse error', e);
      }
    };
    socketRef.current.onerror = () => {
      console.error('WebSocket error');
    };
    return () => {
      socketRef.current.close();
    };
  }, [user?.uid, selectedConvId]);

  // Fetch conversation list (previews)
  useEffect(() => {
    if (!user?.uid) return;
    const fetchConversations = async () => {
      const convSnap = await getDocs(collection(db, 'conversations', user.uid, 'threads'));
      const convs = [];
      for (const convDoc of convSnap.docs) {
        const convId = convDoc.id;
        const convData = convDoc.data();
        let preview = 'Untitled Chat';
        let firstMsgTs = convData.createdAt;
        if (convData.messages && convData.messages.length > 0) {
          preview = convData.messages[0].text.slice(0, 32) || 'Untitled Chat';
          firstMsgTs = convData.messages[0].timestamp;
        }
        convs.push({
          id: convId,
          preview,
          createdAt: firstMsgTs
        });
      }
      convs.sort((a, b) => b.createdAt - a.createdAt); // newest first
      setConversations(convs);
    };
    fetchConversations();
  }, [user?.uid, selectedConvId]);

  // Load messages for selected conversation
  const loadConversation = async (convId) => {
    setSelectedConvId(convId);
    setMessages([]);
    setLastSentTime(0);
    localStorage.setItem('lastSentTime', 0);
    if (!user?.uid || !convId) return;
    const convRef = doc(db, 'conversations', user.uid, 'threads', convId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const data = convSnap.data();
      setMessages(data.messages || []);
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    const chatWindow = chatWindowRef.current;
    if (chatWindow) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }, [messages]);

  // Start new conversation
  const startNewConversation = async () => {
    if (!user?.uid) return;
    const newId = uuidv4();
    const convRef = doc(db, 'conversations', user.uid, 'threads', newId);
    await setDoc(convRef, { createdAt: Date.now(), messages: [] });
    setSelectedConvId(newId);
    setMessages([]);
    setLastSentTime(0);
    localStorage.setItem('lastSentTime', 0);
  };

  // Cooldown countdown effect
  useEffect(() => {
    if (lastSentTime === 0) {
      setCooldownLeft(0);
      return;
    }
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, COOLDOWN - (now - lastSentTime));
      setCooldownLeft(Math.ceil(diff / 1000));
    };
    update();
    if (Date.now() - lastSentTime < COOLDOWN) {
      const interval = setInterval(update, 200);
      return () => clearInterval(interval);
    } else {
      setCooldownLeft(0);
    }
  }, [lastSentTime]);

  // Send message handler with rate limiting and typing indicator
  const handleSend = async () => {
    if (!userInput.trim() || !user?.uid || !selectedConvId) return;
    const now = Date.now();
    if (now - lastSentTime < COOLDOWN) {
      setWarning("You're sending messages too fast. Please wait a few seconds.");
      setTimeout(() => setWarning(''), 3000);
      return;
    }
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setWarning('AI is still connecting... try again shortly.');
      return;
    }
    setWarning('');
    setLastSentTime(now);
    localStorage.setItem('lastSentTime', now);
    const userMsg = { sender: 'user', text: userInput, timestamp: now };
    setMessages(msgs => [...msgs, userMsg, { sender: 'ai', text: '...', timestamp: now + 1 }]);
    setUserInput('');
    setIsTyping(true);
    // Update Firestore: push user message
    const convRef = doc(db, 'conversations', user.uid, 'threads', selectedConvId);
    const convSnap = await getDoc(convRef);
    let newMsgs = [userMsg];
    if (convSnap.exists()) {
      const data = convSnap.data();
      newMsgs = [...(data.messages || []), userMsg];
    }
    await updateDoc(convRef, { messages: newMsgs });
    // Send to WebSocket backend
    socketRef.current.send(userMsg.text);
  };

  // Clear memory handler (with confirm)
  const clearMemory = async () => {
    setShowConfirm(false);
    setMessages([]);
    if (!user?.uid || !selectedConvId) return;
    const convRef = doc(db, 'conversations', user.uid, 'threads', selectedConvId);
    await updateDoc(convRef, { messages: [] });
    // Also clear backend memory
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send("__clear__");
    }
  };

  // Delete conversation handler
  const handleDeleteConversation = async (convId) => {
    if (!user?.uid || !convId) return;
    await deleteDoc(doc(db, 'conversations', user.uid, 'threads', convId));
    if (selectedConvId === convId) {
      setSelectedConvId(null);
      setMessages([]);
    }
    setDeleteTarget(null);
    // Refresh conversation list
    const convSnap = await getDocs(collection(db, 'conversations', user.uid, 'threads'));
    const convs = [];
    for (const convDoc of convSnap.docs) {
      const convId = convDoc.id;
      const convData = convDoc.data();
      let preview = 'Untitled Chat';
      let firstMsgTs = convData.createdAt;
      if (convData.messages && convData.messages.length > 0) {
        preview = convData.messages[0].text.slice(0, 32) || 'Untitled Chat';
        firstMsgTs = convData.messages[0].timestamp;
      }
      convs.push({
        id: convId,
        preview,
        createdAt: firstMsgTs
      });
    }
    convs.sort((a, b) => b.createdAt - a.createdAt);
    setConversations(convs);
  };

  // UI
  return (
    <div className="dashboard-grid">
      {/* Left Nav Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">MoMoney</div>
        <ul className="nav-list">
          <li data-icon="🏠"><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link></li>
          <li data-icon="📚"><Link to="/learn" style={{ color: 'inherit', textDecoration: 'none' }}>Learn</Link></li>
          <li data-icon="💹"><Link to="/trades" style={{ color: 'inherit', textDecoration: 'none' }}>Trade</Link></li>
          <li data-icon="🤖" className="active"><Link to="/AIChat" style={{ color: 'inherit', textDecoration: 'none' }}>MO AI</Link></li>
          <li data-icon="🏆">Leaderboard</li>
          <li data-icon="🎯">Quests</li>
          <li data-icon="✨">Achievements</li>
        </ul>
      </nav>
      {/* Main Content */}
      <main className="main-content askmo-main-content">
        <div className="askmo-wrapper retro-border grid-bg">
          <div className="askmo-titlebar">
            <h2 className="moai-title">💬 Ask Mo</h2>
            <img src={pixelSign} alt="Work In Progress" className="wip-sign rotated60" />
          </div>
          <div className="askmo-chat-section">
            <aside className="askmo-sidebar retro-border grid-bg">
              <div className="sidebar-header">
                <button className="retro-btn new-conv-btn" onClick={startNewConversation}>+ New</button>
              </div>
              <div className="conv-list">
                {conversations.length === 0 ? (
                  <div className="empty-msg">No conversations yet.</div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`conv-preview${selectedConvId === conv.id ? ' active' : ''}`}
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="conv-title-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span className="conv-title">{conv.preview || 'Untitled Chat'}</span>
                        <button
                          className="delete-conv-btn"
                          title="Delete conversation"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(conv.id); }}
                        >🗑️</button>
                      </div>
                      <div className="conv-time">{timeAgo(conv.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
              {deleteTarget && (
                <div className="confirm-popup">
                  <div className="confirm-box retro-border grid-bg">
                    <div>Delete this conversation? This cannot be undone.</div>
                    <div style={{marginTop: 12, display: 'flex', gap: 10}}>
                      <button className="retro-btn send-btn" onClick={() => handleDeleteConversation(deleteTarget)}>Yes, delete</button>
                      <button className="retro-btn clear-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </aside>
            <main className="askmo-chat-window">
              <div className="chat-window retro-border grid-bg" ref={chatWindowRef}>
                <div className="messages">
                  {messages.length === 0 ? (
                    <div className="empty-msg">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`bubble ${msg.sender} fade-in`}
                      >
                        <span>
                          {msg.text === '...'
                            ? <TypingDots />
                            : msg.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="input-section">
                <input
                  placeholder="Ask about your investments..."
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isTyping}
                  className="retro-input"
                />
                <button
                  onClick={handleSend}
                  disabled={isTyping || Date.now() - lastSentTime < COOLDOWN}
                  className="retro-btn send-btn"
                >
                  {cooldownLeft > 0 ? `Send (${cooldownLeft})` : 'Send'}
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="retro-btn clear-btn"
                >Clear Memory</button>
              </div>
              {warning && <div className="warning-msg neon-glow">{warning}</div>}
              {showConfirm && (
                <div className="confirm-popup">
                  <div className="confirm-box retro-border grid-bg">
                    <div>Clear this conversation? This cannot be undone.</div>
                    <div style={{marginTop: 12, display: 'flex', gap: 10}}>
                      <button className="retro-btn send-btn" onClick={clearMemory}>Yes, clear</button>
                      <button className="retro-btn clear-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </main>
      <aside className="right-sidebar"></aside>
    </div>
  );
};

export default AskMo;