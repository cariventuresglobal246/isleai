// src/ActivitiesProvider.jsx
import React, { useState, useEffect, useMemo } from "react";

// --- HELPER COMPONENTS (Moved outside to prevent focus loss) ---

// Moving InputGroup outside the main component fixes the "loss of focus" issue 
// allowing for continuous typing without the input resetting.
const InputGroup = ({ label, children }) => (
  <div style={{ marginBottom: 10, flex: 1, minWidth: '200px' }}>
    <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Table = ({ S, columns, rows }) => (
  <table style={S.table}>
    <thead>
      <tr>{columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr>
    </thead>
    <tbody>
      {rows.length === 0 ? (
        <tr><td colSpan={columns.length} style={{...S.td, textAlign:'center'}}>No Data</td></tr>
      ) : (
        rows.map((r, i) => (
          <tr key={r.id || i}>
            {columns.map(c => <td key={c} style={S.td}>{r[c] || "—"}</td>)}
          </tr>
        ))
      )}
    </tbody>
  </table>
);

const CollabList = ({ S, notes, newNote, setNewNote, addFunc }) => (
  <div style={S.card}>
    <h2 style={S.h2}>Collaboration</h2>
    <div style={{display:'flex', gap:10, marginBottom:10}}>
      <input style={S.input} value={newNote} onChange={e=>setNewNote(e.target.value)} />
      <button style={S.btnPrimary} onClick={addFunc}>Add</button>
    </div>
    {notes.map(n=>(
      <div key={n.id} style={{borderBottom:'1px solid #eee', padding:5}}>
        <b>{n.who}</b>: {n.note}
      </div>
    ))}
  </div>
);

// --- MAIN COMPONENT ---

export default function ActivitiesProvider({ fetchAPI, user, activeTab, S }) {
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [collabNotes, setCollabNotes] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);

  // --- NEW ACTIVITY FORM STATE ---
  const initialActivityState = {
    title: "",
    category: "Tours", // Default matches one of the options
    short_description: "",
    duration_text: "2 hours",
    duration_minutes: 120,
    base_price: 0,
    price_currency: "USD",
    max_participants: 10,
    min_participants: 1,
    difficulty: "All levels",
    min_age: 0,
    max_age: 99,
    start_time: "09:00",
    end_time: "11:00",
    meeting_point_text: "Bridgetown Port",
    meeting_point_address: "",
    meeting_point_google_maps_url: "",
    pickup_available: false,
    instant_confirmation: true,
    waiver_required: true,
    cancellation_policy: "Standard",
    what_to_bring: "", 
    highlights: "",    
    included_items: "",
    not_included_items: "", 
    contact_phone: "",
    contact_email: "",
    cover_image_url: "",
    gallery_image_urls: "", 
    active: true
  };

  const [newActivity, setNewActivity] = useState(initialActivityState);

  // Forms for other tabs
  const [calendarFilter, setCalendarFilter] = useState("All");
  const [newCollabNote, setNewCollabNote] = useState("");
  const [newChal, setNewChal] = useState({
    title: "",
    country: "Barbados",
    details: "",
    prize: "",
    start_date: "",
    end_date: "",
    image: ""
  });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [bk, act, rev, adv, chal, col, plans] = await Promise.all([
        fetchAPI("/activitiesprovider_bookings"),
        fetchAPI("/activitiesprovider_activities"),
        fetchAPI("/activitiesprovider_reviews"),
        fetchAPI("/entity_ai_advice?category=activities"),
        fetchAPI("/entity_challenges"),
        fetchAPI("/entity_collaboration"),
        fetchAPI("/entity_ai_advice?category=action_plan_act"),
      ]);
      if (bk) setBookings(bk);
      if (act) setActivities(act);
      if (rev) setReviews(rev);
      if (adv) setAdvice(adv);
      if (chal) setChallenges(chal);
      if (col) setCollabNotes(col);
      if (plans) setActionPlans(plans);
    };
    load();
  }, [fetchAPI, user]);

  const activityById = useMemo(() => {
    const map = new Map();
    activities.forEach((a) => {
      if (a?.id) map.set(a.id, a);
    });
    return map;
  }, [activities]);

  const bookingRows = useMemo(() => {
    return bookings.map((b) => {
      const activity =
        activityById.get(b.activity_id) ||
        activityById.get(b.activityId) ||
        null;

      const date = b.date || b.activity_date || b.scheduled_date || "";
      const time = b.time || b.activity_time || b.scheduled_time || "";

      return {
        id: b.id,
        guest_name: b.guest_name || b.guest || "Guest",
        activity_name: b.activity_name || activity?.title || activity?.name || "Activity",
        date,
        time,
        status: b.status || (b.confirmed === false ? "Pending" : "Confirmed"),
        pax: b.pax || b.party_size || b.guests || 1,
      };
    });
  }, [bookings, activityById]);

  // Helper to split CSV strings into Arrays for DB
  const toArray = (str) => str ? str.split(",").map(s => s.trim()) : [];

  const handleAddActivity = async () => {
    if (!newActivity.title) return alert("Title is required");

    // Construct Payload matching SQL Schema
    const payload = {
      ...newActivity,
      entity_id: user.id,
      // Convert UI strings to Arrays
      highlights: toArray(newActivity.highlights),
      what_to_bring: toArray(newActivity.what_to_bring),
      included_items: toArray(newActivity.included_items),
      not_included_items: toArray(newActivity.not_included_items),
      gallery_image_urls: toArray(newActivity.gallery_image_urls),
      // Ensure Numbers
      base_price: Number(newActivity.base_price),
      max_participants: Number(newActivity.max_participants),
      min_participants: Number(newActivity.min_participants),
      min_age: Number(newActivity.min_age),
      max_age: Number(newActivity.max_age),
      duration_minutes: Number(newActivity.duration_minutes)
    };

    const res = await fetchAPI("/activitiesprovider_activities", "POST", payload);
    if (res) {
      setActivities([res, ...activities]);
      setNewActivity(initialActivityState);
    }
  };

  const handleAddChallenge = async () => {
    if (!newChal.title || !newChal.country) return;
    const payload = {
      title: newChal.title,
      creator_entity_id: user.id,
      status: "Draft",
      country: newChal.country,
      details: newChal.details,
      prize: newChal.prize,
      start_date: newChal.start_date || null,
      end_date: newChal.end_date || null,
      image: newChal.image
    };
    const res = await fetchAPI("/entity_challenges", "POST", payload);
    if (res) { 
      setChallenges([res, ...challenges]); 
      setNewChal({ title: "", country: "Barbados", details: "", prize: "", start_date: "", end_date: "", image: "" });
    }
  };

  const handleAddCollab = async () => {
    if (!newCollabNote) return;
    const res = await fetchAPI("/entity_collaboration", "POST", { who: "Activities", note: newCollabNote, date: new Date().toISOString().slice(0, 10) });
    if (res) { setCollabNotes([res, ...collabNotes]); setNewCollabNote(""); }
  };

  const calendarRows = useMemo(() => {
    let rows = bookingRows.map(b => ({
      ...b,
      activity: b.activity_name,
    }));
    if (calendarFilter !== "All") rows = rows.filter(r => r.status === calendarFilter);
    return rows;
  }, [bookingRows, calendarFilter]);

  const analytics = useMemo(() => {
     const confirmed = bookingRows.filter(b => b.status === "Confirmed").length;
     return { confirmed, pending: bookingRows.filter(b => b.status === "Pending").length, utilization: Math.min(96, 50 + confirmed * 12) };
  }, [bookingRows]);

  if (activeTab === "Bookings") {
    return (
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
           <h2 style={S.h2}>Bookings</h2>
           <div style={S.pill}>Confirmed: {analytics.confirmed}</div>
        </div>
        <Table S={S} columns={["guest_name", "activity_name", "date", "time", "status", "pax"]} rows={bookingRows} />
      </div>
    );
  }
  if (activeTab === "Calendar") {
    return (
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
           <h2 style={S.h2}>Calendar</h2>
           <div style={S.row}>
             {["All", "Confirmed", "Pending"].map(f => <button key={f} style={calendarFilter===f?S.btnPrimary:S.btn} onClick={()=>setCalendarFilter(f)}>{f}</button>)}
           </div>
        </div>
        <Table S={S} columns={["date", "time", "guest_name", "activity", "status"]} rows={calendarRows} />
      </div>
    );
  }
  if (activeTab === "Activities") {
    return (
      <>
        <div style={S.card}>
          <h2 style={S.h2}>Add New Activity</h2>
          
          {/* Section: Basic Info */}
          <h3 style={{...S.h3, marginTop:10, borderBottom:'1px solid #eee'}}>Basic Info</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <InputGroup label="Title">
              <input style={S.input} value={newActivity.title} onChange={e=>setNewActivity({...newActivity, title:e.target.value})} placeholder="e.g. Sunset Catamaran" />
            </InputGroup>
            
            {/* DROPDOWN: Fixed Categories */}
            <InputGroup label="Category">
               <select 
                 style={S.select} 
                 value={newActivity.category} 
                 onChange={e=>setNewActivity({...newActivity, category:e.target.value})}
               >
                 {['Surfing', 'Tours', 'Foodie', 'Culture', 'Nature', 'Family Fun'].map(cat => (
                   <option key={cat} value={cat}>{cat}</option>
                 ))}
               </select>
            </InputGroup>

            <InputGroup label="Difficulty">
              <select style={S.select} value={newActivity.difficulty} onChange={e=>setNewActivity({...newActivity, difficulty:e.target.value})}>
                {['Beginner', 'Intermediate', 'Advanced', 'All levels', 'Family-friendly'].map(o => <option key={o}>{o}</option>)}
              </select>
            </InputGroup>
          </div>
          <InputGroup label="Short Description">
            <textarea style={{...S.input, height:60}} value={newActivity.short_description} onChange={e=>setNewActivity({...newActivity, short_description:e.target.value})} />
          </InputGroup>

          {/* Section: Logistics & Price */}
          <h3 style={{...S.h3, marginTop:15, borderBottom:'1px solid #eee'}}>Logistics & Pricing</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <InputGroup label="Price">
              <input type="number" style={S.input} value={newActivity.base_price} onChange={e=>setNewActivity({...newActivity, base_price:e.target.value})} />
            </InputGroup>
            <InputGroup label="Currency">
               <select style={S.select} value={newActivity.price_currency} onChange={e=>setNewActivity({...newActivity, price_currency:e.target.value})}><option>USD</option><option>BBD</option></select>
            </InputGroup>
            <InputGroup label="Max Participants">
              <input type="number" style={S.input} value={newActivity.max_participants} onChange={e=>setNewActivity({...newActivity, max_participants:e.target.value})} />
            </InputGroup>
             <InputGroup label="Duration (Text)">
              <input style={S.input} value={newActivity.duration_text} onChange={e=>setNewActivity({...newActivity, duration_text:e.target.value})} placeholder="e.g. 2 hours" />
            </InputGroup>
            <InputGroup label="Duration (Mins)">
              <input type="number" style={S.input} value={newActivity.duration_minutes} onChange={e=>setNewActivity({...newActivity, duration_minutes:e.target.value})} />
            </InputGroup>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
             <InputGroup label="Start Time">
                <input type="time" style={S.input} value={newActivity.start_time} onChange={e=>setNewActivity({...newActivity, start_time:e.target.value})} />
             </InputGroup>
             <InputGroup label="End Time">
                <input type="time" style={S.input} value={newActivity.end_time} onChange={e=>setNewActivity({...newActivity, end_time:e.target.value})} />
             </InputGroup>
             <InputGroup label="Min Age">
                <input type="number" style={S.input} value={newActivity.min_age} onChange={e=>setNewActivity({...newActivity, min_age:e.target.value})} />
             </InputGroup>
          </div>

          {/* Section: Location */}
          <h3 style={{...S.h3, marginTop:15, borderBottom:'1px solid #eee'}}>Location</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
             <InputGroup label="Meeting Point Name">
                <input style={S.input} value={newActivity.meeting_point_text} onChange={e=>setNewActivity({...newActivity, meeting_point_text:e.target.value})} />
             </InputGroup>
             <InputGroup label="Meeting Point Address">
                <input style={S.input} value={newActivity.meeting_point_address} onChange={e=>setNewActivity({...newActivity, meeting_point_address:e.target.value})} />
             </InputGroup>
             <InputGroup label="Google Maps URL">
                <input style={S.input} value={newActivity.meeting_point_google_maps_url} onChange={e=>setNewActivity({...newActivity, meeting_point_google_maps_url:e.target.value})} />
             </InputGroup>
          </div>
          <div style={{marginTop:5}}>
            <label style={{marginRight:15}}><input type="checkbox" checked={newActivity.pickup_available} onChange={e=>setNewActivity({...newActivity, pickup_available:e.target.checked})} /> Pickup Available</label>
            <label style={{marginRight:15}}><input type="checkbox" checked={newActivity.instant_confirmation} onChange={e=>setNewActivity({...newActivity, instant_confirmation:e.target.checked})} /> Instant Confirm</label>
            <label><input type="checkbox" checked={newActivity.waiver_required} onChange={e=>setNewActivity({...newActivity, waiver_required:e.target.checked})} /> Waiver Req.</label>
          </div>

          {/* Section: Details (Arrays) */}
          <h3 style={{...S.h3, marginTop:15, borderBottom:'1px solid #eee'}}>Details (Comma Separated)</h3>
          <InputGroup label="Highlights (e.g. Open Bar, Snorkeling, Transport)">
             <input style={S.input} value={newActivity.highlights} onChange={e=>setNewActivity({...newActivity, highlights:e.target.value})} />
          </InputGroup>
          <InputGroup label="Included Items">
             <input style={S.input} value={newActivity.included_items} onChange={e=>setNewActivity({...newActivity, included_items:e.target.value})} />
          </InputGroup>
          <InputGroup label="What to bring">
             <input style={S.input} value={newActivity.what_to_bring} onChange={e=>setNewActivity({...newActivity, what_to_bring:e.target.value})} />
          </InputGroup>

          {/* Section: Contact & Media */}
          <h3 style={{...S.h3, marginTop:15, borderBottom:'1px solid #eee'}}>Contact & Media</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
             <InputGroup label="Contact Phone">
                <input style={S.input} value={newActivity.contact_phone} onChange={e=>setNewActivity({...newActivity, contact_phone:e.target.value})} />
             </InputGroup>
             <InputGroup label="Contact Email">
                <input style={S.input} value={newActivity.contact_email} onChange={e=>setNewActivity({...newActivity, contact_email:e.target.value})} />
             </InputGroup>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
             <InputGroup label="Cover Image URL">
                <input style={S.input} value={newActivity.cover_image_url} onChange={e=>setNewActivity({...newActivity, cover_image_url:e.target.value})} />
             </InputGroup>
             <InputGroup label="Gallery Images (Comma separated URLs)">
                <textarea style={{...S.input, height:50}} value={newActivity.gallery_image_urls} onChange={e=>setNewActivity({...newActivity, gallery_image_urls:e.target.value})} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" />
             </InputGroup>
          </div>

          <div style={{marginTop: 20, textAlign: 'right'}}>
            <button style={S.btnPrimary} onClick={handleAddActivity}>Create Activity</button>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>My Activities</h2>
          <Table S={S} columns={["title", "category", "duration_text", "base_price", "active"]} rows={activities.map(a=>({...a, active: a.active ? "Yes" : "No"}))} />
        </div>
      </>
    );
  }
  if (activeTab === "Challenges") {
    return (
      <div style={S.card}>
        <h2 style={S.h2}>Challenges</h2>
        <div style={{ ...S.split, marginBottom: 15, padding: 10, background: '#f8fafc', borderRadius: 12 }}>
          <input style={S.input} placeholder="Title" value={newChal.title} onChange={e=>setNewChal({...newChal, title:e.target.value})} />
          <input style={S.input} placeholder="Country" value={newChal.country} onChange={e=>setNewChal({...newChal, country:e.target.value})} />
          <input style={S.input} placeholder="Details" value={newChal.details} onChange={e=>setNewChal({...newChal, details:e.target.value})} />
          <input style={S.input} placeholder="Prize (e.g. $500)" value={newChal.prize} onChange={e=>setNewChal({...newChal, prize:e.target.value})} />
          <div><div style={S.muted}>Start Date</div><input style={S.input} type="date" value={newChal.start_date} onChange={e=>setNewChal({...newChal, start_date:e.target.value})} /></div>
          <div><div style={S.muted}>End Date</div><input style={S.input} type="date" value={newChal.end_date} onChange={e=>setNewChal({...newChal, end_date:e.target.value})} /></div>
          <input style={S.input} placeholder="Image URL" value={newChal.image} onChange={e=>setNewChal({...newChal, image:e.target.value})} />
          <button style={S.btnPrimary} onClick={handleAddChallenge}>Create Challenge</button>
        </div>
        <Table S={S} columns={["title", "country", "prize", "status", "start_date"]} rows={challenges} />
      </div>
    );
  }
  if (activeTab === "Collaboration") return <CollabList S={S} notes={collabNotes} newNote={newCollabNote} setNewNote={setNewCollabNote} addFunc={handleAddCollab} />;
  if (activeTab === "Reviews") return <div style={S.card}>Review list...</div>;
  if (activeTab === "Advice (AI)") return <div style={S.card}>{advice.map(a=><div key={a.id}><b>{a.title}</b>: {a.text}</div>)}</div>;
  if (activeTab === "Analytics") return <div style={S.card}><h2 style={S.h2}>Utilization</h2>{analytics.utilization}%</div>;
  if (activeTab === "Action Plans") return <div style={S.card}>{actionPlans.map(a=><div key={a.id}>{a.text}</div>)}</div>;

  return null;
}
