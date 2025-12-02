import React, { useState, useEffect } from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons';

const apiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

// ——— YOUR EXACT STYLES (UNCHANGED) ———
const styles = {
  pageWrapper: {
    margin: 0,
    padding: 0,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    backgroundColor: "#000",
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  container: {
    width: "100%",
    maxWidth: "100%",
    height: "100%",
    backgroundColor: "#121212",
    borderRadius: "8px",
    color: "white",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
    "@media (min-width: 320px) and (max-width: 479px)": {
      maxWidth: "100%",
      height: "100%",
      borderRadius: "0",
    },
    "@media (min-width: 480px) and (max-width: 767px)": {
      maxWidth: "90%",
      height: "90%",
      borderRadius: "8px",
    },
    "@media (min-width: 768px) and (max-width: 1024px)": {
      maxWidth: "80%",
      height: "85%",
      borderRadius: "10px",
    },
    "@media (min-width: 1025px) and (max-width: 1280px)": {
      maxWidth: "700px",
      height: "840px",
      borderRadius: "12px",
    },
    "@media (min-width: 1281px)": {
      maxWidth: "800px",
      height: "900px",
      borderRadius: "12px",
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    backgroundColor: "#1E1E1E",
    position: "relative",
    "@media (min-width: 320px) and (max-width: 479px)": {
      padding: "8px",
    },
    "@media (min-width: 480px) and (max-width: 767px)": {
      padding: "12px",
    },
    "@media (min-width: 768px) and (max-width: 1024px)": {
      padding: "15px",
    },
    "@media (min-width: 1025px)": {
      padding: "20px",
    },
  },
  returnButton: {
    position: "absolute",
    right: "10px",
    top: "10px",
    fontSize: "16px",
    color: "white",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    "@media (min-width: 480px) and (max-width: 767px)": {
      fontSize: "18px",
      right: "12px",
      top: "12px",
    },
    "@media (min-width: 768px) and (max-width: 1024px)": {
      fontSize: "20px",
      right: "15px",
      top: "15px",
    },
    "@media (min-width: 1025px)": {
      fontSize: "24px",
      right: "20px",
      top: "20px",
    },
  },
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#005A9C",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    marginRight: "10px",
    fontWeight: "bold",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    "@media (min-width: 480px) and (max-width: 767px)": {
      width: "70px",
      height: "70px",
      fontSize: "28px",
      marginRight: "12px",
    },
    "@media (min-width: 768px) and (max-width: 1024px)": {
      width: "80px",
      height: "80px",
      fontSize: "32px",
      marginRight: "15px",
    },
    "@media (min-width: 1025px)": {
      width: "100px",
      height: "100px",
      fontSize: "40px",
      marginRight: "20px",
    },
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "4px",
    "@media (min-width: 480px) and (max-width: 767px)": {
      fontSize: "18px",
      marginBottom: "5px",
    },
    "@media (min-width: 768px) and (max-width: 1024px)": {
      fontSize: "20px",
      marginBottom: "5px",
    },
    "@media (min-width: 1025px)": {
      fontSize: "24px",
      marginBottom: "5px",
    },
  },
  email: {
    fontSize: "12px",
    color: "#888",
    "@media (min-width: 480px) and (max-width: 767px)": {
      fontSize: "14px",
    },
    "@media (min-width: 768px) and (max-width: 1024px)": {
      fontSize: "15px",
    },
    "@media (min-width: 1025px)": {
      fontSize: "16px",
    },
  },
  uploadButton: {
    marginTop: "8px",
    padding: "6px 12px",
    backgroundColor: "#005A9C",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "8px",
  },
  retryButton: {
    marginTop: "8px",
    padding: "6px 12px",
    backgroundColor: "#5DB075",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  errorMessage: {
    color: "red",
    fontSize: "12px",
    marginTop: "4px",
  },
  successMessage: {
    color: "#5DB075",
    fontSize: "12px",
    marginTop: "4px",
  },
  sections: {
    flex: 1,
    padding: "10px",
    overflowY: "auto",
  },
  section: {
    backgroundColor: "#1E1E1E",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "10px",
    color: "#5DB075",
  },
  option: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #303139",
  },
  lastOption: {
    borderBottom: "none",
  },
  logoutBtn: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#005A9C",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "8px",
  },
};

