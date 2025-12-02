// SavedChat.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons';

function SavedChat() {
  const [savedChats, setSavedChats] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ——— AUTH ———
  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      const data = await res.json();
      if (!data.user) {
        navigate('/login');
        return;
      }
      setUser(data.user);
    } catch (err) {
      console.error('Session check failed:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // ——— FETCH CHATS ———
  const fetchSavedChats = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/chat/saved`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSavedChats(data);
    } catch (err) {
      console.error('Failed to load saved chats:', err);
    }
  };

  // ——— DELETE ———
  const handleDeleteChat = async (chatId) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setSavedChats(prev => prev.filter(c => c.id !== chatId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ——— RESTORE ———
  const handleRestoreChat = (chat) => {
    navigate('/baje', {
      state: {
        restoredChat: {
          id: chat.id,
          messages: chat.messages,
          title: chat.title,
        },
      },
    });
  };

  // ——— MODAL ———
  const handleViewChat = (chat) => {
    setSelectedChat(chat);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChat(null);
  };

  // ——— EFFECTS ———
  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.id) fetchSavedChats();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isModalOpen && !e.target.closest('.modal-content')) {
        handleCloseModal();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isModalOpen]);

  // ——— LOADING ———
  if (loading) {
    return (
      <div style={{
        background: '#121212',
        color: 'white',
        textAlign: 'center',
        padding: '100px',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        Loading chats...
      </div>
    );
  }

  return (
    <div className="root">
      <div className="main-container">
        {/* HEADER */}
        <div className="saved-chats-header">
          <h1 className="saved-chats-title">Saved Chats</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span
              className="edit-mode-toggle"
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ cursor: 'pointer' }}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </span>
            <button
              style={{
                fontSize: '24px',
                color: 'white',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
              }}
              onClick={() => navigate('/baje')}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} />
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="saved-chats-list">
          {savedChats.length === 0 ? (
            <div className="no-saved-chats">
              No saved chats yet. Start a conversation in the chat section!
            </div>
          ) : (
            savedChats.map((chat) => (
              <div
                key={chat.id}
                className="saved-chat-item"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2A2A2A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1E1E1E'}
                onClick={() => handleViewChat(chat)}
              >
                {/* Fixed: Smaller font for "Chat" */}
                <div className="chat-icon" style={{ fontSize: '18px' }}>
                  Chat
                </div>

                <div className="saved-chat-content">
                  <div className="saved-chat-title">{chat.title}</div>
                  <div className="saved-chat-snippet">{chat.snippet}</div>
                  <div className="saved-chat-time">
                    {new Date(chat.updated_at).toLocaleString()}
                  </div>
                </div>

                {/* EDIT MODE: Restore + Delete Buttons */}
                {isEditMode && (
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreChat(chat);
                      }}
                      style={{
                        backgroundColor: '#1E90FF', // DodgerBlue
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1C86EE'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#1E90FF'}
                    >
                      Restore
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      style={{
                        backgroundColor: '#DC143C', // Crimson Red
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#C41235'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#DC143C'}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && selectedChat && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={handleCloseModal}>
              X
            </button>
            <h2 className="modal-title">{selectedChat.title}</h2>
            <div className="modal-messages">
              {selectedChat.messages.map((msg, index) => (
                <div
                  key={index}
                  className="message"
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.role === 'user' ? '#5DB075' : '#2A2A2A',
                  }}
                >
                  {msg.content}
                  {msg.fileUrl && (
                    <div style={{ marginTop: '8px' }}>
                      {/\.(jpg|png|jpeg)$/i.test(msg.fileUrl) ? (
                        <img
                          src={msg.fileUrl}
                          alt="Uploaded"
                          className="message-image"
                          style={{ maxWidth: '200px', borderRadius: '5px' }}
                        />
                      ) : (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="message-link"
                        >
                          View File
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FULL DARK THEME CSS */}
      <style>{`
        body {
          background: #121212 !important;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, sans-serif;
        }

        .root {
          min-height: 100vh;
          background-color: #121212;
          padding: 30px;
        }

        .main-container {
          width: 700px;
          height: 840px;
          margin: 50px auto;
          background: #121212;
          overflow-y: auto;
          border-radius: 8px;
          color: white;
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
        }

        .saved-chats-header {
          display: flex;
          align-items: center;
          padding: 20px;
          background-color: #1E1E1E;
          border-bottom: 1px solid #303139;
        }

        .saved-chats-title {
          font-size: 24px;
          font-weight: 700;
          flex-grow: 1;
        }

        .edit-mode-toggle {
          color: #5DB075;
          cursor:: pointer;
          font-size: 16px;
        }

        .saved-chats-list {
          padding: 20px;
        }

        .saved-chat-item {
          display: flex;
          align-items: center;
          background-color: #1E1E1E;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
          cursor: pointer;
          transition: background-color 0.3s;
          position: relative;
        }

        .chat-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          background-color: #005A9C;
          color: white;
          font-weight: bold;
        }

        .saved-chat-content {
          flex-grow: 1;
          max-width: 85%;
        }

        .saved-chat-title {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 5px;
        }

        .saved-chat-snippet {
          color: #888;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .saved-chat-time {
          color: #888;
          font-size: 12px;
        }

        .no-saved-chats {
          text-align: center;
          color: #888;
          padding: 50px 20px;
          font-size: 16px;
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          max-height: 80vh;
          background: #1E1E1E;
          border-radius: 10px;
          padding: 20px;
          z-index: 1000;
          overflow-y: auto;
          box-shadow: 0 0 30px rgba(0,0,0,0.5);
        }

        .modal-content {
          position: relative;
          color: white;
          padding: 20px;
        }

        .modal-close {
          position: absolute;
          top: 10px;
          right: 10px;
          background: transparent;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
        }

        .modal-messages {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .message {
          max-width: 70%;
          padding: 10px;
          border-radius: 8px;
          font-size: 14px;
        }

        .message-image {
          max-width: 200px;
          border-radius: 5px;
          margin-top: 10px;
        }

        .message-link {
          color: #1E90FF;
          text-decoration: none;
          margin-top: 10px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}

export default SavedChat;