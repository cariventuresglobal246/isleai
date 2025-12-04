import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import sanitizeHtml from 'sanitize-html';
import './Baje.css';
import './tailwind.css';
import AITextPressure from './AITextPressure';
import ChatBarTourism from './ChatBarTourism';
import VariableProximity from './components/VariableProximity';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUmbrellaBeach, faBell, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const BARBADOS_HOTELS = [
  {
    id: 'hotel-1',
    name: 'O2 Beach Club & Spa',
    type: 'Resort',
    location: 'Maxwell Coast Road, Christ Church, Barbados',
    latitude: 13.0686,
    longitude: -59.5696,
    rating: 4.8,
    priceRange: '$$$',
    vibe: ['luxury', 'all-inclusive', 'spa', 'beachfront'],
  },
  {
    id: 'hotel-2',
    name: 'Sandals Royal Barbados',
    type: 'Resort',
    location: 'St. Lawrence Gap, Christ Church, Barbados',
    latitude: 13.0682,
    longitude: -59.564,
    rating: 4.7,
    priceRange: '$$$$',
    vibe: ['romantic', 'all-inclusive', 'couples-only'],
  },
  {
    id: 'hotel-3',
    name: 'Accra Beach Hotel & Spa',
    type: 'Hotel',
    location: 'Rockley, Christ Church, Barbados',
    latitude: 13.0786,
    longitude: -59.5926,
    rating: 4.3,
    priceRange: '$$-$$$',
    vibe: ['family-friendly', 'beachfront', 'central'],
  },
  {
    id: 'hotel-4',
    name: 'Oceanview Bayfront Airbnb',
    type: 'Airbnb',
    location: 'Hastings Boardwalk Area, Christ Church, Barbados',
    latitude: 13.087,
    longitude: -59.603,
    rating: 4.6,
    priceRange: '$$',
    vibe: ['budget', 'oceanview', 'local-experience'],
  },
];

const INTEREST_PRESETS = {
  Surfing: ['surfing', 'waves', 'action sports', 'ocean'],
  Partying: ['nightlife', 'bars', 'clubs', 'events'],
  Relaxation: ['spa', 'quiet', 'beach lounging', 'sunset'],
  Culture: ['museums', 'heritage', 'historic sites', 'food tours'],
};

const TIP_INTERVAL = 1800000;

