import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import sanitizeHtml from 'sanitize-html';
import './Baje.css';
import './tailwind.css';
import ChatBarTourism from './ChatBarTourism'; // tourism sidebar
import VariableProximity from '../components/VariableProximity';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUmbrellaBeach, faWaveSquare } from '@fortawesome/free-solid-svg-icons';

// Simple Barbados accommodation options for onboarding
const BARBADOS_HOTELS = [
  {
    id: 'o2',
    name: 'O2 Beach Club & Spa',
    priceRange: '$400–$800',
    rating: '4.8',
  },
  {
    id: 'sandals',
    name: 'Sandals Royal Barbados',
    priceRange: '$500–$900',
    rating: '4.7',
  },
  {
    id: 'accra',
    name: 'Accra Beach Hotel & Spa',
    priceRange: '$250–$450',
    rating: '4.3',
  },
  {
    id: 'airbnb',
    name: 'South Coast Airbnb Apartment',
    priceRange: '$120–$250',
    rating: '4.6',
  },
];

// Shared Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

function Baje() {
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fetchingProfileRef = useRef(false);
  const fetchingFactRef = useRef(false);
  const fetchingTipRef = useRef(false);
  const messagesContainerRef = useRef(null);
  const tourismBarRef = useRef(null);
  const tourismButtonRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [avatarImage, setAvatarImage] = useState(null);

  // Agent picker
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('Main');
  const [agentIcon, setAgentIcon] = useState('🤖');

  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);

  // Fact/Tip UI state
  const [isFactsCardOpen, setIsFactsCardOpen] = useState(false);
  const [isTipCardOpen, setIsTipCardOpen] = useState(false);
  const [fact, setFact] = useState({ questions: '', answers: '' });
  const [currentTip, setCurrentTip] = useState({ id: null, tip_text: '' });

  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [usageStartTime, setUsageStartTime] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'Barbados',
    nickname: 'Bajan',
    flagUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Flag_of_Barbados.svg/1200px-Flag_of_Barbados.svg.png',
  });
  const [chatSessionId, setChatSessionId] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  const TIP_INTERVAL = 1800000; // 30m

  // Tourism sidebar toggle
  const [isTourismBarOpen, setIsTourismBarOpen] = useState(false);

  // Onboarding state for "Planning a Visit"
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    budget: '',
    startDate: '',
    endDate: '',
    wantReminder: false,
    stayOption: '',
    interests: [],
    wantBucket: false,
  });
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Per-message VariableProximity toggle for tourism agent
  const [proximityToggles, setProximityToggles] = useState({}); // { [msgId]: boolean }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const TIP_TIMER_KEY = 'tipTimerStart';

  /* ---------------------- Axios CSRF interceptor ---------------------- */
  useEffect(() => {
    const reqId = api.interceptors.request.use((cfg) => {
      if (csrfToken) cfg.headers['X-CSRF-Token'] = csrfToken;
      return cfg;
    });
    const resId = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401) {
          navigate('/login', { replace: true });
        }
        return Promise.reject(err);
      }
    );
    return () => {
      api.interceptors.request.eject(reqId);
      api.interceptors.response.eject(resId);
    };
  }, [csrfToken, navigate]);

  /* -------------------------- CSRF on mount -------------------------- */
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await api.get('/api/csrf-token');
        setCsrfToken(res.data.csrfToken);
      } catch (err) {
        console.error('Error fetching CSRF token', err);
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: 'Sorry, unable to initialize (CSRF). Please refresh the page.',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    };
    fetchCsrfToken();
  }, []);

  /* ------------------------- Fetch user profile ------------------------- */
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!csrfToken || fetchingProfileRef.current) return;
      fetchingProfileRef.current = true;
      try {
        const res = await api.get('/api/profile');
        setUserId(res.data.id);
        setAvatarImage(res.data.avatarUrl || null);
      } catch (err) {
        if (err.response?.status === 401) navigate('/login', { replace: true });
      } finally {
        fetchingProfileRef.current = false;
      }
    };
    if (csrfToken) fetchUserProfile();
  }, [csrfToken, navigate]);

  /* -------------------- Fetch Onboarding Status (NEW) -------------------- */
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      // Only fetch if we have auth + selected country
      if (!csrfToken || !userId || !selectedCountry.name) return;

      try {
        const res = await api.get('/api/tourism-onboarding/status', {
          params: { country: selectedCountry.name },
        });

        // 1. Mark completed
        if (res.data.hasCompletedOnboarding) {
          setHasCompletedOnboarding(true);
        }

        // 2. Populate state from DB if data exists
        if (res.data.onboarding) {
          const dbData = res.data.onboarding;
          // Map snake_case (DB) -> camelCase (Frontend State)
          setOnboardingData({
            budget: dbData.budget || '',
            startDate: dbData.start_date || '',
            endDate: dbData.end_date || '',
            wantReminder: !!dbData.want_reminder,
            stayOption: dbData.stay_option || '',
            interests: Array.isArray(dbData.interests) ? dbData.interests : [],
            wantBucket: !!dbData.want_bucket_list,
          });
        }
      } catch (err) {
        console.error('Error fetching onboarding status:', err);
      }
    };

    fetchOnboardingStatus();
  }, [csrfToken, userId, selectedCountry.name]);

  /* ----------------------- Initialize chat session ----------------------- */
  useEffect(() => {
    if (location.state?.restoredChat) {
      const { id, messages } = location.state.restoredChat;
      setChatSessionId(id);
      setMessages(messages);
    } else {
      const newSessionId = uuidv4();
      setChatSessionId(newSessionId);
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: `Welcome to ${selectedCountry.name}! I'm your ${selectedCountry.nickname} helper! Ask me about beaches, food, history, festivals!`,
          created_at: new Date().toISOString(),
          animated: false,
          isWelcome: true,
        },
      ]);
      saveChat(newSessionId, []);
    }
    setUsageStartTime(Date.now());
  }, [selectedCountry, location.state]);

  /* --------------------------- Notifications --------------------------- */
  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!csrfToken || !userId) return;
      try {
        const res = await api.get('/api/notifications');
        const count = Array.isArray(res.data) ? res.data.length : 0;
        setNotificationCount((prev) => Math.max(prev, count));

        const cached = Number(localStorage.getItem('notificationsCount') || '0');
        if (count > cached) {
          localStorage.setItem('notificationsCount', String(count));
          window.dispatchEvent(new Event('notifications:updated'));
        }
        const lastSeen = Number(localStorage.getItem('lastSeenNotificationCount') || 0);
        setShowNotificationBadge(count > lastSeen);
      } catch (err) {
        console.error('Error fetching notifications', err?.response?.data || err.message);
      }
    };
    fetchNotificationCount();
  }, [csrfToken, userId]);

  useEffect(() => {
    const syncFromStorage = () => {
      const count = Number(localStorage.getItem('notificationsCount') || '0');
      const lastSeen = Number(localStorage.getItem('lastSeenNotificationCount') || '0');
      setNotificationCount((prev) => Math.max(prev, count));
      setShowNotificationBadge(count > lastSeen);
    };
    syncFromStorage();
    const onFocus = () => syncFromStorage();
    const onUpdated = () => syncFromStorage();
    window.addEventListener('notifications:updated', onUpdated);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('notifications:updated', onUpdated);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const sync = async () => {
      const cached = Number(localStorage.getItem('notificationsCount') || '0');
      if (cached > 0) {
        setNotificationCount((prev) => Math.max(prev, cached));
      } else if (csrfToken && userId) {
        try {
          const res = await api.get('/api/notifications');
          const count = Array.isArray(res.data) ? res.data.length : 0;
          setNotificationCount((prev) => Math.max(prev, count));
          localStorage.setItem('notificationsCount', String(count));
          const lastSeen = Number(
            localStorage.getItem('lastSeenNotificationCount') || '0'
          );
          setShowNotificationBadge(count > lastSeen);
        } catch {
          /* no-op */
        }
      }
    };
    sync();

    const onStorage = (e) => {
      if (e.key === 'notificationsCount') {
        const v = Number(e.newValue || '0');
        setNotificationCount((prev) => Math.max(prev, v));
      }
    };
    const onVisibility = () => {
      if (!document.hidden) sync();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [csrfToken, userId]);

  /* ----------------------- Persist chat on change ----------------------- */
  useEffect(() => {
    if (messages.some((m) => m.role === 'user')) {
      saveChat(chatSessionId, messages);
    }
  }, [messages, chatSessionId]);

  /* ------------------------ Tips timer ONLY ------------------------ */
  useEffect(() => {
    const initializeTimer = (key, interval, callback) => {
      const startTime = localStorage.getItem(key);
      const now = Date.now();
      let delay;
      if (startTime) {
        const elapsed = now - parseInt(startTime, 10);
        const timeSinceLast = elapsed % interval;
        delay = timeSinceLast === 0 ? interval : interval - timeSinceLast;
      } else {
        localStorage.setItem(key, now.toString());
        delay = interval;
      }
      const timer = setTimeout(() => {
        callback();
        const intervalId = setInterval(callback, interval);
        return () => clearInterval(intervalId);
      }, delay);
      return () => clearTimeout(timer);
    };

    const fetchTip = async () => {
      if (fetchingTipRef.current || !csrfToken) return;
      fetchingTipRef.current = true;
      try {
        if (!isFactsCardOpen && !isTipCardOpen) {
          const res = await api.get('/api/tips', {
            params: { country: selectedCountry.name },
          });
          setCurrentTip(
            res.data || { id: uuidv4(), tip_text: 'Visit Oistins Fish Fry on Friday nights!' }
          );
          setIsTipCardOpen(true);
          setIsFactsCardOpen(false);
        }
      } catch {
        setCurrentTip({
          id: uuidv4(),
          tip_text: 'Visit Oistins Fish Fry on Friday nights!',
        });
        setIsTipCardOpen(true);
        setIsFactsCardOpen(false);
      } finally {
        fetchingTipRef.current = false;
      }
    };

    if (!isFactsCardOpen && !isTipCardOpen && csrfToken) {
      const tipCleanup = initializeTimer(TIP_TIMER_KEY, TIP_INTERVAL, fetchTip);
      return () => {
        tipCleanup();
      };
    }
  }, [csrfToken, selectedCountry.name, isFactsCardOpen, isTipCardOpen]);

  /* ----------------------------- Scroll down ----------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ----------------------- Save usage on unmount ----------------------- */
  useEffect(() => {
    return () => {
      if (chatSessionId && usageStartTime) {
        const durationSeconds = Math.round((Date.now() - usageStartTime) / 1000);
        saveUsageTime(chatSessionId, durationSeconds);
      }
    };
  }, [chatSessionId, usageStartTime]);

  /* ------------------ Persist Agent Picker across refresh ----------------- */
  useEffect(() => {
    const a = localStorage.getItem('activeAgent');
    const i = localStorage.getItem('agentIcon');
    if (a) setActiveAgent(a);
    if (i) setAgentIcon(i);
  }, []);
  useEffect(() => {
    localStorage.setItem('activeAgent', activeAgent);
    localStorage.setItem('agentIcon', agentIcon);
  }, [activeAgent, agentIcon]);

  /* -------------------- Click-outside to close tourism bar -------------------- */
  useEffect(() => {
    if (!isTourismBarOpen) return;

    const handleClickOutside = (e) => {
      const barEl = tourismBarRef.current;
      const btnEl = tourismButtonRef.current;

      if (barEl && barEl.contains(e.target)) return;
      if (btnEl && btnEl.contains(e.target)) return;

      setIsTourismBarOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isTourismBarOpen]);

  /* ----------------------------- API helpers ----------------------------- */
  const saveChat = async (sessionId, chatMessages) => {
    try {
      if (!csrfToken || !userId) return;
      const userMessage = [...chatMessages].reverse().find((m) => m.role === 'user');
      const snippet = userMessage
        ? userMessage.content.slice(0, 100) + '...'
        : 'No user messages';
      await api.post('/api/chat/save', {
        sessionId,
        messages: chatMessages,
        title: `${selectedCountry.name} ${activeAgent} Chat`,
        snippet,
        userId,
      });
    } catch (err) {
      console.error('Error saving chat', err?.response?.data || err.message);
    }
  };

  const saveUsageTime = async (sessionId, durationSeconds) => {
    try {
      if (!csrfToken || !userId) return;
      await api.post('/api/usage', { sessionId, durationSeconds, userId });
    } catch (err) {
      console.error('Error saving usage time', err?.response?.data || err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: `${activeAgent}: ${inputValue}`,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await api.post('/ask', {
        prompt: `${selectedCountry.name} ${activeAgent}: ${userMessage.content.replace(
          /^Main:\s*/,
          ''
        )}`,
        userId,
        countryName: selectedCountry.name,
      });

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        agent: activeAgent, // tag which agent answered
        type: res.data.responseType || 'text',
        title: res.data.title,
        mapEmbedUrl: res.data.mapEmbedUrl,
        content: res.data.response || res.data.text || 'No response',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Error:', err);

      let errorMsg = 'Sorry mon Try again later';
      if (err?.response?.data?.detail) {
        errorMsg = `AI error: ${err.response.data.detail}`;
      } else if (err?.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err?.message) {
        errorMsg = `Network: ${err.message}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: errorMsg,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login', { replace: true });
  };

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const toggleCountryMenu = () => setIsCountryMenuOpen(!isCountryMenuOpen);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Profile', path: '/profile' },
    { name: 'Saved Chats', path: '/saved-chats' },
    { name: 'Settings', path: '/settings' },
    { name: 'Help', path: '/help' },
    {
      name: 'Logout',
      path: '/login',
      onClick: (e) => {
        e.preventDefault();
        handleLogout();
        setIsNavOpen(false);
      },
    },
  ];

  const isTourism = activeAgent === 'Tourism';
  const showTourismBar = isTourism && isTourismBarOpen;

  const handleShowFacts = async () => {
    if (fetchingFactRef.current || !csrfToken) return;
    fetchingFactRef.current = true;
    try {
      const res = await api.get('/api/facts', { params: { country: selectedCountry.name } });
      setFact(
        res.data || { questions: 'What is the capital of Barbados?', answers: 'Bridgetown' }
      );
      setIsFactsCardOpen(true);
      setIsTipCardOpen(false);
    } catch {
      setFact({ questions: 'What is the capital of Barbados?', answers: 'Bridgetown' });
      setIsFactsCardOpen(true);
      setIsTipCardOpen(false);
    } finally {
      fetchingFactRef.current = false;
    }
  };

  // ---------------- Onboarding helpers ("Planning a Visit") ----------------

  const startOnboarding = () => {
    if (isOnboardingActive || hasCompletedOnboarding) return;
    const initialStep = 1;
    setIsOnboardingActive(true);
    setOnboardingStep(initialStep);
    setOnboardingData({
      budget: '',
      startDate: '',
      endDate: '',
      wantReminder: false,
      stayOption: '',
      interests: [],
      wantBucket: false,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        type: 'onboarding',
        step: initialStep,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const goToOnboardingStep = (step) => {
    setOnboardingStep(step);
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        type: 'onboarding',
        step,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handleInterestToggle = (value) => {
    setOnboardingData((prev) => {
      const exists = prev.interests.includes(value);
      const interests = exists
        ? prev.interests.filter((v) => v !== value)
        : [...prev.interests, value];
      return { ...prev, interests };
    });
  };

  const suggestStayOption = () => {
    if (!onboardingData.budget) {
      alert('Pick your budget first so I can suggest something Bajan-nice! 😄');
      return;
    }

    let suggested = BARBADOS_HOTELS[2]; // default

    if (onboardingData.budget === '$200-5000') {
      suggested = BARBADOS_HOTELS[2]; // Accra
    } else if (
      onboardingData.budget === '$6000' ||
      onboardingData.budget === '$10,000'
    ) {
      suggested = BARBADOS_HOTELS[1]; // Sandals
    } else if (onboardingData.budget === 'Other') {
      suggested = BARBADOS_HOTELS[3]; // Airbnb
    }

    setOnboardingData((prev) => ({
      ...prev,
      stayOption: `Suggested: ${suggested.name} (${suggested.priceRange}, ⭐ ${suggested.rating})`,
    }));
  };

  const finishOnboarding = async (wantBucketList) => {
    // Build an updated snapshot of onboarding data
    const updatedData = {
      ...onboardingData,
      wantBucket: wantBucketList,
    };

    // Update React state
    setOnboardingData(updatedData);
    setIsOnboardingActive(false);
    setHasCompletedOnboarding(true);

    const interestsText =
      updatedData.interests && updatedData.interests.length
        ? updatedData.interests.join(', ')
        : 'Not specified yet';

    const summaryText = [
      "Sweet! I've saved your trip profile:",
      `• Budget: ${updatedData.budget || 'Not specified'}`,
      `• Dates: ${
        updatedData.startDate && updatedData.endDate
          ? `${updatedData.startDate} → ${updatedData.endDate}`
          : 'Not specified'
      }`,
      `• Encouragement reminders: ${updatedData.wantReminder ? 'Yes' : 'No'}`,
      `• Stay: ${updatedData.stayOption || 'Not decided yet'}`,
      `• Interests: ${interestsText}`,
      `• Bucket list: ${wantBucketList ? 'Yes please!' : 'Not right now'}`,
    ].join('\n');

    // Show summary message in the chat
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        content: summaryText,
        created_at: new Date().toISOString(),
        animated: false,
      },
    ]);

    // Persist onboarding to backend controller
    try {
      if (csrfToken && userId && chatSessionId) {
        await api.post('/api/tourism-onboarding/complete', {
          sessionId: chatSessionId,
          country: selectedCountry.name,
          budget: updatedData.budget,
          startDate: updatedData.startDate,
          endDate: updatedData.endDate,
          wantReminder: updatedData.wantReminder,
          stayOption: updatedData.stayOption,
          interests: updatedData.interests,
          wantBucket: updatedData.wantBucket,
        });
      } else {
        console.warn(
          'Skipping onboarding save – missing csrfToken, userId or chatSessionId',
          {
            csrfTokenPresent: !!csrfToken,
            userId,
            chatSessionId,
          }
        );
      }
    } catch (err) {
      console.error(
        'Error saving onboarding',
        err?.response?.data || err.message || err
      );
    }
  };

  const displayCount = notificationCount > 9 ? '9+' : String(notificationCount);

  // ----------- Message renderer (welcome, onboarding, proximity text) -----------

  const renderMessageContent = (msg, isProximityOn = false) => {
    // Onboarding Q&A cards
    if (msg.type === 'onboarding') {
      const isCurrent = isOnboardingActive && msg.step === onboardingStep;

      const baseCardStyle = {
        background: '#ffffff',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        maxWidth: '100%',
        fontSize: '14px',
        color: '#111827',
        opacity: isCurrent ? 1 : 0.7,
        pointerEvents: isCurrent ? 'auto' : 'none',
      };

      if (msg.step === 1) {
        // Budget card
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Trip Budget</div>
            <p style={{ marginBottom: 8 }}>
              What&apos;s your total budget for this Barbados visit?
            </p>
            <select
              value={onboardingData.budget}
              disabled={!isCurrent}
              onChange={(e) =>
                setOnboardingData((prev) => ({ ...prev, budget: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                marginBottom: 12,
              }}
            >
              <option value="">Select your budget</option>
              <option value="$200-5000">$200–5,000</option>
              <option value="$6000">$6,000</option>
              <option value="$10,000">$10,000</option>
              <option value="Other">Other</option>
            </select>
            <button
              type="button"
              disabled={!isCurrent || !onboardingData.budget}
              onClick={() => goToOnboardingStep(2)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor: !isCurrent || !onboardingData.budget ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 2) {
        // Trip dates + reminder
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Trip Dates</div>
            <p style={{ marginBottom: 8 }}>How long will your trip be?</p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: 4 }}>
                  Start date
                </label>
                <input
                  type="date"
                  disabled={!isCurrent}
                  value={onboardingData.startDate}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: 4 }}>
                  End date
                </label>
                <input
                  type="date"
                  disabled={!isCurrent}
                  value={onboardingData.endDate}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                disabled={!isCurrent}
                checked={onboardingData.wantReminder}
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    wantReminder: e.target.checked,
                  }))
                }
              />
              Want to set an encouragement reminder?
            </label>
            <button
              type="button"
              disabled={!isCurrent || !onboardingData.startDate || !onboardingData.endDate}
              onClick={() => goToOnboardingStep(3)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor:
                  !isCurrent || !onboardingData.startDate || !onboardingData.endDate
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 3) {
        // Where do you plan to stay? (hotels list + suggestion)
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Where do you plan to stay?</div>
            <p style={{ marginBottom: 8 }}>
              Pick an option or let me suggest one based on your budget.
            </p>
            <select
              disabled={!isCurrent}
              value={onboardingData.stayOption}
              onChange={(e) =>
                setOnboardingData((prev) => ({
                  ...prev,
                  stayOption: e.target.value,
                }))
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                marginBottom: 10,
              }}
            >
              <option value="">Choose a place to stay</option>
              {BARBADOS_HOTELS.map((h) => (
                <option
                  key={h.id}
                  value={`${h.name} (${h.priceRange}, ⭐ ${h.rating})`}
                >
                  {h.name} — {h.priceRange} — ⭐ {h.rating}
                </option>
              ))}
              <option value="Not sure yet">I&apos;m not sure yet</option>
            </select>
            <button
              type="button"
              disabled={!isCurrent}
              onClick={suggestStayOption}
              style={{
                background: 'white',
                border: '1px solid #1E90FF',
                color: '#1E90FF',
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '13px',
                marginBottom: 8,
                cursor: !isCurrent ? 'not-allowed' : 'pointer',
              }}
            >
              Suggest one for me
            </button>
            {onboardingData.stayOption && (
              <div
                style={{
                  fontSize: '13px',
                  marginBottom: 8,
                  color: '#047857',
                }}
              >
                {onboardingData.stayOption}
              </div>
            )}
            <button
              type="button"
              disabled={!isCurrent || !onboardingData.stayOption}
              onClick={() => goToOnboardingStep(4)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor:
                  !isCurrent || !onboardingData.stayOption ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 4) {
        // Interests
        const interestOptions = [
          'Surfing',
          'Partying',
          'Foodie',
          'Culture',
          'Nature',
          'Family fun',
          'Other',
        ];

        const isChecked = (val) => onboardingData.interests.includes(val);

        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Your Interests</div>
            <p style={{ marginBottom: 8 }}>
              What kind of vibes are you looking for on this trip?
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: 10,
              }}
            >
              {interestOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={!isCurrent}
                  onClick={() => handleInterestToggle(opt)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '999px',
                    border: isChecked(opt) ? '1px solid #1E90FF' : '1px solid #d1d5db',
                    background: isChecked(opt) ? '#1E90FF' : '#ffffff',
                    color: isChecked(opt) ? '#ffffff' : '#111827',
                    fontSize: '13px',
                    cursor: !isCurrent ? 'not-allowed' : 'pointer',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!isCurrent || onboardingData.interests.length === 0}
              onClick={() => goToOnboardingStep(5)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor:
                  !isCurrent || onboardingData.interests.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 5) {
        // Bucket list yes/no
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Bucket List</div>
            <p style={{ marginBottom: 10 }}>
              Would you like me to create a personalized Barbados bucket list for you?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={!isCurrent}
                onClick={() => finishOnboarding(true)}
                style={{
                  flex: 1,
                  background: '#1E90FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 0',
                  cursor: !isCurrent ? 'not-allowed' : 'pointer',
                }}
              >
                Yes, please
              </button>
              <button
                type="button"
                disabled={!isCurrent}
                onClick={() => finishOnboarding(false)}
                style={{
                  flex: 1,
                  background: '#ffffff',
                  color: '#1F2933',
                  border: '1px solid #d1d5db',
                  borderRadius: '999px',
                  padding: '8px 0',
                  cursor: !isCurrent ? 'not-allowed' : 'pointer',
                }}
              >
                Not right now
              </button>
            </div>
          </div>
        );
      }

      return <div style={baseCardStyle}>Loading trip setup…</div>;
    }

    // Map card
    if (msg.type === 'map' && msg.mapEmbedUrl) {
      return (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '100%',
          }}
        >
          {msg.title && (
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
              {msg.title}
            </div>
          )}
          {msg.content && (
            <div style={{ fontSize: '13px', marginBottom: '8px', color: '#4b5563' }}>
              {msg.content}
            </div>
          )}
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            <iframe
              src={msg.mapEmbedUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
                borderRadius: '8px',
              }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title={msg.title || 'Location map'}
            />
          </div>
        </div>
      );
    }

    // File upload responses (if backend sends fileUrl)
    if (msg.fileUrl) {
      return (
        <>
          <div>{msg.content}</div>
          {/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
            <img
              src={msg.fileUrl}
              alt="Uploaded"
              style={{ maxWidth: '200px', marginTop: '10px' }}
            />
          ) : (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
              View File
            </a>
          )}
        </>
      );
    }

    // Welcome message with "Planning a Visit" button (Tourism agent only)
    if (msg.role === 'assistant' && msg.isWelcome) {
      const showPlanningButton =
        activeAgent === 'Tourism' && !isOnboardingActive && !hasCompletedOnboarding;

      return (
        <div>
          <div>{msg.content}</div>
          {showPlanningButton && (
            <button
              type="button"
              onClick={startOnboarding}
              style={{
                marginTop: '10px',
                background: '#1E90FF', // dodger blue
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Planning a Visit
            </button>
          )}
        </div>
      );
    }

    // Tourism agent normal response (VariableProximity only affects text; button is rendered outside)
    if (
      msg.role === 'assistant' &&
      (msg.agent === 'Tourism' || (!msg.agent && activeAgent === 'Tourism')) &&
      !msg.isWelcome &&
      msg.type !== 'map' &&
      msg.type !== 'onboarding'
    ) {
      if (!isProximityOn) {
        // Just normal text when proximity is off
        return msg.content;
      }

      // VariableProximity ON: overlay effect but keep same layout space INSIDE .message
      return (
        <div style={{ position: 'relative' }}>
          {/* Invisible text to preserve layout inside .message */}
          <div
            style={{
              visibility: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            <VariableProximity
              label={msg.content}
              className="variable-proximity-demo"
              fromFontVariationSettings="'wght' 400, 'opsz' 9"
              toFontVariationSettings="'wght' 1000, 'opsz' 40"
              containerRef={messagesContainerRef}
              radius={100}
              falloff="linear"
            />
          </div>
        </div>
      );
    }

    // Main agent: plain text always
    if (msg.role === 'assistant') {
      return msg.content;
    }

    // default user / other roles
    return msg.content;
  };

  return (
    <div className="baje-container" style={{ zIndex: 100, position: 'relative' }}>
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className="ai-avatar"
            style={{
              ...(avatarImage && {
                backgroundImage: `url(${avatarImage})`,
                backgroundColor: 'transparent',
              }),
            }}
          >
            {!avatarImage && 'ISLE'}
          </div>
          <div className="ai-info">
            <div className="ai-name">ISLE</div>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div className="ai-status">Your {selectedCountry.name} Guide</div>
              <div
                className="barbados-flag"
                onClick={toggleCountryMenu}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: `url(${selectedCountry.flagUrl}) center/cover`,
                  marginLeft: '10px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>

        <div className="header-buttons">
          <div
            className="bell-container"
            style={{ display: 'flex', marginRight: '8px', position: 'relative' }}
          >
            <button
              className="notification-button"
              onClick={() => {
                if (chatSessionId && usageStartTime) {
                  const durationSeconds = Math.round(
                    (Date.now() - usageStartTime) / 1000
                  );
                  saveUsageTime(chatSessionId, durationSeconds);
                }
                localStorage.setItem(
                  'lastSeenNotificationCount',
                  notificationCount.toString()
                );
                localStorage.setItem('notificationsCount', notificationCount.toString());
                window.dispatchEvent(new Event('notifications:updated'));
                setShowNotificationBadge(false);
                navigate('/notifications');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.3s ease',
                fontSize: '18px',
              }}
            >
              🔔
            </button>
            <span
              className="badge"
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-12px',
                zIndex: 2000,
                backgroundColor: 'red',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                padding: 0,
                lineHeight: '20px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                display:
                  notificationCount > 0 && showNotificationBadge ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px white',
              }}
              aria-label={`Amount of Notifications: ${displayCount}`}
              title={`Amount of Notifications: ${displayCount}`}
            >
              {displayCount}
            </span>
          </div>

          <button
            className={`hamburger-button ${isNavOpen ? 'active' : ''}`}
            onClick={toggleNav}
          >
            <span className="hamburger-button-span"></span>
            <span className="hamburger-button-span"></span>
            <span className="hamburger-button-span"></span>
          </button>
        </div>
      </div>

      <div
        className={`nav-overlay ${
          isNavOpen || isCountryMenuOpen || isFactsCardOpen || isTipCardOpen
            ? 'active'
            : ''
        }`}
      >
        <div className={`nav-card ${isNavOpen ? 'nav-card-open' : ''}`}>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.name} className="nav-item">
                <Link
                  to={item.path}
                  className="nav-item-a"
                  onClick={(e) => {
                    if (item.onClick) {
                      item.onClick(e);
                    } else {
                      if (chatSessionId && usageStartTime) {
                        const durationSeconds = Math.round(
                          (Date.now() - usageStartTime) / 1000
                        );
                        saveUsageTime(chatSessionId, durationSeconds);
                      }
                      setIsNavOpen(false);
                    }
                  }}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={messagesContainerRef}
        className="chat-messages"
        style={{
          marginLeft: 0,
          transition: 'margin-left .28s ease',
        }}
      >
        {messages.map((msg) => {
          const isAssistantTourismReply =
            msg.role === 'assistant' &&
            (msg.agent === 'Tourism' || (!msg.agent && activeAgent === 'Tourism')) &&
            !msg.isWelcome &&
            msg.type !== 'map' &&
            msg.type !== 'onboarding';

          const isProximityOn = !!proximityToggles[msg.id];

          return (
            // Parent wrapper (not visible)
            <div
              key={msg.id}
              className="message-wrapper"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start', // everything on left side
              }}
            >
              {/* Actual bubble/card */}
              <div
                className="message"
                style={{
                  alignSelf: 'flex-start', // user + assistant both left
                }}
              >
                {renderMessageContent(msg, isAssistantTourismReply ? isProximityOn : false)}
              </div>

              {/* Variable Proximity toggle button as sibling, bottom-left */}
              {isAssistantTourismReply && (
                <button
                  type="button"
                  onClick={() =>
                    setProximityToggles((prev) => ({
                      ...prev,
                      [msg.id]: !prev[msg.id],
                    }))
                  }
                  style={{
                    marginTop: '4px',
                    marginLeft: '10px',
                    fontSize: '13px',
                    padding: '4px 6px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={
                    isProximityOn
                      ? 'Turn off variable proximity'
                      : 'Turn on variable proximity'
                  }
                >
                  <FontAwesomeIcon
                    icon={faWaveSquare}
                    style={{
                      fontSize: '14px',
                      opacity: isProximityOn ? 1 : 0.6,
                    }}
                  />
                </button>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="message">
            <div style={{ display: 'flex', gap: '5px' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ccc',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Facts Card */}
      <div
        className="facts-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          background: '#F5F5F5',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.5)',
          display: isFactsCardOpen && !isTipCardOpen ? 'block' : 'none',
          zIndex: 1003,
          color: 'black',
          textAlign: 'center',
        }}
      >
        <button
          className="facts-card-close"
          onClick={() => setIsFactsCardOpen(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'black',
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '10px',
          }}
        >
          Did you know?
        </div>
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>{fact.questions}</div>
        <div style={{ color: '#008000', fontSize: '14px' }}>{fact.answers}</div>
      </div>

      {/* Tip Card */}
      <div
        className="tip-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          background: '#F5F5F5',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.5)',
          display: isTipCardOpen && !isFactsCardOpen ? 'block' : 'none',
          zIndex: 1003,
          color: 'black',
          textAlign: 'center',
        }}
      >
        <button
          className="tip-card-close"
          onClick={() => setIsTipCardOpen(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'black',
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '15px',
            marginBottom: '15px',
          }}
        >
          {selectedCountry.name} Travel Tip
        </div>
        <div style={{ fontSize: '14px' }}>{currentTip.tip_text}</div>
      </div>

      {/* Tourism sidebar inside container, above input (LEFT side) */}
      {showTourismBar && (
        <div
          ref={tourismBarRef}
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            bottom: 80,
            zIndex: 1001,
          }}
        >
          <button
            type="button"
            onClick={() => setIsTourismBarOpen(false)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.4)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1002,
            }}
            aria-label="Close tourism tools"
          >
            ✕
          </button>
          <ChatBarTourism 
            visible={true} 
            onFactsClick={handleShowFacts}
            // ✅ PASSED: The new onboarding data
            onboardingData={onboardingData}
            hasCompletedOnboarding={hasCompletedOnboarding}
          />
        </div>
      )}

      {/* Purple circular button for tourism bar */}
      {isTourism && !showTourismBar && (
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

      {/* Input section */}
      <div
        className="input-section"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '15px',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 100,
          marginLeft: 0,
          transition: 'margin-left .28s ease',
        }}
      >
        <textarea
          className="input-field"
          rows={2}
          placeholder={`Ask me about ${selectedCountry.name}...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          style={{ flexGrow: 1, marginRight: '10px' }}
        />

        {/* Agent Picker */}
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
                {agent === 'Main' && '🤖'}
                {agent === 'Tourism' && '🏖️'}
                <span style={{ marginLeft: 8 }}>{agent}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Send button */}
        <button
          className="submit-button"
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          style={{
            background: '#1E90FF',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            transition: '0.3s ease',
          }}
        >
          {isLoading ? '...' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .baje-container { position: relative; z-index: 100; }
        .chat-header { position: sticky; top: 0; z-index: 101; }
        .nav-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0); z-index: 99; transition: background 0.3s ease; visibility: hidden;
        }
        .nav-overlay.active { background: rgba(0, 0, 0, 0.5); visibility: visible; }
        .nav-card {
          position: fixed; top: 0; right: -300px; width: 250px; height: 100vh;
          background: rgba(0, 0, 0, 0.9); padding: 20px; transition: right 0.3s ease; z-index: 1000;
          visibility: hidden; border-radius: 10px; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.35);
          display: flex; flex-direction: column; align-items: center;
        }
        .nav-card.nav-card-open { right: 0; visibility: visible; }
        .nav-list {
          list-style: none; padding: 0; margin: 150px 0 0 0;
          display: flex; flex-direction: column; align-items: center; width: 100%;
        }
        .nav-item { margin: 15px 0; width: 100%; text-align: center; }
        .nav-item-a {
          color: white; text-decoration: none; font-size: 18px; transition: color 0.2s ease;
          display: block; padding: 10px 0;
        }
        .nav-item-a:hover { color: #1E90FF; }
        .hamburger-button.active .hamburger-button-span { background: white; }
        .hamburger-button.active .hamburger-button-span:nth-child(1) {
          position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(45deg);
        }
        .hamburger-button.active .hamburger-button-span:nth-child(2) { opacity: 0; }
        .hamburger-button.active .hamburger-button-span:nth-child(3) {
          position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(-45deg);
        }
        .notification-button:hover { background: #1E90FF; }
        .submit-button:hover, .barbados-flag:hover { background: #1873CC; }
        .message { max-width: 70%; margin: 10px; border-radius: 5px; padding: 10px; }
        .message img { max-width: 200px; border-radius: 5px; margin: 10px; }
        .message a { color: #1E90FF; text-decoration: none; }
        .message a:hover { text-decoration: underline; }
        .bell-container { position: relative; width: 30px; height: 30px; cursor: pointer; }
        .bell-container .badge { --badge-size: 20px; --badge-font: 11px; }
        @media (max-width: 360px) {
          .bell-container .badge { --badge-size: 24px; --badge-font: 13px; }
        }
        @media (min-width: 361px) and (max-width: 450px) {
          .bell-container .badge { --badge-size: 22px; --badge-font: 12px; }
        }
        @media (min-width: 768px) {
          .bell-container .badge { --badge-size: 20px; --badge-font: 11px; }
        }
        @media only screen and (max-width: 450px) {
          .chat-header { padding: 10px; }
          .hamburger-button { margin-left: auto; }
          .nav-card { width: 100%; max-width: 450px; right: -450px; border-radius: 0; }
          .nav-card.nav-card-open { right: 0; }
        }
      `}</style>
    </div>
  );
}

export default Baje;