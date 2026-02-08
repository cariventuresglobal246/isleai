// src/ActivitiesProvider.jsx
import React, { useState, useEffect, useMemo } from "react";

export default function ActivitiesProvider({ fetchAPI, user, activeTab, S }) {
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [collabNotes, setCollabNotes] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);

  // Forms
  const [newActivity, setNewActivity] = useState({ name: "", duration: "2h", price: 80, capacity: 10, location: "Bridgetown" });
  const [calendarFilter, setCalendarFilter] = useState("All");
  const [newCollabNote, setNewCollabNote] = useState("");

  // CHALLENGE FORM STATE (Updated for new schema)
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

  const handleAddActivity = async () => {
    if (!newActivity.name) return;
    const payload = { ...newActivity, entity_id: user.id, active: true };
    const res = await fetchAPI("/activitiesprovider_activities", "POST", payload);
    if (res) {
      setActivities([res, ...activities]);
      setNewActivity({ name: "", duration: "2h", price: 80, capacity: 10, location: "Bridgetown" });
    }
  };

  const handleAddChallenge = async () => {
    if (!newChal.title || !newChal.country) return;

    // Construct Payload for new Schema
    const payload = {
      title: newChal.title,
      creator_entity_id: user.id, // Links to UUID
      status: "Draft",
      country: newChal.country, // Was region
      details: newChal.details,
      prize: newChal.prize,
      start_date: newChal.start_date || null,
      end_date: newChal.end_date || null,
      image: newChal.image
    };

    const res = await fetchAPI("/entity_challenges", "POST", payload);
    if (res) { 
      setChallenges([res, ...challenges]); 
      // Reset Form
      setNewChal({ title: "", country: "Barbados", details: "", prize: "", start_date: "", end_date: "", image: "" });
    }
  };

  const handleAddCollab = async () => {
    if (!newCollabNote) return;
    const res = await fetchAPI("/entity_collaboration", "POST", { who: "Activities", note: newCollabNote, date: new Date().toISOString().slice(0, 10) });
    if (res) { setCollabNotes([res, ...collabNotes]); setNewCollabNote(""); }
  };

  const calendarRows = useMemo(() => {
    let rows = bookings.map(b => ({ ...b, activity: b.activity_name }));
    if (calendarFilter !== "All") rows = rows.filter(r => r.status === calendarFilter);
    return rows;
  }, [bookings, calendarFilter]);

  const analytics = useMemo(() => {
     const confirmed = bookings.filter(b => b.status === "Confirmed").length;
     return { confirmed, pending: bookings.filter(b => b.status === "Pending").length, utilization: Math.min(96, 50 + confirmed * 12) };
  }, [bookings]);

  if (activeTab === "Bookings") {
    return (
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
           <h2 style={S.h2}>Bookings</h2>
           <div style={S.pill}>Confirmed: {analytics.confirmed}</div>
        </div>
        <Table S={S} columns={["guest_name", "activity_name", "date", "time", "status", "pax"]} rows={bookings} />
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
          <h2 style={S.h2}>Add Activity</h2>
          <div style={{ ...S.split, marginTop: 10 }}>
            <input style={S.input} placeholder="Name" value={newActivity.name} onChange={e=>setNewActivity({...newActivity, name:e.target.value})} />
            <input style={S.input} type="number" placeholder="Price" value={newActivity.price} onChange={e=>setNewActivity({...newActivity, price:Number(e.target.value)})} />
            <select style={S.select} value={newActivity.duration} onChange={e=>setNewActivity({...newActivity, duration:e.target.value})}><option>2h</option><option>4h</option></select>
            <button style={S.btnPrimary} onClick={handleAddActivity}>Add</button>
          </div>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>My Activities</h2>
          <Table S={S} columns={["name", "duration", "price", "active"]} rows={activities.map(a=>({...a, active: a.active ? "Yes" : "No"}))} />
        </div>
      </>
    );
  }
  if (activeTab === "Challenges") {
    return (
      <div style={S.card}>
        <h2 style={S.h2}>Challenges</h2>
        
        {/* New Schema Form */}
        <div style={{ ...S.split, marginBottom: 15, padding: 10, background: '#f8fafc', borderRadius: 12 }}>
          <input style={S.input} placeholder="Title" value={newChal.title} onChange={e=>setNewChal({...newChal, title:e.target.value})} />
          <input style={S.input} placeholder="Country" value={newChal.country} onChange={e=>setNewChal({...newChal, country:e.target.value})} />
          
          <input style={S.input} placeholder="Details" value={newChal.details} onChange={e=>setNewChal({...newChal, details:e.target.value})} />
          <input style={S.input} placeholder="Prize (e.g. $500)" value={newChal.prize} onChange={e=>setNewChal({...newChal, prize:e.target.value})} />
          
          <div>
            <div style={S.muted}>Start Date</div>
            <input style={S.input} type="date" value={newChal.start_date} onChange={e=>setNewChal({...newChal, start_date:e.target.value})} />
          </div>
          <div>
            <div style={S.muted}>End Date</div>
            <input style={S.input} type="date" value={newChal.end_date} onChange={e=>setNewChal({...newChal, end_date:e.target.value})} />
          </div>
          
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

const Table = ({ S, columns, rows }) => (
  <table style={S.table}><thead><tr>{columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={columns.length} style={{...S.td, textAlign:'center'}}>No Data</td></tr> : rows.map((r, i) => <tr key={r.id || i}>{columns.map(c => <td key={c} style={S.td}>{r[c] || "—"}</td>)}</tr>)}</tbody></table>
);
const CollabList = ({ S, notes, newNote, setNewNote, addFunc }) => (
  <div style={S.card}><h2 style={S.h2}>Collaboration</h2><div style={{display:'flex', gap:10, marginBottom:10}}><input style={S.input} value={newNote} onChange={e=>setNewNote(e.target.value)} /><button style={S.btnPrimary} onClick={addFunc}>Add</button></div>{notes.map(n=><div key={n.id} style={{borderBottom:'1px solid #eee', padding:5}}><b>{n.who}</b>: {n.note}</div>)}</div>
);