function Baje() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const fetchingProfileRef = useRef(false);
  const fetchingFactRef = useRef(false);
  const fetchingTipRef = useRef(false);
  const messagesContainerRef = useRef(null);
  const tourismButtonRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(uuidv4());
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [conversationStarters, setConversationStarters] = useState([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showTourismBar, setShowTourismBar] = useState(false);
  const [isTourismBarOpen, setIsTourismBarOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('Main');
  const [agentIcon, setAgentIcon] = useState('🤖');
  const [selectedCountry, setSelectedCountry] = useState('Barbados');
  const [tripBudget, setTripBudget] = useState('');
  const [tripDates, setTripDates] = useState({ start: '', end: '' });
  const [tripDuration, setTripDuration] = useState('');
  const [tripStay, setTripStay] = useState('');
  const [tripInterests, setTripInterests] = useState([]);
  const [wantBucketList, setWantBucketList] = useState(false);
  const [bucketListGenerated, setBucketListGenerated] = useState(false);
  const [tripSuggestions, setTripSuggestions] = useState([]);
  const [lastTipTime, setLastTipTime] = useState(null);
  const [proximityToggles, setProximityToggles] = useState({});
  const [showNavCard, setShowNavCard] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [tourismMode, setTourismMode] = useState(false);
  const [proximityEnabled, setProximityEnabled] = useState(false);
  const [tourismProfile, setTourismProfile] = useState(null);
  const [encouragementReminder, setEncouragementReminder] = useState(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [locationFlag, setLocationFlag] = useState({
    country: 'Barbados',
    code: 'BB',
    emoji: '🇧🇧',
  });

  const isTourismAgentActive = activeAgent === 'Tourism';

  useEffect(() => {
    const storedUser = localStorage.getItem('isAuthenticated');
    const storedUserId = localStorage.getItem('userId');
    if (storedUser === 'true' && storedUserId) {
      setIsAuthenticated(true);
      setUserId(storedUserId);
    }

    const fetchInitialData = async () => {
      try {
        const startersResponse = await api.get('/api/chat/starters');
        setConversationStarters(startersResponse.data || []);
      } catch (error) {
        console.error('Error fetching conversation starters', error);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const key = isTourismAgentActive ? 'tourismMessages' : 'mainMessages';
    const storedMessages = localStorage.getItem(`${key}_${userId || 'guest'}`);
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (err) {
        console.error('Failed to parse stored messages', err);
      }
    } else {
      setMessages([]);
    }
  }, [isTourismAgentActive, userId]);

  useEffect(() => {
    const key = isTourismAgentActive ? 'tourismMessages' : 'mainMessages';
    try {
      localStorage.setItem(`${key}_${userId || 'guest'}`, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to store messages', err);
    }
  }, [messages, isTourismAgentActive, userId]);

  useEffect(() => {
    if (tourismMode && !fetchingProfileRef.current) {
      fetchTourismProfile();
    }
  }, [tourismMode]);

  useEffect(() => {
    if (!tourismMode) return;
    if (!lastTipTime) {
      setLastTipTime(Date.now());
      return;
    }
    const now = Date.now();
    if (now - lastTipTime >= TIP_INTERVAL && !fetchingTipRef.current) {
      fetchPeriodicTip();
      setLastTipTime(now);
    }
  }, [tourismMode, lastTipTime]);

  useEffect(() => {
    const navCard = document.querySelector('.nav-card');
    if (navCard) {
      if (showNavCard) {
        navCard.classList.add('nav-card-open');
      } else {
        navCard.classList.remove('nav-card-open');
      }
    }
  }, [showNavCard]);

  useEffect(() => {
    if (!showNotificationPanel) return;
    setHasNewNotifications(false);
  }, [showNotificationPanel]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollToBottom(!atBottom);
    };
    const container = messagesContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTourismBarOpen]);

  const fetchTourismProfile = async () => {
    if (fetchingProfileRef.current) return;
    fetchingProfileRef.current = true;
    try {
      const response = await api.get('/api/tourism/profile', {
        params: { userId: userId || 'guest', country: selectedCountry },
      });
      setTourismProfile(response.data);
    } catch (error) {
      console.error('Error fetching tourism profile', error);
    } finally {
      fetchingProfileRef.current = false;
    }
  };

  const fetchPeriodicTip = async () => {
    if (fetchingTipRef.current) return;
    fetchingTipRef.current = true;
    try {
      const response = await api.get('/api/tourism/tip', {
        params: { userId: userId || 'guest', country: selectedCountry },
      });
      const tipMessage = {
        id: uuidv4(),
        sender: 'assistant',
        text: response.data.tip || 'Here is a quick tourism tip for you.',
        createdAt: new Date().toISOString(),
        isTip: true,
        agent: 'Tourism',
      };
      setMessages((prev) => [...prev, tipMessage]);
    } catch (error) {
      console.error('Error fetching periodic tip', error);
    } finally {
      fetchingTipRef.current = false;
    }
  };

  const sanitizeContent = (html) => {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'iframe']),
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height'],
        iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(files);
  };

  const buildPayload = () => {
    const context = {
      sessionId,
      userId: userId || 'guest',
      location: locationFlag,
      tourism: tourismMode,
    };
    if (tourismMode) {
      context.tourismProfile = tourismProfile;
      context.trip = {
        country: selectedCountry,
        budget: tripBudget,
        dates: tripDates,
        duration: tripDuration,
        stay: tripStay,
        interests: tripInterests,
        wantBucketList,
      };
    }
    return context;
  };

  const sendMessage = async (overrideText) => {
    if (isLoading) return;
    const content = overrideText || inputValue.trim();
    if (!content) return;
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    const newMessage = {
      id: uuidv4(),
      sender: 'user',
      text: content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);
    const formData = new FormData();
    formData.append('message', content);
    formData.append('sessionId', sessionId);
    formData.append('userId', userId || 'guest');
    formData.append('agent', activeAgent);
    formData.append('context', JSON.stringify(buildPayload()));
    attachedFiles.forEach((file) => {
      formData.append('files', file);
    });
    try {
      const response = await api.post('/api/chat/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const assistantMessage = {
        id: uuidv4(),
        sender: 'assistant',
        text: response.data.reply,
        createdAt: new Date().toISOString(),
        agent: activeAgent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (response.data.notifications && response.data.notifications.length) {
        setNotifications((prev) => [...response.data.notifications, ...prev]);
        setNotificationCount((prev) => prev + response.data.notifications.length);
        setHasNewNotifications(true);
      }
    } catch (error) {
      console.error('Error sending message', error);
      const errorMessage = {
        id: uuidv4(),
        sender: 'assistant',
        text: 'Sorry, something went wrong while sending your message. Please try again.',
        createdAt: new Date().toISOString(),
        agent: 'System',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setAttachedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleStarterClick = (starter) => {
    sendMessage(starter);
  };

  const handleScrollToBottom = () => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleNotificationClick = () => {
    setShowNotificationPanel((prev) => !prev);
  };

  const handleNavToggle = () => {
    setShowNavCard((prev) => !prev);
  };

  const toggleTourismMode = () => {
    setTourismMode((prev) => !prev);
    if (!tourismMode) {
      setActiveAgent('Tourism');
      setAgentIcon('🏖️');
      setIsTourismBarOpen(true);
    } else {
      setActiveAgent('Main');
      setAgentIcon('🤖');
      setIsTourismBarOpen(false);
    }
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    setSelectedCountry(value);
    if (value === 'Barbados') {
      setLocationFlag({
        country: 'Barbados',
        code: 'BB',
        emoji: '🇧🇧',
      });
    }
  };

  const handleInterestToggle = (interest) => {
    setTripInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const detectSuggestedHotel = () => {
    const budget = tripBudget.toLowerCase();
    const interestSet = new Set(tripInterests);
    let suggested = BARBADOS_HOTELS[2];
    if (budget.includes('lux') || budget.includes('$4') || budget.includes('$5')) {
      suggested = BARBADOS_HOTELS[1];
    } else if (budget.includes('budget') || budget.includes('$1') || budget.includes('$2')) {
      suggested = BARBADOS_HOTELS[3];
    } else {
      suggested = BARBADOS_HOTELS[2];
    }
    if (interestSet.has('Surfing')) {
      suggested = BARBADOS_HOTELS[0];
    }
    return suggested;
  };

  const generateBucketList = async () => {
    if (bucketListGenerated) return;
    const suggestion = detectSuggestedHotel();
    const prompt = `
You are ISLEAI Tourism Agent for ${selectedCountry}.
User budget: ${tripBudget}
User stay: ${tripStay}
User interests: ${tripInterests.join(', ') || 'not specified'}
User dates: ${tripDates.start} to ${tripDates.end}
Suggested base hotel: ${suggestion.name} in ${suggestion.location}.

Please generate a friendly, day-by-day bucket list for their trip with:
- Morning, afternoon, and evening suggestions
- Mix of beach, culture, food, nightlife based on interests
- 2-3 concrete named places per day
- One short encouragement at the end
`;
    const bucketMessage = {
      id: uuidv4(),
      sender: 'user',
      text: 'Create a personalised Barbados bucket list for my trip based on my details.',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, bucketMessage]);
    setIsLoading(true);
    try {
      const response = await api.post('/api/chat/send', {
        message: prompt,
        sessionId,
        userId: userId || 'guest',
        agent: 'Tourism',
        context: buildPayload(),
      });
      const assistantMessage = {
        id: uuidv4(),
        sender: 'assistant',
        text: response.data.reply,
        createdAt: new Date().toISOString(),
        agent: 'Tourism',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setBucketListGenerated(true);
    } catch (error) {
      console.error('Error generating bucket list', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEncouragementReminder = (value) => {
    setEncouragementReminder(value);
  };

  const handleTourismBarClose = () => {
    setIsTourismBarOpen(false);
    if (tourismMode && activeAgent !== 'Tourism') {
      setActiveAgent('Tourism');
      setAgentIcon('🏖️');
    }
  };

  const handleProximityToggle = (msgId) => {
    setProximityToggles((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleLoginClick = () => {
    navigate('/login', { state: { from: location.pathname } });
  };

  const handleRegisterClick = () => {
    navigate('/register', { state: { from: location.pathname } });
  };

  const renderTourismSummaryCard = () => {
    if (!tourismMode && !tourismProfile) return null;
    const flagImage =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Flag_of_Barbados.svg/1200px-Flag_of_Barbados.svg.png';
    return (
      <div className="tourism-summary-card">
        <div className="tourism-summary-header">
          <img src={flagImage} alt="Barbados flag" className="tourism-summary-flag" />
          <div>
            <h3>Barbados Trip Snapshot</h3>
            <p>Curated by ISLEAI Tourism Agent</p>
          </div>
        </div>
        <div className="tourism-summary-body">
          <div>
            <strong>Country:</strong> {selectedCountry}
          </div>
          <div>
            <strong>Budget:</strong> {tripBudget || 'Not set yet'}
          </div>
          <div>
            <strong>Stay:</strong> {tripStay || 'Not set yet'}
          </div>
          <div>
            <strong>Dates:</strong>{' '}
            {tripDates.start && tripDates.end
              ? `${tripDates.start} → ${tripDates.end}`
              : 'Not set yet'}
          </div>
          <div>
            <strong>Interests:</strong>{' '}
            {tripInterests.length ? tripInterests.join(', ') : 'Not selected yet'}
          </div>
          <div>
            <strong>Reminder:</strong>{' '}
            {encouragementReminder ? encouragementReminder : 'No reminder set'}
          </div>
        </div>
      </div>
    );
  };

  const renderMessageContent = (message) => {
    if (!message) return null;
    const isAssistant = message.sender === 'assistant';
    const isUser = message.sender === 'user';
    const isSystem = message.sender === 'System';
    const baseClass = isAssistant ? 'message assistant-message' : 'message user-message';
    const extraClass = isSystem ? 'system-message' : '';
    const isTourismMessage = message.agent === 'Tourism';
    const proximityOn = proximityEnabled && proximityToggles[message.id];
    let bubbleStyle = {};
    if (isAssistant) {
      bubbleStyle = isTourismMessage
        ? {
            background: '#F0F8FF',
            border: '1px solid #B0E0E6',
          }
        : {
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
          };
    } else if (isUser) {
      bubbleStyle = {
        background: '#DCF8C6',
        border: '1px solid #AEEBAA',
      };
    }
    const sanitizedText = sanitizeContent(message.text || '');
    return (
      <div className={`${baseClass} ${extraClass}`} style={bubbleStyle}>
        <div className="message-meta">
          <span className="message-sender">
            {isAssistant && isTourismMessage ? 'Tourism Agent' : isAssistant ? 'ISLEAI' : 'You'}
          </span>
          {message.createdAt && (
            <span className="message-time">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
        <div
          className="message-text"
          dangerouslySetInnerHTML={{
            __html: sanitizedText,
          }}
        />
        {proximityEnabled && (
          <button
            type="button"
            className="proximity-toggle-button"
            onClick={() => handleProximityToggle(message.id)}
          >
            {proximityOn ? 'Hide AI Insights' : 'Show AI Insights'}
          </button>
        )}
        {proximityOn && (
          <div className="proximity-container">
            <VariableProximity messageId={message.id} text={message.text} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="baje-container">
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            type="button"
            className={`hamburger-button ${showNavCard ? 'active' : ''}`}
            onClick={handleNavToggle}
            aria-label={showNavCard ? 'Close navigation' : 'Open navigation'}
          >
            {showNavCard ? (
              <FontAwesomeIcon icon={faTimes} className="hamburger-button-icon" />
            ) : (
              <FontAwesomeIcon icon={faBars} className="hamburger-button-icon" />
            )}
          </button>
          <div className="header-title-group">
            <h1 className="chat-title">ISLEAI Tourism Agent</h1>
            <span className="chat-subtitle">
              Smart, Caribbean-first travel planning for {locationFlag.emoji} {locationFlag.country}
            </span>
          </div>
        </div>
        <div className="chat-header-right">
          <button
            type="button"
            className="bell-container"
            onClick={handleNotificationClick}
            aria-label="Notifications"
          >
            <FontAwesomeIcon icon={faBell} className="notification-button" />
            <span className={`badge ${hasNewNotifications ? 'pulsing' : ''}`}>
              {notificationCount}
            </span>
          </button>
          <button
            type="button"
            className={`tourism-toggle-button ${tourismMode ? 'active' : ''}`}
            onClick={toggleTourismMode}
          >
            {tourismMode ? 'Tourism Mode: ON' : 'Tourism Mode: OFF'}
          </button>
        </div>
      </header>
      <div className="main-content">
        <aside className={`nav-card ${showNavCard ? 'nav-card-open' : ''}`}>
          <h2 className="nav-card-title">ISLEAI Tools</h2>
          <nav className="nav-card-list">
            <Link to="/profile" className="nav-card-item">
              Profile & Preferences
            </Link>
            <Link to="/history" className="nav-card-item">
              Conversation History
            </Link>
            <button
              type="button"
              className="nav-card-item nav-card-button"
              onClick={() => setProximityEnabled((prev) => !prev)}
            >
              {proximityEnabled ? 'Disable AI Insights' : 'Enable AI Insights'}
            </button>
          </nav>
          <section className="nav-card-section">
            <h3 className="nav-card-section-title">Quick Starters</h3>
            <ul className="nav-card-starters">
              {(conversationStarters || []).map((starter) => (
                <li key={starter} className="nav-card-starter-item">
                  <button type="button" onClick={() => handleStarterClick(starter)}>
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
        <section className="chat-section">
          {renderTourismSummaryCard()}
          {showNotificationPanel && (
            <div className="notification-panel">
              <h3>Notifications</h3>
              {notifications.length === 0 && <p>No notifications yet.</p>}
              {notifications.map((note) => (
                <div key={note.id} className="notification-item">
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                  {note.createdAt && (
                    <span className="notification-time">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="messages-wrapper" ref={messagesContainerRef}>
            <div className="messages-container">
              {messages.length === 0 && (
                <div className="empty-state">
                  <h2>Welcome to ISLEAI Tourism</h2>
                  <p>Ask about Barbados trips, budgets, hotels, hidden gems, and more.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id}>{renderMessageContent(msg)}</div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {showScrollToBottom && (
              <button
                type="button"
                className="scroll-to-bottom-button"
                onClick={handleScrollToBottom}
              >
                ↓
              </button>
            )}
          </div>
          {showLoginPrompt && !isAuthenticated && (
            <div className="login-prompt">
              <p>You need to be logged in to continue the conversation.</p>
              <div className="login-prompt-actions">
                <button type="button" onClick={handleLoginClick}>
                  Login
                </button>
                <button type="button" onClick={handleRegisterClick}>
                  Register
                </button>
                <button type="button" onClick={() => setShowLoginPrompt(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="input-section">
            <div className="input-row">
              <textarea
                className="chat-input"
                placeholder={
                  isTourismAgentActive
                    ? 'Ask ISLEAI Tourism Agent about your trip...'
                    : 'Ask ISLEAI anything...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                style={{ flexGrow: 1, marginRight: '10px' }}
              />
              <div
                className="agent-menu-container"
                style={{ position: 'relative', marginRight: '10px' }}
                onMouseEnter={() => setIsAgentMenuOpen(true)}
                onMouseLeave={() => setIsAgentMenuOpen(false)}
              >
                <button
                  className="agent-button"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isAgentMenuOpen}
                  title={`Agent: ${activeAgent}`}
                >
                  {agentIcon}
                </button>
                <div
                  className={`agent-menu ${isAgentMenuOpen ? 'open' : ''}`}
                  role="menu"
                  aria-label="Choose agent"
                >
                  {['Main', 'Tourism'].map((agent) => (
                    <button
                      key={agent}
                      className={`agent-item ${activeAgent === agent ? 'active' : ''}`}
                      role="menuitem"
                      onClick={() => {
                        setActiveAgent(agent);
                        setAgentIcon(agent === 'Main' ? '🤖' : '🏖️');
                        setIsAgentMenuOpen(false);
                        if (agent !== 'Tourism') {
                          setIsTourismBarOpen(false);
                        }
                      }}
                    >
                      {agent === 'Main' ? '🤖 Main Agent' : '🏖️ Tourism Agent'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-actions">
                <label className="file-upload-label">
                  Attach
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="file-input-hidden"
                  />
                </label>
                <button
                  type="button"
                  className="submit-button"
                  onClick={() => sendMessage()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
            <AITextPressure text={inputValue} />
          </div>
        </section>
        <ChatBarTourism
          isOpen={isTourismBarOpen}
          onClose={handleTourismBarClose}
          selectedCountry={selectedCountry}
          onCountryChange={handleCountryChange}
          tripBudget={tripBudget}
          setTripBudget={setTripBudget}
          tripDates={tripDates}
          setTripDates={setTripDates}
          tripDuration={tripDuration}
          setTripDuration={setTripDuration}
          tripStay={tripStay}
          setTripStay={setTripStay}
          tripInterests={tripInterests}
          handleInterestToggle={handleInterestToggle}
          wantBucketList={wantBucketList}
          setWantBucketList={setWantBucketList}
          generateBucketList={generateBucketList}
          encouragementReminder={encouragementReminder}
          setEncouragementReminder={handleEncouragementReminder}
          detectSuggestedHotel={detectSuggestedHotel}
        />
      </div>
      {tourismMode && (
        <button
          ref={tourismButtonRef}
          type="button"
          onClick={() => setIsTourismBarOpen(true)}
          style={{
            position: 'absolute',
            right: '10px',
            bottom: '80px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: '#E0BBFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            zIndex: 1000,
          }}
          title="Show Tourism Tools"
        >
          <FontAwesomeIcon
            icon={faUmbrellaBeach}
            style={{ color: '#5A189A', fontSize: '18px' }}
          />
        </button>
      )}
      <style jsx>{`
        .baje-container {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue',
            Helvetica, Arial, sans-serif;
          background: #f9fafb;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(90deg, #1e90ff, #5a189a);
          color: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          z-index: 100;
        }
        .chat-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chat-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chat-title {
          font-size: 1.25rem;
          margin: 0;
        }
        .chat-subtitle {
          font-size: 0.85rem;
          opacity: 0.9;
        }
        .header-title-group {
          display: flex;
          flex-direction: column;
        }
        .main-content {
          flex: 1;
          display: flex;
          position: relative;
          overflow: hidden;
        }
        .nav-card {
          width: 260px;
          background: #ffffff;
          border-right: 1px solid #e0e0e0;
          padding: 16px;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.04);
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 90;
        }
        .nav-card.nav-card-open {
          transform: translateX(0);
        }
        .nav-card-title {
          margin-top: 0;
          margin-bottom: 12px;
          font-size: 1.05rem;
          font-weight: 600;
        }
        .nav-card-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nav-card-item {
          display: block;
          padding: 8px 10px;
          border-radius: 6px;
          background: #f3f4f6;
          text-decoration: none;
          color: #111827;
          font-size: 0.9rem;
        }
        .nav-card-item:hover {
          background: #e5e7eb;
        }
        .nav-card-button {
          border: none;
          text-align: left;
          cursor: pointer;
        }
        .nav-card-section {
          margin-top: 16px;
        }
        .nav-card-section-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .nav-card-starters {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-card-starter-item {
          margin-bottom: 4px;
        }
        .nav-card-starter-item button {
          width: 100%;
          background: #e0f2fe;
          border: none;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .chat-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          padding-left: 16px;
          padding-right: 16px;
        }
        .messages-wrapper {
          flex: 1;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          display: flex;
          position: relative;
        }
        .messages-container {
          flex: 1;
          padding: 12px 16px 60px 16px;
          overflow-y: auto;
          position: relative;
        }
        .empty-state {
          text-align: center;
          margin-top: 40px;
          color: #6b7280;
        }
        .empty-state h2 {
          margin-bottom: 8px;
        }
        .message {
          max-width: 70%;
          margin: 8px 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .assistant-message {
          align-self: flex-start;
        }
        .user-message {
          align-self: flex-end;
        }
        .system-message {
          background: #fef3c7;
          border: 1px solid #f59e0b;
        }
        .message-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          margin-bottom: 4px;
          color: #6b7280;
        }
        .message-text a {
          color: #1e40af;
          text-decoration: underline;
        }
        .message-text img {
          max-width: 100%;
          border-radius: 6px;
          margin-top: 6px;
        }
        .proximity-toggle-button {
          margin-top: 6px;
          background: transparent;
          border: 1px dashed #9ca3af;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .proximity-container {
          margin-top: 6px;
          border-radius: 6px;
          background: #f3f4f6;
          padding: 6px 8px;
        }
        .scroll-to-bottom-button {
          position: absolute;
          right: 16px;
          bottom: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1e90ff;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .login-prompt {
          margin-top: 10px;
          padding: 10px;
          border-radius: 8px;
          background: #fef3f2;
          border: 1px solid #fecaca;
        }
        .login-prompt-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .login-prompt-actions button {
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        .input-section {
          margin-top: 8px;
        }
        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .chat-input {
          flex: 1;
          min-height: 40px;
          max-height: 140px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          resize: vertical;
          font-size: 0.95rem;
        }
        .input-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .file-upload-label {
          display: inline-block;
          padding: 4px 8px;
          background: #e5e7eb;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .file-input-hidden {
          display: none;
        }
        .submit-button {
          padding: 6px 12px;
          background: #1e90ff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .tourism-summary-card {
          margin-bottom: 10px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          padding: 10px;
        }
        .tourism-summary-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .tourism-summary-flag {
          width: 32px;
          height: 20px;
          object-fit: cover;
          border-radius: 4px;
        }
        .tourism-summary-body > div {
          font-size: 0.85rem;
          margin-bottom: 2px;
        }
        .notification-panel {
          margin-bottom: 10px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          padding: 10px;
        }
        .notification-item {
          border-bottom: 1px solid #e5e7eb;
          padding: 6px 0;
        }
        .notification-item:last-child {
          border-bottom: none;
        }
        .notification-time {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 2px;
        }
        .bell-container {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
        }
        .notification-button {
          font-size: 16px;
          color: white;
        }
        .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 999px;
          padding: 2px 5px;
          font-size: 0.6rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
        }
        .badge.pulsing {
          animation: pulse-badge 1.5s infinite;
        }
        @keyframes pulse-badge {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }
        .hamburger-button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hamburger-button-icon {
          font-size: 16px;
          color: white;
        }
        .tourism-toggle-button {
          padding: 6px 12px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.14);
          color: white;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .tourism-toggle-button.active {
          background: #22c55e;
        }
        .agent-menu-container {
          position: relative;
        }
        .agent-button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .agent-menu {
          position: absolute;
          bottom: 40px;
          right: 0;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          padding: 6px 0;
          opacity: 0;
          pointer-events: none;
          transform: translateY(6px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          min-width: 160px;
          z-index: 100;
        }
        .agent-menu.open {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }
        .agent-item {
          display: block;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: 6px 10px;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .agent-item.active {
          background: #eff6ff;
        }
        .chat-header-left,
        .chat-header-right {
          gap: 8px;
        }
        @media (min-width: 768px) {
          .baje-container {
            height: 100vh;
          }
          .main-content {
            padding-right: 16px;
          }
          .nav-card {
            position: relative;
            transform: translateX(0);
          }
        }
        @media (max-width: 767px) {
          .chat-header {
            flex-wrap: wrap;
          }
          .chat-section {
            padding: 10px;
          }
          .messages-container {
            padding: 8px 10px 60px 10px;
          }
          .message {
            max-width: 100%;
          }
          .nav-card {
            width: 80%;
          }
          .header-title-group {
            max-width: 70%;
          }
          .chat-subtitle {
            display: none;
          }
        }
        .nav-card {
          border-radius: 0 8px 8px 0;
        }
        .nav-card-open {
          transform: translateX(0);
        }
        .nav-card-title {
          font-weight: 600;
        }
        .nav-card-list a,
        .nav-card-list button {
          font-size: 0.9rem;
        }
        .nav-card-section-title {
          font-size: 0.85rem;
        }
        .nav-card-starter-item button {
          font-size: 0.8rem;
        }
        .nav-card {
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.04);
        }
        .bell-container .badge {
          --badge-size: 18px;
          --badge-font: 10px;
        }
        @media (min-width: 768px) {
          .bell-container .badge {
            --badge-size: 20px;
            --badge-font: 11px;
          }
        }
        @media only screen and (max-width: 450px) {
          .chat-header {
            padding: 10px;
          }
          .hamburger-button {
            margin-left: auto;
          }
          .nav-card {
            width: 100%;
            max-width: 450px;
            right: -450px;
            border-radius: 0;
          }
          .nav-card.nav-card-open {
            right: 0;
          }
        }
        @media only screen and (max-width: 1024px) {
          .agent-menu.open {
            position: fixed;
            right: 70px;
            bottom: 80px;
            margin-right: 8px;
            z-index: 1100;
          }
        }
      `}</style>
    </div>
  );
}

export default Baje;
