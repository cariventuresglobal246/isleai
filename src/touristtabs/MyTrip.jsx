import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import axios from "axios";
import ProgressTab from "./ProgressTab";
import { X, Calendar as CalIcon, Clock, MapPin } from 'lucide-react';

export default function MyTrip({ S, accessToken }) {
  // --- API base (Cloudflare Worker via VITE_API_URL) ---
  const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const API_ORIGIN = RAW_API.startsWith("http") ? RAW_API : `https://${RAW_API}`;
  const API_ROOT = API_ORIGIN.replace(/\/+$/, "");
  const API_BASE = `${API_ROOT}/api/tourism-onboarding`;
  const ENTITIES_BASE = `${API_ROOT}/api/tourism-entities`;

  // --- 1. STATE ---
  const [tripId, setTripId] = useState(null);
  const [tripDates, setTripDates] = useState({ start: null, end: null }); 
  const [tasks, setTasks] = useState([]);
  const [budget, setBudget] = useState({ spent: 0, total: 0, categories: [] });
  const [accommodationState, setAccommodationState] = useState({
    name: "Loading...",
    sub: "",
    location: "",
    note: "",
  });
  const [accommodationStatus, setAccommodationStatus] = useState("Pending");

  // Calendar Interaction State
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const accommodation = useMemo(() => accommodationState, [accommodationState]);

  // --- 3. FETCH DATA (UPDATED) ---
  useEffect(() => {
    let mounted = true;

    const fetchTripData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/trip`, {
            withCredentials: true,
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const data = res.data;
        let rootData = data;
        if (Array.isArray(rootData)) rootData = rootData.length > 0 ? rootData[0] : null;

        if (!rootData || (!rootData.trip && !rootData.found)) {
            if (mounted) setAccommodationState(prev => ({ ...prev, name: "No Trip Data Found" }));
            return;
        }

        const tripObj = rootData.trip || rootData; 
        const accObj = rootData.accommodation || tripObj;
        const budgetObj = rootData.budget || {};

        const stayListingId =
          rootData.stayListingId ||
          rootData.stay_listing_id ||
          tripObj.stayListingId ||
          tripObj.stay_listing_id ||
          null;

        const fetchBookingStatus = async () => {
          if (!stayListingId) return "Pending";
          try {
            const resBookings = await axios.get(
              `${ENTITIES_BASE}/accommodationprovider_bookings`,
              {
                withCredentials: true,
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { listing_id: stayListingId },
              }
            );
            const rows = resBookings.data?.data || [];
            const booking = Array.isArray(rows) ? rows[0] : rows;
            return booking?.confirmed === true ? "Booked" : "Pending";
          } catch (e) {
            console.warn("Could not fetch accommodation booking status", e);
            return "Pending";
          }
        };
        
        // 1. Get manually added tasks from DB
        const dbTasks = rootData.tasks || [];

        // 2. ✅ Get activities from Onboarding JSONB (selected_activities)
        // Checks rootData.selected_activities or rootData.onboarding.selected_activities
        const rawActivities =
            rootData.selectedActivities ||
            rootData.selected_activities ||
            (rootData.onboarding ? (rootData.onboarding.selectedActivities || rootData.onboarding.selected_activities) : null) ||
            [];
        
        const onboardingActivities = rawActivities.map((act, idx) => ({
            id: act.id || act.activity_id || `onb-act-${idx}`,
            title: act.title || act.name || "Activity",
            priority: "Normal",
            column: "Activities To Do",
            subtasks: [],
            recurring: false,
            timeboxMins: Number(act.duration_minutes || act.durationMins || 0) || 0,

            // ✅ Date & time chosen in onboarding (drives calendar + modal)
            scheduledDate: act.scheduled_date || act.scheduledDate || null,
            scheduledTime: act.scheduled_time || act.scheduledTime || null,

            isBooking: true,
            isFromOnboarding: true,
        }));


        // 3. Merge Tasks
        const allTasks = [...dbTasks, ...onboardingActivities];

        const status = await fetchBookingStatus();

        if (mounted) {
            if (tripObj && tripObj.id) setTripId(tripObj.id);
            
            setTripDates({
                start: tripObj.start_date,
                end: tripObj.end_date
            });

            // Process merged tasks
            setTasks(allTasks.map(t => ({
                ...t,
                // Ensure robust date handling
                scheduledDate: t.scheduledDate || t.scheduled_date || t.due_date || null,
                scheduledTime: t.scheduledTime || t.scheduled_time || null,
                // Ensure purple booking styling for activities
                isBooking: t.isBooking || t.title?.toLowerCase().includes('booking') || t.title?.toLowerCase().includes('reservation') || (t.column === 'Activities To Do')
            })));

            setBudget({
                spent: Number(budgetObj.spent) || 0,
                total: Number(budgetObj.total) || 0,
                categories: budgetObj.categories || [],
            });

            const rawName = accObj.stay_option || accObj.name;
            const finalName = accObj.title || rawName || "No Hotel Selected";

            setAccommodationState({
                name: finalName,
                sub: accObj.sub || "Details unavailable",
                location: accObj.location || tripObj.destination_country || "Barbados",
                note: accObj.reservation_code ? `Res: ${accObj.reservation_code}` : "",
            });
            setAccommodationStatus(status);
        }
      } catch (err) {
        console.error("Error fetching trip:", err);
        if (mounted) setAccommodationState(prev => ({ ...prev, name: "Error loading data" }));
      }
    };

    if (accessToken) fetchTripData();
    return () => { mounted = false; };
  }, [accessToken]);

  // --- 4. HELPERS & ACTIONS ---
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(dateStr);
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setIsDayModalOpen(true);
  };

  // Filter tasks for the selected date (Modal View)
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate || !tasks.length) return [];
    return tasks
      .filter((t) => t.scheduledDate === selectedDate)
      .slice()
      .sort((a, b) => {
        const ta = a.scheduledTime || "";
        const tb = b.scheduledTime || "";
        return ta.localeCompare(tb);
      });
  }, [selectedDate, tasks]);

  const tripProgress = useMemo(() => {
    if (!tasks.length) return 0;
    const completedCount = tasks.filter((t) => t.column === "Completed").length;
    return Math.round((completedCount / tasks.length) * 100);
  }, [tasks]);

  const budgetStatus = useMemo(() => {
    const spent = Number(budget.spent || 0);
    const total = Math.max(1, Number(budget.total || 0));
    return { 
        remaining: Math.max(0, total - spent), 
        pct: Math.max(0, Math.min(100, Math.round((spent / total) * 100))), 
        underOver: spent <= total ? "Under budget" : "Over budget", 
        spent 
    };
  }, [budget]);

  const kanbanColumns = ["Planning", "Activities To Do", "Completed"];

  const moveTask = async (taskId, nextColumn) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column: nextColumn } : t)));
    
    // Only persist if it's a real DB task (not just from onboarding JSON)
    // You would typically implement an endpoint to "promote" an onboarding activity to a real task here if needed.
    try {
        await axios.patch(`${API_BASE}/tasks/${taskId}`, 
            { column_name: nextColumn }, 
            { withCredentials: true, headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
    } catch (e) { 
        // Silent fail or revert
        console.warn("Could not save move", e); 
    }
  };

  const downloadOfflinePack = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.text("ISLE AI — Offline Trip Pack", 40, 40);
    let y = 70;
    
    // Simple Text Dump of Tasks
    tasks.forEach(t => {
        doc.text(`[ ] ${t.title} (${t.scheduledDate || 'No Date'})`, 40, y);
        y += 20;
    });
    
    doc.save("isleai_offline_pack.pdf");
  };

  // --- 5. COMPONENT: Day Details Modal ---
  const DayDetailsModal = () => {
    if (!isDayModalOpen) return null;

    const displayDate = parseLocalDate(selectedDate)?.toLocaleDateString("en-US", { 
        weekday: 'long', month: 'long', day: 'numeric' 
    });

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', animation: 'fade-in 0.2s'
      }} onClick={() => setIsDayModalOpen(false)}>
        <div style={{
          backgroundColor: 'white', width: '90%', maxWidth: '400px', borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden', animation: 'scale-up 0.2s'
        }} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Itinerary</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{displayDate}</p>
            </div>
            <button onClick={() => setIsDayModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
            {tasksForSelectedDate.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                <CalIcon size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>No activities scheduled for this day.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasksForSelectedDate.map(task => (
                  <div key={task.id} style={{
                    padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0',
                    backgroundColor: task.column === 'Completed' ? '#f0fdf4' : '#fff'
                  }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                       {task.scheduledTime && (
                         <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                           <Clock size={12} /> {task.scheduledTime}
                         </span>
                       )}
                       {task.timeboxMins > 0 && (
                         <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                           <Clock size={12} /> {task.timeboxMins}m
                         </span>
                       )}
                       <span style={{display:'flex', alignItems:'center', gap:4}}><MapPin size={12}/> Barbados</span>
                    </div>
                    {task.column !== 'Completed' && (
                        <div style={{marginTop: 8}}>
                             <span style={{
                                 fontSize: '10px', padding: '3px 8px', borderRadius: '99px',
                                 background: '#eff6ff', color: '#1d4ed8', fontWeight: 600
                             }}>
                                 {task.column}
                             </span>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ padding: '12px', background: '#f8fafc', textAlign: 'center' }}>
             <button onClick={() => setIsDayModalOpen(false)} style={{
                 padding: '8px 24px', borderRadius: '99px', border: 'none', background: '#1e293b', color: 'white', fontWeight: 500, cursor: 'pointer'
             }}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // --- 6. CALENDAR COMPONENT ---
  const TripCalendar = ({ startDate, endDate }) => {
    const initialDate = startDate ? parseLocalDate(startDate) : new Date();
    const [currentMonth, setCurrentMonth] = useState(initialDate);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    const getFormattedDate = (day) => {
        const d = new Date(year, month, day);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}`;
    };

    const isWithinTrip = (day) => {
      if (!startDate || !endDate) return false;
      const dateStr = getFormattedDate(day);
      return dateStr >= startDate && dateStr <= endDate;
    };

    // ✅ CHECK FOR ACTIVITIES ON THIS DATE (DOTS)
    const hasActivities = (day) => {
        const dateStr = getFormattedDate(day);
        return tasks.some(t => t.scheduledDate === dateStr);
    };

    return (
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <button style={{...S.btn, padding: '4px 8px'}} onClick={prevMonth}>&lt;</button>
          <h3 style={{ margin: 0, fontWeight: 700 }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button style={{...S.btn, padding: '4px 8px'}} onClick={nextMonth}>&gt;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, textAlign: 'center' }}>
          {dayNames.map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', paddingBottom: 5 }}>{d}</div>
          ))}

          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const active = isWithinTrip(day);
            const dateStr = getFormattedDate(day);
            const hasActivity = hasActivities(day);

            return (
              <div 
                key={day} 
                onClick={() => handleDateClick(dateStr)} // ✅ Handle Click
                style={{
                  height: 34,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  backgroundColor: hasActivity ? '#dbeafe' : (active ? '#eff6ff' : 'transparent'),
                  color: active ? '#1d4ed8' : '#334155',
                  fontWeight: active ? 'bold' : 'normal',
                  border: hasActivity ? '1px solid #60a5fa' : (active ? '1px solid #bfdbfe' : '1px solid transparent'),
                  transition: 'all 0.2s'
              }}>
                {day}
                {/* ✅ DOT INDICATOR for Activities */}
                {hasActivity && (
                    <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: '#1E90FF'
                    }} />
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: 15, fontSize: 12, color: '#64748b', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#1E90FF'}}></div> Activity scheduled
            </span>
        </div>
      </div>
    );
  };

  const AccommodationSection = () => (
    <div style={S.card}>
      <h2 style={S.h2}>Accommodation</h2>
      <div style={S.muted}>Where you’re staying</div>
      <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 14, background: "#ffffff", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 1000, fontSize: 14 }}>{accommodation.name}</div>
            <span style={S.pill}>{accommodationStatus}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "#0f172a" }}>{accommodation.sub}</div>
      </div>
    </div>
  );

  return (
    <>
      <DayDetailsModal />

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div><h2 style={S.h2}>My Trip</h2></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btnPrimary} onClick={downloadOfflinePack}>Download Offline Pack</button>
          </div>
        </div>
      </div>

      <ProgressTab S={S} tripProgress={tripProgress} budget={budget} budgetStatus={budgetStatus} />
      
      {/* Calendar View */}
      <TripCalendar startDate={tripDates.start} endDate={tripDates.end} />

      <AccommodationSection />

      <div style={S.card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={{ ...S.h2, margin: 0 }}>Tasks</h2>
          <span style={S.pill}>Kanban Board</span>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div style={S.kanban}>
        {kanbanColumns.map((col) => (
          <div key={col} style={S.col}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>{col}</div>
              <span style={S.pill}>{tasks.filter((t) => t.column === col).length}</span>
            </div>

            {tasks
              .filter((t) => t.column === col)
              .map((t) => (
                <div key={t.id} style={{
                    ...S.task, 
                    borderLeft: t.isBooking ? "4px solid #9333ea" : S.task.borderLeft
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{t.title}</div>
                    <span style={{...S.pill, background: t.priority === 'Must-Do' ? '#fecaca' : '#e5e7eb', color: t.priority === 'Must-Do' ? '#991b1b' : 'inherit'}}>{t.priority}</span>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {t.isBooking && <span style={{...S.pill, background: "#f3e8ff", color: "#6b21a8"}}>Booking</span>}
                    {t.timeboxMins > 0 && <span style={S.pill}>{t.timeboxMins}m</span>}
                    {/* Display Date on Card if exists */}
                    {t.scheduledDate && <span style={{...S.pill, fontSize:10, background:'#ecf9ff', color:'#0284c7'}}>{t.scheduledDate}</span>}
                    {t.scheduledTime && <span style={{...S.pill, fontSize:10, background:'#fef9c3', color:'#92400e'}}>{t.scheduledTime}</span>}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <select value={t.column} onChange={(e) => moveTask(t.id, e.target.value)} style={S.select}>
                      {kanbanColumns.map((c) => (
                        <option key={c} value={c} disabled={c === t.column}>Move to: {c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-up { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}
