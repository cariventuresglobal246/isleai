import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Link, useNavigate } from 'react-router-dom';
import { useTour } from '@reactour/tour';
import { supabase } from "./lib/supabaseClient";

function BajeTour() {
  const { setIsOpen, isOpen, currentStep, setCurrentStep, steps } = useTour();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const quizTimerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const factTimerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [avatarImage, setAvatarImage] = useState(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isSubmitMenuOpen, setIsSubmitMenuOpen] = useState(false);
  const [isCountryMenuOpen, setToggleCountryMenu] = useState(false);
  const [isFactsCardOpen, setIsFactsCardOpen] = useState(false);
  const [isQuizCardOpen, setIsQuizCardOpen] = useState(false);
  const [isQuestionCardOpen, setIsQuestionCardOpen] = useState(false);
  const [fact, setFact] = useState({ question: '', answer: '' });
  const [quiz, setQuiz] = useState({ question: '', options: [], correct_answer: '' });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState({ id: null, question: '' });
  const [userResponse, setUserResponse] = useState('');
  const [responseFeedback, setResponseFeedback] = useState('');
  const [activeAgent, setActiveAgent] = useState('Main');
  const [agentIcon, setAgentIcon] = useState('🤖');
  const [submitIcon, setSubmitIcon] = useState('📝');
  const [uploadError, setUploadError] = useState(null);
  const [notificationCount, setNotificationCount] = useState(4);
  const [userPromptCount, setUserPromptCount] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'Barbados',
    nickname: 'Bajan',
    flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Flag_of_Barbados.svg/1200px-Flag_of_Barbados.svg.png'
  });
  const [tourStarted, setTourStarted] = useState(false);
  const navigate = useNavigate();

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const FACT_INTERVAL = 180000; // 3 minutes
  const QUESTION_INTERVAL = 120000; // 2 minutes

  const caribbeanCountries = [
    { name: 'Antigua and Barbuda', nickname: 'Antiguan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Flag_of_Antigua_and_Barbuda.svg/1200px-Flag_of_Antigua_and_Barbuda.svg.png' },
    { name: 'Bahamas', nickname: 'Bahamian', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Flag_of_the_Bahamas.svg/1200px-Flag_of_the_Bahamas.svg.png' },
    { name: 'Barbados', nickname: 'Bajan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Flag_of_Barbados.svg/1200px-Flag_of_Barbados.svg.png' },
    { name: 'Belize', nickname: 'Belizean', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Flag_of_Belize.svg/1200px-Flag_of_Belize.svg.png' },
    { name: 'Dominica', nickname: 'Dominican', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Flag_of_Dominica.svg/1200px-Flag_of_Dominica.svg.png' },
    { name: 'Grenada', nickname: 'Grenadian', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Flag_of_Grenada.svg/1200px-Flag_of_Grenada.svg.png' },
    { name: 'Guyana', nickname: 'Guyanese', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Flag_of_Guyana.svg/1200px-Flag_of_Guyana.svg.png' },
    { name: 'Jamaica', nickname: 'Jamaican', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Flag_of_Jamaica.svg/1200px-Flag_of_Jamaica.svg.png' },
    { name: 'Saint Kitts and Nevis', nickname: 'Kittitian or Nevisian', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Flag_of_Saint_Kitts_and_Nevis.svg/1200px-Flag_of_Saint_Kitts_and_Nevis.svg.png' },
    { name: 'Saint Lucia', nickname: 'Lucian', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Flag_of_Saint_Lucia.svg/1200px-Flag_of_Saint_Lucia.svg.png' },
    { name: 'Saint Vincent and the Grenadines', nickname: 'Vincentian', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Flag_of_Saint_Vincent_and_the_Grenadines.svg/1200px-Flag_of_Saint_Vincent_and_the_Grenadines.svg.png' },
    { name: 'Suriname', nickname: 'Surinamese', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Flag_of_Suriname.svg/1200px-Flag_of_Suriname.svg.png' },
    { name: 'Trinidad and Tobago', nickname: 'Trinbagonian', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Flag_of_Trinidad_and_Tobago.svg/1200px-Flag_of_Trinidad_and_Tobago.svg.png' }
  ];

  const defaultQuestion = {
    id: uuidv4(),
    question_text: 'What is your favorite cultural festival in Barbados?'
  };

  const insertDefaultQuestion = async () => {
    try {
      const { error } = await supabase
        .from('open_questions')
        .insert({ id: defaultQuestion.id, question_text: defaultQuestion.question_text });
      if (error) throw error;
      return defaultQuestion;
    } catch (err) {
      console.error('insertDefault error:', err.message);
      throw err;
    }
  };

  const fetchFact = async () => {
    try {
      const { count, error } = await supabase
        .from('sports')
        .select('*', { count: 'exact', head: true });
      if (error) throw new Error('Fact count failed');
      if (!count) {
        const fallback = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
        setFact(fallback);
        return;
      }
      const randomOffset = Math.floor(Math.random() * count);
      const { data, error: fetchError } = await supabase
        .from('sports')
        .select('questions, answers')
        .range(randomOffset, randomOffset);
      if (fetchError || !data?.length) throw new Error('No fact data received');
      setFact({ question: data[0].questions, answer: data[0].answers });
    } catch (err) {
      console.error('fetchFact error:', err.message);
      const fallback = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
      setFact(fallback);
    }
  };

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase.rpc('get_random_sportsq');
      if (error || !data?.length) throw new Error('No quiz data received');
      const row = data[0];
      setQuiz({
        question: row.question,
        correct_answer: row.right_answer,
        options: shuffle([row.right_answer, row.wrong_answer1, row.wrong_answer2])
      });
    } catch (err) {
      console.error('fetchQuiz error:', err.message);
      setQuiz(fallbackQuiz);
    }
  };

  const fetchQuestion = async (retry = true) => {
    try {
      const { count, error } = await supabase
        .from('open_questions')
        .select('*', { count: 'exact', head: true });
      if (error) throw new Error('Question count failed');
      if (!count) {
        await insertDefaultQuestion();
        const { data, error: fetchError } = await supabase
          .from('open_questions')
          .select('id, question_text')
          .eq('id', defaultQuestion.id)
          .single();
        if (fetchError || !data) throw new Error('Failed to fetch default question');
        setCurrentQuestion({ id: data.id, question: data.question_text });
        return;
      }
      const randomOffset = Math.floor(Math.random() * count);
      const { data, error: fetchError } = await supabase
        .from('open_questions')
        .select('id, question_text')
        .range(randomOffset, randomOffset);
      if (fetchError || !data?.length) {
        if (retry) return fetchQuestion(false);
        throw new Error('No question data received');
      }
      setCurrentQuestion({ id: data[0].id, question: data[0].question_text });
    } catch (err) {
      console.error('fetchQuestion error:', err.message);
      setCurrentQuestion({ id: null, question: 'Error loading question. Please try again.' });
    }
  };

  const shuffle = (array) => array.sort(() => Math.random() - 0.5);

  const fetchSignedUrl = async (filePath, bucket = 'avatars') => {
    if (!filePath) return null;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60);
    if (error) {
      console.error(`Error fetching signed URL from ${bucket} bucket:`, error);
      return null;
    }
    return data.signedUrl;
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds 10MB limit.');
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Sorry, the file is too large. Please upload a file smaller than 10MB.',
          created_at: new Date().toISOString()
        }
      ]);
      return;
    }
    setIsLoading(true);
    setUploadError(null);
    try {
      await supabase.auth.refreshSession();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');
      const fileName = `${uuidv4()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('Uploads').upload(fileName, file);
      if (uploadError) throw uploadError;
      const signedUrl = await fetchSignedUrl(fileName, 'Uploads');
      if (signedUrl) {
        const fileMessage = {
          id: uuidv4(),
          role: 'user',
          content: `Uploaded file: ${file.name}`,
          fileUrl: signedUrl,
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, fileMessage]);
      }
    } catch (err) {
      console.error('File upload error:', err.message);
      setUploadError('Failed to upload file. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Failed to upload file. Please try again.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizAnswer = async (answer) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === quiz.correct_answer;
    setQuizFeedback(isCorrect ? 'Correct! Great job!' : `Incorrect. The correct answer is ${quiz.correct_answer}.`);
    quizTimerRef.current = setTimeout(() => {
      setIsQuizCardOpen(false);
      setSelectedAnswer(null);
      setQuizFeedback('');
      fetchQuiz();
    }, 3000);
  };

  const handleQuestionSubmit = async () => {
    if (!userResponse.trim()) {
      setResponseFeedback('Please provide a response.');
      setTimeout(() => setResponseFeedback(''), 3000);
      return;
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Please log in to submit a response.');
      const { error } = await supabase
        .from('open_responses')
        .insert({
          question_id: currentQuestion.id,
          user_id: session.user.id,
          response_text: userResponse
        });
      if (error) throw error;
      setResponseFeedback('Response submitted successfully!');
      setTimeout(() => {
        setIsQuestionCardOpen(false);
        setUserResponse('');
        setResponseFeedback('');
        fetchQuestion();
      }, 3000);
    } catch (err) {
      console.error('Submission failed:', err);
      const feedbackMessage = err.message === 'Please log in to submit a response.'
        ? 'Please log in to submit a response.'
        : 'Failed to save response. Please try again.';
      setResponseFeedback(feedbackMessage);
      setTimeout(() => setResponseFeedback(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const toggleCountryMenu = () => setToggleCountryMenu(!isCountryMenuOpen);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Profile', path: '/profile' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Saved Chats', path: '/saved-chats' },
    { name: 'Packages', path: '/packages' },
    { name: 'Settings', path: '/settings' },
    { name: 'Help', path: '/help' },
    {
      name: 'Logout',
      path: '/login',
      onClick: async (e) => {
        e.stopPropagation();
        await handleLogout();
        setIsNavOpen(false);
      }
    }
  ];

  useEffect(() => {
    const selectors = ['.chat-header', '.hamburger-button', '.barbados-flag', '.input-section'];
    const checkElements = () => {
      const missingSelectors = selectors.filter((selector) => !document.querySelector(selector));
      console.log('Tour element check:', {
        selectors: selectors.map((s) => ({
          selector: s,
          found: !!document.querySelector(s),
          element: document.querySelector(s),
        })),
        missing: missingSelectors,
        timestamp: new Date().toISOString(),
      });
      if (missingSelectors.length > 0) {
        console.warn('Missing tour selectors:', missingSelectors);
        return false;
      }
      return true;
    };

    const hasTakenTour = localStorage.getItem('hasTakenTour');
    const isFirstTime = localStorage.getItem('isFirstTime');

    console.log('Tour initialization check:', {
      isFirstTime,
      hasTakenTour,
      isOpen,
      tourStarted,
      totalSteps: steps.length,
      timestamp: new Date().toISOString(),
    });

    if (isFirstTime === 'true' && !hasTakenTour) {
      if (checkElements()) {
        console.log('Triggering tour for first-time user at', new Date().toISOString());
        setIsOpen(true);
        setTourStarted(true);
        localStorage.setItem('hasTakenTour', 'true');
        localStorage.removeItem('isFirstTime');
      } else {
        const retryTimer = setTimeout(() => {
          if (checkElements()) {
            console.log('Retry: Triggering tour after DOM ready at', new Date().toISOString());
            setIsOpen(true);
            setTourStarted(true);
            localStorage.setItem('hasTakenTour', 'true');
            localStorage.removeItem('isFirstTime');
          } else {
            console.error('Tour failed: Elements still missing', missingSelectors);
          }
        }, 1000);
        return () => clearTimeout(retryTimer);
      }
    } else {
      console.log('Tour not triggered: isFirstTime or hasTakenTour condition not met');
      const fallbackTimer = setTimeout(() => {
        if (checkElements()) {
          console.log('Attempting fallback tour trigger at', new Date().toISOString());
          setIsOpen(true);
          setTourStarted(true);
        } else {
          console.error('Fallback tour failed: Elements missing', missingSelectors);
        }
      }, 2000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [setIsOpen, steps.length]);

  useEffect(() => {
    if (tourStarted && isOpen && steps.length > 0) {
      console.log('Tour step details:', {
        currentStep: currentStep + 1,
        currentStepIndex: currentStep,
        totalSteps: steps.length,
        currentStepSelector: steps[currentStep]?.selector || 'N/A',
        stepDescriptions: steps.map((step, index) => ({
          index,
          selector: step.selector || 'N/A',
          content: step.content || 'No content'
        })),
        timestamp: new Date().toISOString(),
      });

      const handleTourNavigation = () => {
        console.log(`Navigating to /loadscreen from step ${currentStep + 1} (index ${currentStep}) at`, new Date().toISOString());
        setIsOpen(false);
        setTourStarted(false);
        navigate('/loadscreen', { replace: true });
      };

      const nextButton = document.querySelector('.reactour__popover button[data-touraction="next"]');
      const closeButton = document.querySelector('.reactour__close-button');

      const handleNextClick = () => {
        if (currentStep === 3) {
          console.log(`Next button clicked on step 4 (index ${currentStep}), navigating to /loadscreen at`, new Date().toISOString());
          handleTourNavigation();
        }
      };

      const handleCloseClick = () => {
        console.log(`Close button clicked on step ${currentStep + 1} (index ${currentStep}), navigating to /loadscreen at`, new Date().toISOString());
        handleTourNavigation();
      };

      if (nextButton) {
        nextButton.addEventListener('click', handleNextClick);
      } else {
        console.warn('Next button not found at', new Date().toISOString());
      }

      if (closeButton) {
        closeButton.addEventListener('click', handleCloseClick);
      } else {
        console.warn('Close button not found at', new Date().toISOString());
      }

      return () => {
        if (nextButton) {
          nextButton.removeEventListener('click', handleNextClick);
        }
        if (closeButton) {
          closeButton.removeEventListener('click', handleCloseClick);
        }
      };
    }
  }, [isOpen, currentStep, tourStarted, setIsOpen, navigate, steps]);

  useEffect(() => {
    if (tourStarted && !isOpen && currentStep >= 3) {
      console.log('Tour closed after reaching step 4 or beyond', {
        isOpen,
        tourStarted,
        currentPath: window.location.pathname,
        currentStep: currentStep + 1,
        currentStepIndex: currentStep,
        totalSteps: steps.length,
        timestamp: new Date().toISOString(),
      });
      if (window.location.pathname !== '/loadscreen') {
        console.log('Navigating to /loadscreen at', new Date().toISOString());
        navigate('/loadscreen', { replace: true });
      } else {
        console.log('Already on /loadscreen, no navigation needed');
      }
    }
  }, [isOpen, navigate, tourStarted, currentStep, steps.length]);

  useEffect(() => {
    const selectors = [
      { selector: '.chat-header', dataTour: 'chat-header', step: 0 },
      { selector: '.hamburger-button', dataTour: 'hamburger-button', step: 1 },
      { selector: '.barbados-flag', dataTour: 'barbados-flag', step: 2 },
      { selector: '.input-section', dataTour: 'input-section', step: 3 }
    ];

    selectors.forEach(({ selector }) => {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.remove('tour-glow');
      }
    });

    const currentSelector = selectors.find(({ step }) => step === currentStep);
    if (currentSelector) {
      const element = document.querySelector(currentSelector.selector);
      if (element) {
        element.classList.add('tour-glow');
        console.log(`Applied glow to ${currentSelector.selector} for step ${currentStep + 1} (index ${currentStep})`, {
          found: !!element,
          dataTour: element.getAttribute('data-tour'),
          timestamp: new Date().toISOString(),
        });
      } else {
        console.warn(`Element ${currentSelector.selector} not found for step ${currentStep + 1} (index ${currentStep})`);
      }
    }

    selectors.forEach(({ selector, dataTour, step }) => {
      const element = document.querySelector(selector);
      console.log(`Selector ${selector} for step ${step + 1} (index ${step}):`, {
        found: !!element,
        dataTour: element?.getAttribute('data-tour') || 'none',
        currentStep: currentStep + 1,
        currentStepIndex: currentStep,
        totalSteps: steps.length,
        timestamp: new Date().toISOString(),
      });
    });

    return () => {
      selectors.forEach(({ selector }) => {
        const element = document.querySelector(selector);
        if (element) {
          element.classList.remove('tour-glow');
        }
      });
    };
  }, [currentStep, steps.length]);

  useEffect(() => {
    const handleTourButtonClick = (e) => {
      if (e.target.closest('.reactour__popover button')) {
        const button = e.target;
        const action = button.getAttribute('data-touraction') || 'unknown';
        const labelMap = {
          prev: 'Previous',
          next: 'Next',
          close: currentStep === 3 ? 'Continue' : 'Skip'
        };
        console.log('Reactour button clicked:', {
          buttonLabel: labelMap[action] || button.textContent || 'Unknown',
          action: action,
          classList: button.className,
          currentStep: currentStep + 1,
          currentStepIndex: currentStep,
          totalSteps: steps.length,
          timestamp: new Date().toISOString(),
        });
      }
    };
    document.addEventListener('click', handleTourButtonClick);
    return () => document.removeEventListener('click', handleTourButtonClick);
  }, [currentStep, steps.length]);

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

    const factCleanup = initializeTimer('factTimerStart', FACT_INTERVAL, async () => {
      if (!isQuizCardOpen && !isQuestionCardOpen) {
        await fetchFact();
        setIsFactsCardOpen(true);
        setIsQuizCardOpen(false);
        setIsQuestionCardOpen(false);
      }
    });

    const questionCleanup = initializeTimer('questionTimerStart', QUESTION_INTERVAL, async () => {
      if (!isFactsCardOpen && !isQuizCardOpen) {
        await fetchQuestion();
        setIsQuestionCardOpen(true);
        setIsFactsCardOpen(false);
        setIsQuizCardOpen(false);
      }
    });

    return () => {
      factCleanup();
      questionCleanup();
    };
  }, [isFactsCardOpen, isQuizCardOpen, isQuestionCardOpen]);

  useEffect(() => {
    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: `Welcome to ${selectedCountry.nickname}! I'm your ${selectedCountry.name} helper! Ask me about beaches, food, history, festivals, or take a quiz!`,
        created_at: new Date().toISOString()
      }
    ]);
    fetchFact().then(() => setIsFactsCardOpen(true));
    fetchQuiz();
    fetchQuestion().then(() => setIsQuestionCardOpen(false));
  }, [selectedCountry]);

  useEffect(() => {
    const userMessagesCount = messages.filter((msg) => msg.role === 'user').length;
    if (userMessagesCount > userPromptCount && userMessagesCount % 5 === 0) {
      if (!isFactsCardOpen && !isQuestionCardOpen) {
        fetchQuiz().then(() => {
          setIsQuizCardOpen(true);
          setIsFactsCardOpen(false);
          setIsQuestionCardOpen(false);
        });
      }
    }
    setUserPromptCount(userMessagesCount);
  }, [messages, userPromptCount, isFactsCardOpen, isQuestionCardOpen]);

  useEffect(() => {
    if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
    return () => {
      if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
      if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
      if (factTimerRef.current) clearTimeout(factTimerRef.current);
    };
  }, [isQuizCardOpen]);

  useEffect(() => {
    async function checkSession() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      if (session?.user) {
        const avatarUrl = session.user.user_metadata?.avatarUrl || null;
        if (avatarUrl) {
          const urlParts = avatarUrl.split('/');
          const fileName = urlParts[urlParts.length - 1].split('?')[0];
          const signedUrl = await fetchSignedUrl(fileName, 'avatars');
          if (signedUrl) setAvatarImage(signedUrl);
        }
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    const testConnections = async () => {
      try {
        const { data, error, count } = await supabase
          .from('open_questions')
          .select('id, question_text', { count: 'exact' });
        console.log('Open Questions Test Query Result:', { data, error, count });

        const { data: responseData, error: responseError } = await supabase
          .from('open_responses')
          .select('question_id, user_id, response_text', { count: 'exact' });
        console.log('Open Responses Test Query Result:', { data: responseData, error: responseError });

        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .select('id, user_id, message, is_read', { count: 'exact' });
        console.log('Notifications Test Query Result:', { data: notificationData, error: notificationError });

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const testQuestionId = data?.[0]?.id || defaultQuestion.id;
          const testInsert = await supabase
            .from('open_responses')
            .insert({
              question_id: testQuestionId,
              user_id: session.user.id,
              response_text: 'Test response'
            })
            .select();
          console.log('Open Responses Test Insert Result:', { data: testInsert.data, error: testInsert.error });
        }
      } catch (err) {
        console.error('Table Test Query Error:', err.message);
      }
    };
    testConnections();
  }, []);

  const fallbackFacts = [
    { question: 'What is the capital of Barbados?', answer: 'Bridgetown' },
    { question: 'What sport is most popular in Barbados?', answer: 'Cricket' },
    { question: 'Who is a famous singer from Barbados?', answer: 'Rihanna' }
  ];

  const fallbackQuiz = {
    question: 'What is the national sport of Barbados?',
    options: ['Football', 'Cricket', 'Basketball', 'Tennis'],
    correct_answer: 'Cricket'
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isNavOpen && !e.target.closest('.nav-card') && !e.target.closest('.hamburger-button')) {
        setIsNavOpen(false);
      }
      if (!e.target.closest('.agent-menu') && !e.target.closest('.agent-menu-container')) {
        setIsAgentMenuOpen(false);
      }
      if (!e.target.closest('.submit-menu') && !e.target.closest('.submit-menu-container')) {
        setIsSubmitMenuOpen(false);
      }
      if (!e.target.closest('.country-menu') && !e.target.closest('.barbados-flag')) {
        setToggleCountryMenu(false);
      }
      if (isFactsCardOpen && !e.target.closest('.facts-card') && !e.target.closest('.facts-card-close')) {
        setIsFactsCardOpen(false);
      }
      if (
        isQuizCardOpen &&
        !e.target.closest('.quiz-card') &&
        !e.target.closest('.quiz-card-close') &&
        !e.target.closest('.nav-item') &&
        !selectedAnswer
      ) {
        setIsQuizCardOpen(false);
        setSelectedAnswer(null);
        setQuizFeedback('');
      }
      if (
        isQuestionCardOpen &&
        !e.target.closest('.question-card') &&
        !e.target.closest('.question-card-close') &&
        !e.target.closest('.nav-item')
      ) {
        setIsQuestionCardOpen(false);
        setUserResponse('');
        setResponseFeedback('');
        if (questionTimerRef.current) {
          clearTimeout(questionTimerRef.current);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isNavOpen, isAgentMenuOpen, isSubmitMenuOpen, isCountryMenuOpen, isFactsCardOpen, isQuizCardOpen, isQuestionCardOpen, selectedAnswer]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('sports_quizzes')
          .select('question, options, correct_answer')
          .limit(1);
        console.log('Quiz Test Query Result:', { data, error });
      } catch (err) {
        console.error('Quiz Test Query Error:', err);
      }
    };
    testConnection();
  }, []);

  return (
    <div className="baje-container" style={{ zIndex: 100 }}>
      <div className="chat-header" data-tour="chat-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className="ai-avatar"
            style={{
              ...(avatarImage && { backgroundImage: `url(${avatarImage})`, backgroundColor: 'transparent' })
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
                data-tour="barbados-flag"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: `url(${selectedCountry.flagUrl}) center/cover`,
                  marginLeft: '10px',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>
        </div>
        <div className="header-buttons">
          <div className="bell-container" style={{ display: 'flex', marginRight: '8px' }}>
            <button
              className="notification-button"
              onClick={() => {
                console.log('Hiding badge and navigating to notifications, saving count:', notificationCount);
                setNotificationCount(0);
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
                fontSize: '18px'
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
                backgroundColor: 'red',
                color: 'white',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '50%',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                visibility: notificationCount > 0 ? 'visible' : 'hidden',
                boxShadow: '0 0 0 2px white'
              }}
            >
              {notificationCount}
            </span>
          </div>
          <button className={`hamburger-button ${isNavOpen ? 'active' : ''}`} onClick={toggleNav} data-tour="hamburger-button">
            <span className="hamburger-button-span"></span>
            <span className="hamburger-button-span"></span>
            <span className="hamburger-button-span"></span>
          </button>
        </div>
      </div>

      <div className={`nav-overlay ${isNavOpen || isCountryMenuOpen || isQuizCardOpen || isQuestionCardOpen ? 'active' : ''}`}>
        <div className={`nav-card ${isNavOpen ? 'nav-card-open' : ''}`}>
          <button className="close-nav" onClick={toggleNav}>✕</button>
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

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message" style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.fileUrl ? (
              <>
                <div>{msg.content}</div>
                {msg.fileUrl.includes('.jpg') || msg.fileUrl.includes('.png') || msg.fileUrl.includes('.jpeg') ? (
                  <img src={msg.fileUrl} alt="Uploaded" style={{ maxWidth: '200px', marginTop: '10px' }} />
                ) : (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                    View File
                  </a>
                )}
              </>
            ) : (
              msg.content
            )}
          </div>
        ))}
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
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="facts-card"
        style={{
          position: 'absolute',
          bottom: '90px',
          right: '15px',
          width: '250px',
          background: '#F5F5F5',
          borderRadius: '10px',
          padding: '15px',
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
          display: isFactsCardOpen ? 'block' : 'none',
          zIndex: 1000
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
            color: 'black'
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            color: 'black',
            fontSize: '16px',
            marginBottom: '10px'
          }}
        >
          Did you know?
        </div>
        <div
          style={{
            color: 'black',
            fontSize: '14px',
            marginBottom: '8px'
          }}
        >
          {fact.question}
        </div>
        <div
          style={{
            color: '#008000',
            fontSize: '14px'
          }}
        >
          {fact.answer}
        </div>
      </div>

      <div
        className="quiz-card"
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
          display: isQuizCardOpen ? 'block' : 'none',
          zIndex: 1001,
          color: 'black',
          textAlign: 'center'
        }}
      >
        <button
          className="quiz-card-close"
          onClick={() => {
            setIsQuizCardOpen(false);
            setSelectedAnswer(null);
            setQuizFeedback('');
            if (quizTimerRef.current) {
              clearTimeout(quizTimerRef.current);
            }
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'black'
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '15px'
          }}
        >
          {selectedCountry.name} Quiz
        </div>
        <div
          style={{
            fontSize: '14px',
            marginBottom: '15px'
          }}
        >
          {quiz.question}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {quiz.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleQuizAnswer(option)}
              disabled={selectedAnswer !== null}
              style={{
                background: selectedAnswer === option ? (option === quiz.correct_answer ? '#008000' : '#FF0000') : '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                padding: '10px',
                cursor: selectedAnswer === null ? 'pointer' : 'default',
                opacity: selectedAnswer === null ? 1 : 0.7,
                transition: 'background 0.3s ease'
              }}
            >
              {option}
            </button>
          ))}
        </div>
        {quizFeedback && (
          <div
            style={{
              marginTop: '15px',
              fontSize: '14px',
              color: quizFeedback.includes('Correct') ? '#008000' : '#FF0000'
            }}
          >
            {quizFeedback}
          </div>
        )}
      </div>

      <div
        className="question-card"
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
          display: isQuestionCardOpen ? 'block' : 'none',
          zIndex: 1002,
          color: 'black',
          textAlign: 'center'
        }}
      >
        <button
          className="question-card-close"
          onClick={() => {
            setIsQuestionCardOpen(false);
            setUserResponse('');
            setResponseFeedback('');
            if (questionTimerRef.current) {
              clearTimeout(questionTimerRef.current);
            }
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'black'
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '15px'
          }}
        >
          {selectedCountry.name} Question
        </div>
        <div
          style={{
            fontSize: '14px',
            marginBottom: '15px'
          }}
        >
          {currentQuestion.question}
        </div>
        <textarea
          rows={4}
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          placeholder="Type your response here..."
          style={{
            width: '90%',
            margin: '0 auto',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            resize: 'none',
            fontSize: '14px',
            display: 'block'
          }}
          disabled={isLoading}
        />
        <button
          onClick={() => handleQuestionSubmit()}
          disabled={isLoading}
          style={{
            background: '#1E90FF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            padding: '10px',
            marginTop: '10px',
            cursor: isLoading ? 'default' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'background 0.3s ease'
          }}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
        {responseFeedback && (
          <div
            style={{
              marginTop: '15px',
              fontSize: '14px',
              color: responseFeedback.includes('submitted') ? '#008000' : '#FF0000'
            }}
          >
            {responseFeedback}
          </div>
        )}
      </div>

      <div className="input-section" style={{ display: 'flex', alignItems: 'center', padding: '15px', background: 'rgba(255, 255, 255, 0.1)', zIndex: 100 }} data-tour="input-section">
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
        <div
          className="submit-menu-container"
          style={{ position: 'relative' }}
          onMouseEnter={() => setIsSubmitMenuOpen(true)}
          onMouseLeave={() => setIsSubmitMenuOpen(false)}
        >
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
              transition: '0.3s ease'
            }}
          >
            {isLoading ? '...' : '➤'}
          </button>
          <div
            className="submit-menu"
            style={{
              position: 'absolute',
              bottom: '100%',
              right: '0',
              background: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '5px',
              padding: '5px',
              display: isSubmitMenuOpen ? 'block' : 'none',
              opacity: isSubmitMenuOpen ? 1 : 0,
              transition: 'opacity 0.2s',
              zIndex: 1003
            }}
          >
          </div>
        </div>
      </div>
    

    <style>{`
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
@keyframes glowPulse {
  0% { box-shadow: 0 0 5px rgba(30, 144, 255, 0.5), 0 0 10px rgba(30, 144, 255, 0.3); }
  50% { box-shadow: 0 0 10px rgba(30, 144, 255, 0.8), 0 0 20px rgba(30, 144, 255, 0.5); }
  100% { box-shadow: 0 0 5px rgba(30, 144, 255, 0.5), 0 0 10px rgba(30, 144, 255, 0.3); }
}
.baje-container {
  position: relative;
  z-index: 100;
}
.chat-header {
  position: sticky;
  top: 0;
  z-index: 101;
  padding: 10px;
}
.ai-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #1E90FF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  margin-right: 10px;
}
.ai-info {
  display: flex;
  flex-direction: column;
}
.ai-name {
  font-size: 18px;
  font-weight: bold;
  color: white;
}
.ai-status {
  font-size: 14px;
  color: #ccc;
}
.header-buttons {
  display: flex;
  align-items: center;
}
.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0);
  z-index: 99;
  transition: background 0.3s ease;
  visibility: hidden;
}
.nav-overlay.active {
  background: rgba(0, 0, 0, 0.5);
  visibility: visible;
}
.nav-card {
  position: fixed;
  top: 0;
  right: -300px;
  width: 250px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  padding: 20px;
  transition: right 0.3s ease;
  z-index: 1000;
  visibility: hidden;
  border-radius: 10px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.nav-card.nav-card-open {
  right: 0;
  visibility: visible;
}
.close-nav {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  position: absolute;
  top: 10px;
  right: 10px;
}
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  margin-top: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.nav-item {
  margin: 15px 0;
  width: 100%;
  text-align: center;
}
.nav-item-a {
  color: white;
  text-decoration: none;
  font-size: 18px;
  font-family: var(--default-font-family);
  transition: color 0.2s ease;
  display: block;
  padding: 10px 0;
  text-align: center;
}
.nav-item-a:hover {
  color: #1E90FF;
}
.hamburger-button {
  background: transparent;
  border: none;
  width: 30px;
  height: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
}
.hamburger-button-span {
  width: 100%;
  height: 3px;
  background: #ccc;
  transition: all 0.3s ease;
}
.hamburger-button.active .hamburger-button-span {
  background: white;
}
.hamburger-button.active .hamburger-button-span:nth-child(1) {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
}
.hamburger-button.active .hamburger-button-span:nth-child(2) {
  opacity: 0;
}
.hamburger-button.active .hamburger-button-span:nth-child(3) {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
}
.notification-button:hover {
  background: #1E90FF;
}
.plus-button:hover, .agent-button:hover, .submit-button:hover, .barbados-flag:hover {
  background: #1873CC;
}
.message {
  max-width: 70%;
  margin: 10px;
  border-radius: 5px;
  padding: 10px;
}
.message img {
  max-width: 200px;
  border-radius: 5px;
  margin: 10px;
}
.message a {
  color: #1E90FF;
  text-decoration: none;
}
.message a:hover {
  text-decoration: underline;
}
.bell-container {
  position: relative;
  width: 30px;
  height: 30px;
  cursor: pointer;
}
.notification-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 18px;
}
.badge {
  position: absolute;
  top: -8px;
  right: -12px;
  background-color: red;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 50%;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  visibility: hidden;
  box-shadow: 0 0 0 2px white;
}
.bell-container .badge {
  visibility: visible;
}
.facts-card {
  position: absolute;
  bottom: 90px;
  right: 15px;
  width: 250px;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}
.facts-card-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: black;
}
.quiz-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.5);
  z-index: 1001;
  color: black;
  text-align: center;
}
.quiz-card-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: black;
}
.question-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.5);
  z-index: 1002;
  color: black;
  text-align: center;
}
.question-card-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: black;
}
.input-section {
  display: flex;
  align-items: center;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  z-index: 100;
}
.input-field {
  flex-grow: 1;
  margin-right: 10px;
  padding: 10px;
  border-radius: 20px;
  border: 1px solid #ccc;
  resize: none;
  font-size: 14px;
}
.submit-menu-container {
  position: relative;
}
.submit-button {
  background: #1E90FF;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: 0.3s ease;
}
.submit-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 5px;
  padding: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1003;
}
.tour-glow {
  position: relative;
  z-index: 1001;
}
.tour-glow::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  animation: glowPulse 2s infinite ease-in-out;
  pointer-events: none;
  z-index: -1;
}
.hamburger-button.tour-glow::after,
.barbados-flag.tour-glow::after {
  width: 50px;
  height: 50px;
}
.reactour__popover {
  z-index: 10002 !important;
  background: rgba(255, 255, 255, 0.98) !important;
  color: #000 !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  padding: 50px 20px 60px 20px !important;
  margin-left: 30px !important;
  margin-top: 40px !important;
  border-radius: 10px !important;
  box-shadow: 0px 6px 18px rgba(0, 0, 0, 0.5) !important;
  max-width: 350px !important;
  border: 2px solid #1E90FF !important;
  position: absolute !important;
  display: flex !important;
  flex-direction: column !important;
}
.reactour__popover p {
  margin: 0 20px 20px 0 !important;
  line-height: 1.5 !important;
  font-size: 18px !important;
  flex: 1 1 auto !important;
  overflow-y: auto !important;
}
.reactour__popover div[class*='navigation'] {
  direction: ltr !important;
  display: flex !important;
  margin-top: 24px !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 10px !important;
  position: absolute !important;
  bottom: 20px !important;
  left: 0 !important;
  width: 100% !important;
  flex-wrap: wrap !important;
  gap: 10px !important;
}
.reactour__popover button {
  background: #1E90FF !important;
  color: white !important;
  border: none !important;
  padding: 10px 20px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 16px !important;
  transition: background 0.3s ease !important;
  z-index: 10003 !important;
  pointer-events: auto !important;
}
.reactour__popover button:hover {
  background: #1873CC !important;
}
.reactour__close-button {
  background: #1E90FF !important;
  color: white !important;
  border: none !important;
  padding: 10px 20px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 16px !important;
  transition: background 0.3s ease !important;
  z-index: 10003 !important;
  pointer-events: auto !important;
  order: 1 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}
.reactour__close-button:hover {
  background: #1873CC !important;
}
.reactour__close-button::before {
  content: 'Close' !important;
}
.reactour__popover[data-tour-step="3"] .reactour__close-button::before {
  content: 'Continue' !important;
}
.reactour__popover button[data-touraction="prev"] {
  order: 2 !important;
}
.reactour__popover button[data-touraction="next"] {
  order: 3 !important;
}
.reactour__popover button[data-touraction="close"] {
  order: 4 !important;
}
.reactour__mask {
  display: none !important;
}
@media only screen and (max-width: 479px) {
  .chat-header {
    padding: 8px;
  }
  .ai-avatar {
    width: 35px;
    height: 35px;
    font-size: 14px;
    margin-right: 8px;
  }
  .ai-name {
    font-size: 16px;
  }
  .ai-status {
    font-size: 12px;
  }
  .barbados-flag {
    width: 18px;
    height: 18px;
    margin-left: 8px;
  }
  .hamburger-button {
    width: 25px;
    height: 25px;
  }
  .hamburger-button-span {
    height: 2px;
  }
  .nav-card {
    width: 100%;
    max-width: 100%;
    right: -100%;
    border-radius: 0;
    padding: 15px;
  }
  .nav-card.nav-card-open {
    right: 0;
  }
  .close-nav {
    font-size: 20px;
    top: 8px;
    right: 8px;
  }
  .nav-list {
    margin-top: 40px;
  }
  .nav-item {
    margin: 10px 0;
  }
  .nav-item-a {
    font-size: 16px;
    padding: 8px 0;
  }
  .message {
    max-width: 85%;
    margin: 8px;
    padding: 8px;
    border-radius: 4px;
  }
  .message img {
    max-width: 150px;
    margin: 8px;
    border-radius: 4px;
  }
  .bell-container {
    width: 25px;
    height: 25px;
    margin-right: 6px;
  }
  .notification-button {
    width: 25px;
    height: 25px;
    font-size: 14px;
  }
  .badge {
    top: -6px;
    right: -10px;
    font-size: 10px;
    padding: 1px 5px;
  }
  .facts-card {
    width: 200px;
    bottom: 80px;
    right: 10px;
    padding: 10px;
    border-radius: 8px;
  }
  .facts-card-close {
    top: 8px;
    right: 8px;
    font-size: 14px;
  }
  .facts-card div {
    font-size: 12px !important;
  }
  .facts-card div:first-child {
    font-size: 14px !important;
    margin-bottom: 8px;
  }
  .quiz-card {
    width: 90%;
    max-width: 260px;
    padding: 15px;
    border-radius: 8px;
  }
  .quiz-card-close {
    top: 8px;
    right: 8px;
    font-size: 14px;
  }
  .quiz-card div {
    font-size: 12px !important;
    margin-bottom: 12px;
  }
  .quiz-card div:first-child {
    font-size: 14px !important;
  }
  .quiz-card button {
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  .quiz-card div:last-child {
    margin-top: 12px;
    font-size: 12px !important;
  }
  .question-card {
    width: 90%;
    max-width: 260px;
    padding: 15px;
    border-radius: 8px;
  }
  .question-card-close {
    top: 8px;
    right: 8px;
    font-size: 14px;
  }
  .question-card div {
    font-size: 12px !important;
    margin-bottom: 12px;
  }
  .question-card div:first-child {
    font-size: 14px !important;
  }
  .question-card textarea {
    font-size: 12px !important;
    padding: 8px;
    border-radius: 4px;
  }
  .question-card button {
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 8px;
  }
  .question-card div:last-child {
    margin-top: 12px;
    font-size: 12px !important;
  }
  .input-section {
    padding: 10px;
  }
  .input-field {
    padding: 8px;
    font-size: 12px;
    margin-right: 8px;
  }
  .submit-menu-container {
    margin-right: 8px;
  }
  .submit-button {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  .submit-menu {
    padding: 4px;
    border-radius: 4px;
  }
  .hamburger-button.tour-glow::after,
  .barbados-flag.tour-glow::after {
    width: 40px;
    height: 40px;
  }
  .reactour__popover {
    padding: 40px 15px 50px 15px !important;
    max-width: 300px !important;
    margin-left: 20px !important;
    margin-top: 30px !important;
    border-radius: 8px !important;
  }
  .reactour__popover p {
    font-size: 16px !important;
    margin: 0 15px 15px 0 !important;
  }
  .reactour__popover div[class*='navigation'] {
    margin-top: 20px !important;
    padding: 0 8px !important;
    bottom: 15px !important;
    gap: 8px !important;
  }
  .reactour__popover button {
    padding: 8px 16px !important;
    font-size: 14px !important;
  }
  .reactour__close-button {
    padding: 8px 16px !important;
    font-size: 14px !important;
  }
}
@media only screen and (min-width: 480px) and (max-width: 767px) {
  .chat-header {
    padding: 9px;
  }
  .ai-avatar {
    width: 38px;
    height: 38px;
    font-size: 15px;
    margin-right: 9px;
  }
  .ai-name {
    font-size: 17px;
  }
  .ai-status {
    font-size: 13px;
  }
  .barbados-flag {
    width: 19px;
    height: 19px;
    margin-left: 9px;
  }
  .hamburger-button {
    width: 28px;
    height: 28px;
  }
  .hamburger-button-span {
    height: 2.5px;
  }
  .nav-card {
    width: 280px;
    padding: 18px;
    border-radius: 9px;
  }
  .close-nav {
    font-size: 22px;
    top: 9px;
    right: 9px;
  }
  .nav-list {
    margin-top: 45px;
  }
  .nav-item {
    margin: 12px 0;
  }
  .nav-item-a {
    font-size: 17px;
    padding: 9px 0;
  }
  .message {
    max-width: 80%;
    margin: 9px;
    padding: 9px;
    border-radius: 4.5px;
  }
  .message img {
    max-width: 180px;
    margin: 9px;
    border-radius: 4.5px;
  }
  .bell-container {
    width: 28px;
    height: 28px;
    margin-right: 7px;
  }
  .notification-button {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }
  .badge {
    top: -7px;
    right: -11px;
    font-size: 11px;
    padding: 2px 5px;
  }
  .facts-card {
    width: 220px;
    bottom: 85px;
    right: 12px;
    padding: 12px;
    border-radius: 9px;
  }
  .facts-card-close {
    top: 9px;
    right: 9px;
    font-size: 15px;
  }
  .facts-card div {
    font-size: 13px !important;
  }
  .facts-card div:first-child {
    font-size: 15px !important;
    margin-bottom: 9px;
  }
  .quiz-card {
    width: 90%;
    max-width: 280px;
    padding: 18px;
    border-radius: 9px;
  }
  .quiz-card-close {
    top: 9px;
    right: 9px;
    font-size: 15px;
  }
  .quiz-card div {
    font-size: 13px !important;
    margin-bottom: 13px;
  }
  .quiz-card div:first-child {
    font-size: 15px !important;
  }
  .quiz-card button {
    padding: 9px;
    border-radius: 4.5px;
    font-size: 13px;
  }
  .quiz-card div:last-child {
    margin-top: 13px;
    font-size: 13px !important;
  }
  .question-card {
    width: 90%;
    max-width: 280px;
    padding: 18px;
    border-radius: 9px;
  }
  .question-card-close {
    top: 9px;
    right: 9px;
    font-size: 15px;
  }
  .question-card div {
    font-size: 13px !important;
    margin-bottom: 13px;
  }
  .question-card div:first-child {
    font-size: 15px !important;
  }
  .question-card textarea {
    font-size: 13px !important;
    padding: 9px;
    border-radius: 4.5px;
  }
  .question-card button {
    padding: 9px;
    border-radius: 4.5px;
    font-size: 13px;
    margin-top: 9px;
  }
  .question-card div:last-child {
    margin-top: 13px;
    font-size: 13px !important;
  }
  .input-section {
    padding: 12px;
  }
  .input-field {
    padding: 9px;
    font-size: 13px;
    margin-right: 9px;
  }
  .submit-menu-container {
    margin-right: 9px;
  }
  .submit-button {
    width: 38px;
    height: 38px;
    font-size: 15px;
  }
  .submit-menu {
    padding: 4.5px;
    border-radius: 4.5px;
  }
  .hamburger-button.tour-glow::after,
  .barbados-flag.tour-glow::after {
    width: 45px;
    height: 45px;
  }
  .reactour__popover {
    padding: 45px 18px 55px 18px !important;
    max-width: 320px !important;
    margin-left: 25px !important;
    margin-top: 35px !important;
    border-radius: 9px !important;
  }
  .reactour__popover p {
    font-size: 17px !important;
    margin: 0 18px 18px 0 !important;
  }
  .reactour__popover div[class*='navigation'] {
    margin-top: 22px !important;
    padding: 0 9px !important;
    bottom: 18px !important;
    gap: 9px !important;
  }
  .reactour__popover button {
    padding: 9px 18px !important;
    font-size: 15px !important;
  }
  .reactour__close-button {
    padding: 9px 18px !important;
    font-size: 15px !important;
  }
}
@media only screen and (min-width: 768px) and (max-width: 1024px) {
  .chat-header {
    padding: 10px;
  }
  .ai-avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
    margin-right: 10px;
  }
  .ai-name {
    font-size: 18px;
  }
  .ai-status {
    font-size: 14px;
  }
  .barbados-flag {
    width: 20px;
    height: 20px;
    margin-left: 10px;
  }
  .hamburger-button {
    width: 30px;
    height: 30px;
  }
  .hamburger-button-span {
    height: 3px;
  }
  .nav-card {
    width: 300px;
    padding: 20px;
    border-radius: 10px;
  }
  .close-nav {
    font-size: 24px;
    top: 10px;
    right: 10px;
  }
  .nav-list {
    margin-top: 50px;
  }
  .nav-item {
    margin: 15px 0;
  }
  .nav-item-a {
    font-size: 18px;
    padding: 10px 0;
  }
  .message {
    max-width: 75%;
    margin: 10px;
    padding: 10px;
    border-radius: 5px;
  }
  .message img {
    max-width: 200px;
    margin: 10px;
    border-radius: 5px;
  }
  .bell-container {
    width: 30px;
    height: 30px;
    margin-right: 8px;
  }
  .notification-button {
    width: 30px;
    height: 30px;
    font-size: 18px;
  }
  .badge {
    top: -8px;
    right: -12px;
    font-size: 12px;
    padding: 2px 6px;
  }
  .facts-card {
    width: 250px;
    bottom: 90px;
    right: 15px;
    padding: 15px;
    border-radius: 10px;
  }
  .facts-card-close {
    top: 10px;
    right: 10px;
    font-size: 16px;
  }
  .facts-card div {
    font-size: 14px !important;
  }
  .facts-card div:first-child {
    font-size: 16px !important;
    margin-bottom: 10px;
  }
  .quiz-card {
    width: 90%;
    max-width: 320px;
    padding: 20px;
    border-radius: 10px;
  }
  .quiz-card-close {
    top: 10px;
    right: 10px;
    font-size: 16px;
  }
  .quiz-card div {
    font-size: 14px !important;
    margin-bottom: 15px;
  }
  .quiz-card div:first-child {
    font-size: 16px !important;
  }
  .quiz-card button {
    padding: 10px;
    border-radius: 5px;
    font-size: 14px;
  }
  .quiz-card div:last-child {
    margin-top: 15px;
    font-size: 14px !important;
  }
  .question-card {
    width: 90%;
    max-width: 320px;
    padding: 20px;
    border-radius: 10px;
  }
  .question-card-close {
    top: 10px;
    right: 10px;
    font-size: 16px;
  }
  .question-card div {
    font-size: 14px !important;
    margin-bottom: 15px;
  }
  .question-card div:first-child {
    font-size: 16px !important;
  }
  .question-card textarea {
    font-size: 14px !important;
    padding: 10px;
    border-radius: 5px;
  }
  .question-card button {
    padding: 10px;
    border-radius: 5px;
    font-size: 14px;
    margin-top: 10px;
  }
  .question-card div:last-child {
    margin-top: 15px;
    font-size: 14px !important;
  }
  .input-section {
    padding: 15px;
  }
  .input-field {
    padding: 10px;
    font-size: 14px;
    margin-right: 10px;
  }
  .submit-menu-container {
    margin-right: 10px;
  }
  .submit-button {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  .submit-menu {
    padding: 5px;
    border-radius: 5px;
  }
  .hamburger-button.tour-glow::after,
  .barbados-flag.tour-glow::after {
    width: 50px;
    height: 50px;
  }
  .reactour__popover {
    padding: 50px 20px 60px 20px !important;
    max-width: 350px !important;
    margin-left: 30px !important;
    margin-top: 40px !important;
    border-radius: 10px !important;
  }
  .reactour__popover p {
    font-size: 18px !important;
    margin: 0 20px 20px 0 !important;
  }
  .reactour__popover div[class*='navigation'] {
    margin-top: 24px !important;
    padding: 0 10px !important;
    bottom: 20px !important;
    gap: 10px !important;
  }
  .reactour__popover button {
    padding: 10px 20px !important;
    font-size: 16px !important;
  }
  .reactour__close-button {
    padding: 10px 20px !important;
    font-size: 16px !important;
  }
}
`}</style>
    </div>
  );
}

export default BajeTour;
