import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChatBarTourism({ 
  visible = false, 
  onFactsClick, 
  onboardingData, 
  hasCompletedOnboarding 
}) {
  const navigate = useNavigate();

  // --- 1. Helper to calculate days remaining ---
  const getDaysLeft = () => {
    if (!onboardingData?.endDate) return '--';
    const end = new Date(onboardingData.endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // --- 2. Helper to clean up accommodation name ---
  const getStayName = () => {
    if (!onboardingData?.stayOption) return 'Not set';
    return onboardingData.stayOption.split('(')[0].trim();
  };

  // Ensure Font Awesome is available
  useEffect(() => {
    if (!document.querySelector('link[data-fa="true"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
      link.setAttribute('data-fa', 'true');
      document.head.appendChild(link);
    }
  }, []);

  const S = {
    shell: {
      position: 'absolute',
      top: 60,
      left: 0,
      width: 180,
      height: 'calc(80% - 60px)',
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      overflowY: 'auto',
      padding: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-220px)',
      transition: 'opacity .28s ease, transform .28s ease',
      pointerEvents: visible ? 'auto' : 'none',
      zIndex: 1002,
    },

    panel: {
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      background: '#ffffff',
      boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
      padding: 10,
      marginBottom: 10,
    },

    h3: {
      margin: '0 0 8px 0',
      fontSize: 12,
      letterSpacing: '.2px',
      color: '#64748b',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },

    stat: {
      display: 'grid',
      gridTemplateColumns: '28px 1fr auto',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      background: '#f8fafc',
      marginBottom: 8,
    },

    statIcon: {
      fontSize: 14,
      display: 'grid',
      placeItems: 'center',
      width: 28,
      height: 28,
      borderRadius: 8,
      background: '#f1f5f9',
      color: '#2563eb',
    },

    label: { fontWeight: 600, fontSize: 12 },

    badge: {
      display: 'inline-grid',
      placeItems: 'center',
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 11,
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      color: '#0f172a',
      minWidth: 28,
      maxWidth: 80,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },

    chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 },

    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid #e5e7eb',
      background: '#f1f5f9',
      fontSize: 12,
      fontWeight: 600,
    },

    cta: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      border: '1px solid #bbf7d0',
      background: '#dcfce7',
      color: '#16a34a',
      borderRadius: 8,
      fontWeight: 700,
      fontSize: 12,
      boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
      marginTop: 6,
      cursor: 'pointer',
    },

    ctaSecondary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 8px',
      border: '1px solid #bfdbfe',
      background: '#eff6ff',
      color: '#1d4ed8',
      borderRadius: 6,
      fontWeight: 700,
      fontSize: 11,
      cursor: 'pointer',
    },

    calendar: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },

    day: {
      aspectRatio: '1 / 1',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      display: 'grid',
      placeItems: 'center',
      fontSize: 11,
      background: '#f8fafc',
      position: 'relative',
      color: '#0f172a',
    },

    today: { borderColor: '#bfdbfe', background: '#eff6ff', fontWeight: 700 },

    dot: {
      position: 'absolute',
      bottom: 4,
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: '#2563eb',
    },
  };

  return (
    <aside style={S.shell} aria-hidden={!visible}>
      <div style={S.panel}>
        {/* Trip Overview Header + MORE button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={S.h3}>
            <i className="fa-solid fa-suitcase-rolling" /> Trip Overview
          </h3>

          <button
            type="button"
            style={S.ctaSecondary}
            onClick={() => navigate('/tourism-dashboard')}
            title="Open full dashboard"
          >
            More <i className="fa-solid fa-arrow-right" />
          </button>
        </div>

        <div style={S.stat}>
          <i className="fa-solid fa-wallet" style={S.statIcon} />
          <div style={S.label}>Budget</div>
          <div style={S.badge}>{onboardingData?.budget || '--'}</div>
        </div>

        <div style={S.stat}>
          <i className="fa-solid fa-hourglass-half" style={S.statIcon} />
          <div style={S.label}>Days left</div>
          <div style={S.badge}>{getDaysLeft()}</div>
        </div>

        <div style={S.stat}>
          <i className="fa-solid fa-bed" style={S.statIcon} />
          <div style={S.label}>Stay</div>
          <div style={S.badge}>{getStayName()}</div>
        </div>

        <div style={S.stat}>
          <i className="fa-solid fa-list-check" style={S.statIcon} />
          <div style={S.label}>Bucket List</div>
          <div style={S.badge}>
            {onboardingData?.wantBucket ? 'Active' : 'Off'}
          </div>
        </div>

        <div style={{ ...S.panel, marginTop: 10 }}>
          <h3 style={S.h3}>Generates Tips</h3>

          <div style={S.chipRow}>
            <span style={S.chip}><i className="fa-solid fa-utensils" /> Food</span>
            <span style={S.chip}><i className="fa-solid fa-masks-theater" /> Entertain.</span>
            <span style={S.chip}><i className="fa-solid fa-umbrella-beach" /> Beaches</span>
            <span style={S.chip}><i className="fa-solid fa-person-hiking" /> Adventure</span>
            <span style={S.chip}><i className="fa-solid fa-van-shuttle" /> Tours</span>
          </div>

          <button style={S.cta}>
            <i className="fa-solid fa-wand-magic-sparkles" /> Generate
          </button>

          <button style={S.ctaSecondary} onClick={onFactsClick}>
            <i className="fa-solid fa-lightbulb" /> Facts
          </button>
        </div>
      </div>

      <div style={S.panel}>
        <h3 style={S.h3}><i className="fa-solid fa-calendar-days" /> Calendar</h3>
        <div style={S.calendar}>
          {Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1;
            const isToday = day === new Date().getDate();
            const has = [3, 9, 12, 17, 20, 25].includes(day);
            return (
              <div key={day} style={{ ...S.day, ...(isToday ? S.today : {}) }}>
                {day}
                {has && <span style={S.dot} />}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
