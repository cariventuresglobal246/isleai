import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "./lib/supabaseClient";

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('billing');
  const [showReturnNote, setShowReturnNote] = useState(false);
  const [userPackagePrice, setUserPackagePrice] = useState(null);
  const [notificationsThisMonth, setNotificationsThisMonth] = useState(0);
  const [weeklyUsageSeconds, setWeeklyUsageSeconds] = useState(0);
  const [dailyPromptCount, setDailyPromptCount] = useState(0);
  const [currentDay, setCurrentDay] = useState(null);
  const navigate = useNavigate();

  // Function to get the start of the current day (midnight AST)
  const getDayStart = () => {
    const now = new Date();
    now.setHours(now.getHours() - 4); // Adjust to AST (UTC-4)
    now.setHours(0, 0, 0, 0);
    return now;
  };

  // Function to get the start of the current week (Sunday 00:00:00 AST)
  const getWeekStart = () => {
    const now = new Date();
    now.setHours(now.getHours() - 4); // Adjust to AST (UTC-4)
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 0 : dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  // Function to calculate weekly usage in seconds
  const calculateWeeklyUsage = async (userId) => {
    const weekStart = getWeekStart();
    const { data: weeklyData, error } = await supabase
      .from('chat_usage')
      .select('usage_time')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    if (error) {
      console.error('Error fetching weekly usage:', error);
      return 0;
    }

    return weeklyData.reduce((sum, record) => sum + record.usage_time, 0);
  };

  // Function to fetch daily prompt count
  const fetchDailyPromptCount = async (userId) => {
    const dayStart = getDayStart();
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const { data, error } = await supabase
        .from('prompts_count')
        .select('count, created_at')
        .eq('user_id', userId)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      if (error) {
        console.error('Error fetching daily prompt count:', error);
        return 0;
      }

      const totalCount = data.reduce((sum, record) => sum + record.count, 0);
      return totalCount;
    } catch (err) {
      console.error('Unexpected error fetching daily prompt count:', err);
      return 0;
    }
  };

  // Function to reset daily prompt count
  const resetDailyPromptCount = async (userId) => {
    try {
      const { error } = await supabase
        .from('prompts_count')
        .update({ count: 0 })
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting daily prompt count:', error);
      } else {
        console.log('Daily prompt count reset for user:', userId);
        setDailyPromptCount(0);
      }
    } catch (err) {
      console.error('Unexpected error resetting daily prompt count:', err);
    }
  };

  // Function to format usage time based on thresholds
  const formatUsageTime = (seconds) => {
    if (seconds < 60) {
      return { value: seconds, unit: 'seconds' };
    } else if (seconds < 3600) {
      return { value: (seconds / 60).toFixed(1), unit: 'minutes' };
    } else {
      return { value: (seconds / 3600).toFixed(1), unit: 'hours' };
    }
  };

  // Fetch user data and set up real-time subscriptions
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        navigate('/login');
        return;
      }

      const currentDate = new Date().toISOString();
      console.log('Authenticated user ID:', user.id);

      // Fetch package price
      let userPackagePrice = 49.99; // Default fallback
      try {
        const { data: userPackageData, error: packageError, status } = await supabase
          .from('user_packages')
          .select('package_id, end_date')
          .eq('user_id', user.id)
          .gte('end_date', currentDate)
          .limit(1);

        console.log('Query result:', { data: userPackageData, error: packageError, status });

        if (packageError || !userPackageData || userPackageData.length === 0) {
          console.warn('No active package found for user:', user.id, 'Data:', userPackageData, 'Status:', status);
        } else {
          const activePackageId = userPackageData[0].package_id;
          const { data: packageData, error: packageFetchError } = await supabase
            .from('packages')
            .select('price')
            .eq('id', activePackageId)
            .single();
          if (packageFetchError || !packageData) {
            console.error('Error fetching package price:', packageFetchError);
          } else {
            userPackagePrice = packageData.price;
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching package price:', error);
      }
      setUserPackagePrice(userPackagePrice);

      // Fetch notification count
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const { data: notifications, error: notificationError } = await supabase
        .from('notifications')
        .select('id, created_at')
        .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
        .lte('created_at', new Date(currentYear, currentMonth + 1, 0).toISOString());

      if (notificationError) {
        console.error('Error fetching notifications:', notificationError);
        setNotificationsThisMonth(0);
      } else {
        setNotificationsThisMonth(notifications?.length || 0);
      }

      // Fetch initial daily prompt count
      const initialPromptCount = await fetchDailyPromptCount(user.id);
      setDailyPromptCount(initialPromptCount);
      setCurrentDay(getDayStart().toDateString());

      // Set initial weekly usage in seconds
      const initialWeeklySeconds = await calculateWeeklyUsage(user.id);
      setWeeklyUsageSeconds(initialWeeklySeconds);

      // Set up real-time subscription for chat_usage
      const chatSubscription = supabase
        .channel('chat_usage_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_usage',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Chat usage change:', payload);
            const { eventType, new: newRecord } = payload;
            const recordDate = new Date(newRecord.created_at);
            recordDate.setHours(recordDate.getHours() - 4); // Adjust to AST
            const weekStart = getWeekStart();

            // Update weekly usage if the record is from the current week
            if (recordDate >= weekStart && (eventType === 'INSERT' || eventType === 'UPDATE')) {
              const newWeeklySeconds = await calculateWeeklyUsage(user.id);
              setWeeklyUsageSeconds(newWeeklySeconds);
            }
          }
        )
        .subscribe();

      // Set up real-time subscription for prompts_count
      const promptSubscription = supabase
        .channel('prompts_count_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prompts_count',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Prompts count change:', payload);
            const { eventType, new: newRecord } = payload;
            const recordDate = new Date(newRecord.created_at);
            recordDate.setHours(recordDate.getHours() - 4); // Adjust to AST
            const dayStart = getDayStart();

            if (recordDate >= dayStart && (eventType === 'INSERT' || eventType === 'UPDATE')) {
              const newPromptCount = await fetchDailyPromptCount(user.id);
              setDailyPromptCount(newPromptCount);
            }
          }
        )
        .subscribe();

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(chatSubscription);
        supabase.removeChannel(promptSubscription);
      };
    };

    fetchUserData();

    // Check for daily reset every minute
    const checkDayReset = setInterval(async () => {
      const now = new Date();
      now.setHours(now.getHours() - 4); // Adjust to AST
      const today = getDayStart().toDateString();
      if (currentDay !== today) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await resetDailyPromptCount(user.id);
          setCurrentDay(today);
        }
      }
    }, 60000);

    // Reset notifications and usage on schedule
    const checkMonthReset = setInterval(async () => {
      const now = new Date();
      now.setHours(now.getHours() - 4); // Adjust to AST
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        setNotificationsThisMonth(0);
      }
    }, 60000);

    const checkWeekReset = setInterval(async () => {
      const now = new Date();
      now.setHours(now.getHours() - 4); // Adjust to AST
      if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        setWeeklyUsageSeconds(0);
      }
    }, 60000);

    return () => {
      clearInterval(checkDayReset);
      clearInterval(checkMonthReset);
      clearInterval(checkWeekReset);
    };
  }, [navigate, currentDay]);

  // Handle sidebar link clicks
  const handleNavClick = (section) => {
    setActiveSection(section);
  };

  // Handle logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    navigate('/login');
  };

  // Handle settings navigation
  const handleSettings = () => {
    navigate('/settings');
  };

  // Handle return to chat navigation
  const handleReturnToChat = () => {
    navigate('/baje');
  };

  // Handle logo click navigation
  const handleLogoClick = () => {
    navigate('/baje');
  };

  // Show "Return To Chat" note after 10 seconds, hide after 2 seconds
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowReturnNote(true);
      const hideTimer = setTimeout(() => {
        setShowReturnNote(false);
      }, 2000);
      return () => clearTimeout(hideTimer);
    }, 10000);

    return () => clearTimeout(showTimer);
  }, []);

  // Currency formatter for BBD
  const currencyFormatter = new Intl.NumberFormat('en-BB', {
    style: 'currency',
    currency: 'BBD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Render content based on active section
  const renderContent = () => {
    const { value, unit } = formatUsageTime(weeklyUsageSeconds);
    switch (activeSection) {
      case 'my-day':
        return (
          <div className="billing-section">
            <h2 className="billing-section-title">My Day</h2>
            <div className="billing-grid">
              <div className="billing-card">
                <div className="billing-value">{dailyPromptCount}</div>
                <div className="billing-label">Questions Asked Today</div>
                <div className="billing-change">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="billing-change-icon"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  No change
                </div>
              </div>
            </div>
          </div>
        );
      case 'billing':
      default:
        return (
          <div className="billing-section">
            <h2 className="billing-section-title">Billing and Usage Statistics</h2>
            <div className="billing-grid">
              <div className="billing-card">
                <div className="billing-value">{currencyFormatter.format(userPackagePrice || 49.99)}</div>
                <div className="billing-label">Current Plan Cost</div>
                <div className="billing-change positive">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="billing-change-icon"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  {userPackagePrice ? 'Active Subscription' : 'No Active Subscription'}
                </div>
              </div>
              <div className="billing-card">
                <div className="billing-value">{notificationsThisMonth}</div>
                <div className="billing-label">Notifications This Month</div>
                <div className="billing-change warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="billing-change-icon"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  {notificationsThisMonth > 128 ? `${Math.round((notificationsThisMonth - 128) / 128 * 100)}% increase from last month` : 'No change'}
                </div>
              </div>
              <div className="billing-card usage-hours">
                <div className="billing-value">{value} {unit}</div>
                <div className="billing-label">Usage This Week</div>
                <div className="billing-change positive">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="billing-change-icon"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  {weeklyUsageSeconds > 15.6 * 3600 ? `${Math.round((weeklyUsageSeconds - 15.6 * 3600) / (15.6 * 3600) * 100)}% more than last week` : 'No change'}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <style>
        {`
          :root {
            --default-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Helvetica, Arial, sans-serif;
            --surface: #1e293b;
            --surface-hover: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --primary-color: #6366f1;
            --border: #334155;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            --radius: 12px;
            --success-color: #10b981;
            --warning-color: #f59e0b;
          }

          .dashboard-container {
            display: flex;
            min-height: 100vh;
            background: #121212;
            font-family: var(--default-font-family);
            color: var(--text-primary);
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .dashboard-container {
              flex-direction: column;
              width: 100vw;
              min-height: 100vh;
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .dashboard-container {
              flex-direction: column;
              width: 100vw;
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .dashboard-container {
              flex-direction: column;
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .dashboard-container {
              flex-direction: row;
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .dashboard-container {
              flex-direction: row;
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .dashboard-container {
              flex-direction: row;
            }
          }

          .sidebar {
            background: var(--surface);
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            border-right: 1px solid var(--border);
            position: relative;
            align-items: center;
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .sidebar {
              width: 100%;
              padding: 12px;
              border-right: none;
              border-bottom: 1px solid var(--border);
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .sidebar {
              width: 100%;
              padding: 12px;
              border-right: none;
              border-bottom: 1px solid var(--border);
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .sidebar {
              width: 100%;
              padding: 14px;
              border-right: none;
              border-bottom: 1px solid var(--border);
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .sidebar {
              width: 220px;
              padding: 16px;
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .sidebar {
              width: 260px;
              padding: 20px;
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .sidebar {
              width: 280px;
              padding: 24px;
            }
          }

          .sidebar-logo {
            height: 100px;
            margin-bottom: 32px;
            object-fit: contain;
            cursor: pointer;
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .sidebar-logo {
              height: 60px;
              margin-bottom: 16px;
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .sidebar-logo {
              height: 60px;
              margin-bottom: 16px;
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .sidebar-logo {
              height: 70px;
              margin-bottom: 20px;
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .sidebar-logo {
              height: 80px;
              margin-bottom: 24px;
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .sidebar-logo {
              height: 90px;
              margin-bottom: 28px;
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .sidebar-logo {
              height: 100px;
              margin-bottom: 32px;
            }
          }

          .return-note {
            position: absolute;
            top: 24px;
            left: auto;
            right: 24px;
            background: #ffffff;
            color: var(--primary-color);
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: transform 0.3s ease, color 0.2s;
            animation: fadeIn 0.5s ease-in;
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .return-note {
              top: 80px;
              left: 12px;
              right: auto;
              padding: 6px 8px;
              font-size: 12px;
              border-radius: 6px;
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .return-note {
              top: 80px;
              left: 12px;
              right: auto;
              padding: 6px 8px;
              font-size: 12px;
              border-radius: 6px;
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .return-note {
              top: 90px;
              left: 14px;
              right: auto;
              padding: 6px 10px;
              font-size: 13px;
              border-radius: 6px;
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .return-note {
              top: 16px;
              left: auto;
              right: 16px;
              padding: 7px 11px;
              font-size: 13px;
              border-radius: 7px;
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .return-note {
              top: 20px;
              left: auto;
              right: 20px;
              padding: 8px 12px;
              font-size: 14px;
              border-radius: 8px;
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .return-note {
              top: 24px;
              left: auto;
              right: 24px;
              padding: 8px 12px;
              font-size: 14px;
              border-radius: 8px;
            }
          }

          .return-note:hover {
            color: #818cf8;
            transform: scale(1.05);
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .return-note:hover {
              transform: scale(1.03);
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .return-note:hover {
              transform: scale(1.03);
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .return-note:hover {
              transform: scale(1.03);
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .return-note:hover {
              transform: scale(1.03);
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .return-note:hover {
              transform: scale(1.03);
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .return-note:hover {
              transform: scale(1.05);
            }
          }

          .header {
            padding-bottom: 16px;
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .header {
              padding-bottom: 12px;
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .header {
              padding-bottom: 12px;
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .header {
              padding-bottom: 12px;
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .header {
              padding-bottom: 14px;
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .header {
              padding-bottom: 15px;
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .header {
              padding-bottom: 16px;
            }
          }

          .header-title {
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
        `}
      </style>

      {/* Start of New JSX and CSS to Complete the Component */}
      <div className="sidebar">
        <img
          src="/logo.png" // Placeholder logo path; replace with actual path
          alt="Logo"
          className="sidebar-logo"
          onClick={handleLogoClick}
        />
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activeSection === 'billing' ? 'active' : ''}`}
            onClick={() => handleNavClick('billing')}
          >
            Billing & Usage
          </button>
          <button
            className={`sidebar-link ${activeSection === 'my-day' ? 'active' : ''}`}
            onClick={() => handleNavClick('my-day')}
          >
            My Day
          </button>
          <button className="sidebar-link" onClick={handleSettings}>
            Settings
          </button>
          <button className="sidebar-link" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </div>
      <div className="main-content">
        {showReturnNote && (
          <div className="return-note" onClick={handleReturnToChat}>
            Return To Chat
          </div>
        )}
        {renderContent()}
      </div>
      <style>
        {`
          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .sidebar-link {
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 16px;
            font-weight: 500;
            padding: 12px 16px;
            text-align: left;
            cursor: pointer;
            border-radius: var(--radius);
            transition: background 0.2s ease, color 0.2s ease;
          }

          .sidebar-link:hover {
            background: var(--surface-hover);
          }

          .sidebar-link.active {
            background: var(--primary-color);
            color: var(--text-primary);
          }

          .main-content {
            flex: 1;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          /* Mobile (425px and below) */
          @media (max-width: 425px) {
            .main-content {
              padding: 12px;
            }
          }

          /* Mobile Portrait (320px to 479px) */
          @media (min-width: 320px) and (max-width: 479px) {
            .main-content {
              padding: 12px;
            }
          }

          /* Mobile Landscape (481px to 767px) */
          @media (min-width: 481px) and (max-width: 767px) {
            .main-content {
              padding: 14px;
            }
          }

          /* Tablet Portrait and Landscape (768px to 1024px) */
          @media (min-width: 768px) and (max-width: 1024px) {
            .main-content {
              padding: 16px;
            }
          }

          /* Laptop/Desktop (1025px to 1280px) */
          @media (min-width: 1025px) and (max-width: 1280px) {
            .main-content {
              padding: 20px;
            }
          }

          /* Desktop (1281px and up) */
          @media (min-width: 1281px) {
            .main-content {
              padding: 24px;
            }
          }

          .billing-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .billing-section-title {
            font-size: 24px;
            font-weight: 600;
          }

          .billing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .billing-card {
            background: var(--surface);
            padding: 16px;
            border-radius: var(--radius);
            box-shadow: var(--shadow-md);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .billing-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--primary-color);
          }

          .billing-label {
            font-size: 16px;
            color: var(--text-secondary);
            margin: 8px 0;
          }

          .billing-change {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--text-secondary);
          }

          .billing-change.positive {
            color: var(--success-color);
          }

          .billing-change.warning {
            color: var(--warning-color);
          }

          .billing-change-icon {
            width: 16px;
            height: 16px;
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;