function Profile() {
  const [userData, setUserData] = useState({ initials: "JD", name: "Loading...", email: "" });
  const [avatarImage, setAvatarImage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const navigate = useNavigate();

  // ——— ONE-TIME: CSRF → PROFILE (CACHE BUSTER + DEBUG) ———
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        // 1. CSRF
        const csrfRes = await api.get('/api/csrf-token');
        if (!isMounted) return;
        const token = csrfRes.data.csrfToken;
        setCsrfToken(token);

        // 2. PROFILE – FORCE FRESH DATA
        const profileRes = await api.get('/api/profile', {
          headers: { 'X-CSRF-Token': token },
          params: { _t: Date.now() }, // ← bypass 304 with old data
        });
        if (!isMounted) return;

        const d = profileRes.data;
        console.log('AVATAR URL FROM API:', d.avatarUrl); // ← DEBUG

        setUserData({
          initials: d.initials,
          name: d.name || "User",
          email: d.email || "",
        });
        setAvatarImage(d.avatarUrl || null);
        setIsAuthenticated(true);
        setErrorMessage(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Profile load failed:', err);
        setIsAuthenticated(false);
        setErrorMessage(
          err.response?.status === 401
            ? 'Session expired. Please log in.'
            : 'Failed to load profile.'
        );
        if (err.response?.status === 401) {
          navigate('/login', { replace: true });
        }
      }
    };

    loadProfile();

    return () => { isMounted = false; };
  }, [navigate]);

  // ——— DEBUG: Log when avatarImage changes ———
  useEffect(() => {
    console.log('AVATAR URL RENDERED:', avatarImage);
  }, [avatarImage]);

  // ——— UPLOAD AVATAR ———
  const handleImageUpload = async (e) => {
    if (!isAuthenticated) {
      setErrorMessage('You must be logged in.');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File too large (max 5MB).');
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setErrorMessage('Only PNG/JPEG allowed.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/api/profile/avatar', formData, {
        headers: { 'X-CSRF-Token': csrfToken },
      });

      const newUrl = res.data.avatarUrl;
      console.log('NEW AVATAR URL:', newUrl);
      setAvatarImage(newUrl);
      setUserData(prev => ({ ...prev, initials: '' }));
      setSuccessMessage('Avatar updated!');
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // ——— LOGOUT ———
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { 'X-CSRF-Token': csrfToken } });
      navigate('/login');
    } catch {
      setErrorMessage('Logout failed.');
    }
  };

  // ——— RETRY ———
  const handleRetry = () => {
    setErrorMessage(null);
    setUserData({ initials: "JD", name: "Loading...", email: "" });
    window.location.reload();
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          <button style={styles.returnButton} onClick={() => navigate('/baje')}>
            <FontAwesomeIcon icon={faArrowRightFromBracket} />
          </button>

          {/* AVATAR – FIXED: url("...") */}
          <div
            style={{
              ...styles.avatar,
              backgroundImage: avatarImage ? `url("${avatarImage}")` : 'none',
              backgroundColor: avatarImage ? 'transparent' : '#005A9C',
            }}
          >
            {!avatarImage && userData.initials}
          </div>

          {/* INFO */}
          <div style={styles.info}>
            <div style={styles.name}>{userData.name}</div>
            <div style={styles.email}>{userData.email}</div>

            {errorMessage && (
              <div style={styles.errorMessage}>
                {errorMessage}
                {errorMessage.includes('load') && (
                  <button style={styles.retryButton} onClick={handleRetry}>
                    Retry
                  </button>
                )}
              </div>
            )}
            {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

            <input
              type="file"
              accept="image/png, image/jpeg"
              style={{ display: "none" }}
              id="avatar-upload"
              onChange={handleImageUpload}
              disabled={isUploading || !isAuthenticated}
            />
            <button
              style={{
                ...styles.uploadButton,
                opacity: (isUploading || !isAuthenticated) ? 0.6 : 1,
                cursor: (isUploading || !isAuthenticated) ? 'not-allowed' : 'pointer',
              }}
              onClick={() => document.getElementById("avatar-upload").click()}
              disabled={isUploading || !isAuthenticated}
            >
              {isUploading ? 'Uploading...' : isAuthenticated ? 'Upload Avatar' : 'Login to Upload'}
            </button>
          </div>
        </div>

        {/* SECTIONS */}
        <div style={styles.sections}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Account Settings</div>
            <div style={styles.option}>
              <span>Edit Profile</span>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate('/settings?scrollTo=profile')}>›</span>
            </div>
            <div style={{ ...styles.option, ...styles.lastOption }}>
              <span>Change Password</span>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate('/settings?scrollTo=password')}>›</span>
            </div>
          </div>

          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;