import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "./lib/supabaseClient";

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    visibility: 'visible',
    transition: 'opacity 0.3s ease',
  },
  modalContent: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '15px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  modalHeader: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#000',
    background: 'linear-gradient(to right, #4ade80, #22d3ee)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  modalText: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '20px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
  },
  ctaButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    background: 'linear-gradient(to right, #4ade80, #22d3ee)',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    width: '100%',
    maxWidth: '300px',
  },
  rewardButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    background: 'linear-gradient(to right, #f59e0b, #f97316)',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    width: '100%',
    maxWidth: '300px',
  },
  paymentButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    width: '100%',
    maxWidth: '300px',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#333',
  },
  '@media (max-width: 768px)': {
    modalContent: {
      padding: '20px',
      maxWidth: '90%',
    },
    modalHeader: {
      fontSize: '20px',
    },
    modalText: {
      fontSize: '14px',
    },
    ctaButton: {
      padding: '10px 20px',
      fontSize: '14px',
    },
    rewardButton: {
      padding: '10px 20px',
      fontSize: '14px',
    },
    paymentButton: {
      padding: '10px 20px',
      fontSize: '14px',
    },
  },
};

function PaymentWall({ messages, isOpen, onClose }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userPackage, setUserPackage] = useState(null);
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [isLockoutActive, setIsLockoutActive] = useState(false);

  useEffect(() => {
    const checkSessionAndPackage = async () => {
      try {
        // Get user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          setUser(null);
          return;
        }
        setUser(session?.user || null);

        if (session?.user) {
          // Fetch user's active package from user_packages table
          const { data: packageData, error: packageError } = await supabase
            .from('user_packages')
            .select('package_id, start_date, end_date')
            .eq('user_id', session.user.id)
            .gte('end_date', new Date().toISOString())
            .lte('start_date', new Date().toISOString())
            .single();

          if (packageError && packageError.code !== 'PGRST116') {
            console.error('Error fetching user package:', packageError);
            return;
          }

          if (packageData) {
            // Fetch package details
            const { data: pkg, error: pkgError } = await supabase
              .from('packages')
              .select('daily_message_limit')
              .eq('id', packageData.package_id)
              .single();

            if (pkgError) {
              console.error('Error fetching package details:', pkgError);
              return;
            }

            setUserPackage(pkg);

            // Fetch daily message count
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const { count, error: countError } = await supabase
              .from('prompts_count')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', session.user.id)
              .gte('created_at', startOfDay.toISOString());

            if (countError) {
              console.error('Error fetching daily message count:', countError);
              return;
            }

            setDailyMessageCount(count || 0);

            // Check for lockout
            const { data: lockoutData, error: lockoutError } = await supabase
              .from('user_lockouts')
              .select('lockout_until')
              .eq('user_id', session.user.id)
              .single();

            if (lockoutError && lockoutError.code !== 'PGRST116') {
              console.error('Error fetching lockout data:', lockoutError);
              return;
            }

            if (lockoutData && lockoutData.lockout_until) {
              const lockoutTime = new Date(lockoutData.lockout_until);
              if (lockoutTime > new Date()) {
                setLockoutUntil(lockoutTime);
                setIsLockoutActive(true);
              } else {
                // Clear expired lockout
                await supabase
                  .from('user_lockouts')
                  .delete()
                  .eq('user_id', session.user.id);
                setIsLockoutActive(false);
              }
            }
          } else {
            // Default to free plan (5 messages/day)
            setUserPackage({ daily_message_limit: 5 });
            // Fetch daily message count for free plan
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const { count, error: countError } = await supabase
              .from('prompts_count')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', session.user.id)
              .gte('created_at', startOfDay.toISOString());

            if (countError) {
              console.error('Error fetching daily message count:', countError);
              return;
            }

            setDailyMessageCount(count || 0);
          }
        }
      } catch (err) {
        console.error('Error in checkSessionAndPackage:', err);
      }
    };
    checkSessionAndPackage();
  }, []);

  // Update daily message count when messages change
  useEffect(() => {
    const updateMessageCount = async () => {
      if (!user || !userPackage) return;

      const userMessagesCount = messages.filter((msg) => msg.role === 'user').length;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count, error: countError } = await supabase
        .from('prompts_count')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());

      if (countError) {
        console.error('Error fetching updated daily message count:', countError);
        return;
      }

      setDailyMessageCount(count || 0);

      // Check if user exceeds daily message limit
      if (count >= userPackage.daily_message_limit && !isLockoutActive) {
        // Set lockout for 24 hours from the last message
        const lastMessage = messages
          .filter((msg) => msg.role === 'user')
          .sort((a, b) => new Date(b.created_at || new Date()) - new Date(a.created_at || new Date()))[0];
        const lockoutTime = new Date(lastMessage?.created_at || new Date());
        lockoutTime.setHours(lockoutTime.getHours() + 24);

        try {
          await supabase
            .from('user_lockouts')
            .upsert({
              user_id: user.id,
              lockout_until: lockoutTime.toISOString(),
              updated_at: new Date().toISOString(),
            });
          setLockoutUntil(lockoutTime);
          setIsLockoutActive(true);
        } catch (err) {
          console.error('Error setting lockout:', err);
        }
      }
    };
    updateMessageCount();
  }, [messages, user, userPackage, isLockoutActive]);

  // Determine if the modal should be shown
  const showModal = isOpen || (user && isLockoutActive) || (user && userPackage && dailyMessageCount >= userPackage.daily_message_limit);

  if (!showModal) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <h2 style={styles.modalHeader}>Upgrade Your Plan</h2>
        <p style={styles.modalText}>
          {user
            ? isLockoutActive
              ? `You've reached your daily message limit of ${userPackage?.daily_message_limit || 5}. Please wait until ${lockoutUntil?.toLocaleString()} or upgrade your plan to continue chatting.`
              : `You've reached your daily message limit of ${userPackage?.daily_message_limit || 5}. Upgrade to a paid plan, make a payment, or use reward points to continue chatting and unlock more features!`
            : 'Please log in to continue chatting or upgrade to a paid plan for unlimited access.'}
        </p>
        <div style={styles.buttonContainer}>
          <button
            style={styles.ctaButton}
            onClick={() => navigate(user ? '/packages' : '/login')}
            onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            {user ? 'View Subscription Plans' : 'Log In to Continue'}
          </button>
          {user && (
            <>
              <button
                style={styles.paymentButton}
                onClick={() => navigate('/payment-card')}
                onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                Make a Payment
              </button>
              <button
                style={styles.rewardButton}
                onClick={() => navigate('/redeem-points')}
                onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                Use Reward Points
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentWall;
