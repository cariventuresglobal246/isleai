import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// CHANGED: Import the shared instance instead of creating a new one
import { supabase } from './supabaseClient'; 
import isleImage from '../isle4.png';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the session was successfully established by the link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setMessage('Session verified. Please enter your new password.');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage('Please enter your new password.');
      }
      // If the link logged them in, clear errors
      if (event === 'SIGNED_IN') {
        setError(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Because we use the shared 'supabase' client, it has the session from the URL
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setMessage('Password updated successfully! Redirecting to login...');
      
      // Optional: Sign out to ensure they log in cleanly with the new password
      await supabase.auth.signOut();

      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setError(error.message || 'Failed to update password');
      console.error('Password update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        /* ... KEEP YOUR EXISTING CSS UNCHANGED ... */
        body {
            background: var(--bg-gradient);
         --bg-gradient: linear-gradient(135deg, #000000, #1E90FF);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .mainContainer {
          position: relative;
          width: 700px;
          height: 840px;
          margin: 0 auto;
          background: #121212;
          overflow: hidden;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: white;
          font-family: Jost, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft Yahei UI', 'Microsoft Yahei', 'Source Han Sans CN', sans-serif;
        }
        .resetHeader {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 20px 30px;
          margin-bottom: 5px;
        }
        .logo {
          font-size: 30px;
          font-weight: 700;
          color: white;
        }
        .logoContainer {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 20vh;
          margin-bottom: -30px;
        }
        .logoImage {
          max-width: 100%;
          height: 70%;
        }
        .resetForm {
          width: 80%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 5px;
        }
        .inputGroup {
          width: 100%;
          margin-bottom: 20px;
        }
        .inputGroupLabel {
          display: block;
          margin-bottom: 10px;
          color: #a0a0a0;
        }
        .inputGroupInput {
          width: 100%;
          height: 50px;
          background: #1e1e1e;
          border: 1px solid #303139;
          border-radius: 10px;
          color: white;
          padding: 0 15px;
          font-size: 16px;
        }
        .resetButton {
          width: 100%;
          height: 50px;
          background: #5db075;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.3s ease;
          margin-bottom: 10px;
          margin-left: 20px;
        }
        .resetButtonDisabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .loginLink {
          margin-top: 20px;
          color: #a0a0a0;
        }
        .loginLinkA {
          color: #5db075;
          text-decoration: none;
          margin-left: 5px;
        }
        .errorMessage {
          color: #ff4d4d;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .successMessage {
          color: #5db075;
          margin-bottom: 20px;
          font-size: 14px;
        }
        /* ... REST OF YOUR CSS ... */
      `}</style>
      <div className="mainContainer">
        <div className="resetHeader">
          <div className="logo">
            <div className="logoContainer">
              <img src={isleImage} alt="Isle" className="logoImage" />
            </div>
          </div>
        </div>
        <form className="resetForm" onSubmit={handlePasswordUpdate}>
          <div className="inputGroup">
            <label className="inputGroupLabel" htmlFor="newPassword">New Password</label>
            <input
              className="inputGroupInput"
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Min 8 chars"
            />
          </div>
          {error && <div className="errorMessage">{error}</div>}
          {message && <div className="successMessage">{message}</div>}
          <button
            type="submit"
            className={isLoading ? "resetButton resetButtonDisabled" : "resetButton"}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
          <div className="loginLink">
            Back to <Link to="/login" className="loginLinkA">Login</Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default ResetPassword;
