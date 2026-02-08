// src/AccommodationProvider.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ==========================================================
   ✅ Worker API base (Vite)
   Supports:
   - VITE_API_URL=https://example.workers.dev
   - VITE_API_URL=example.workers.dev   (auto-prefixes https://)
========================================================== */

const normalizeApiBase = (raw) => {
  const v = String(raw || "").trim();
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return withProto.replace(/\/+$/, "");
};

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export default function AccommodationProvider({ fetchAPI, user, activeTab, S }) {
  // If a parent passes fetchAPI, we use it. Otherwise we create a Worker-connected one.
  const localFetchAPI = useCallback(
    async (path, method = "GET", body) => {
      if (!API_BASE) {
        console.error("Missing VITE_API_URL. Set it in your .env (restart dev server).");
        return null;
      }

      const url = `${API_BASE}${String(path || "").startsWith("/") ? "" : "/"}${path}`;

      // Optional auth header (works if you pass a Supabase session/token in `user.access_token`)
      const token = user?.access_token || user?.token || null;

      try {
        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(method !== "GET" && method !== "HEAD" ? { body: JSON.stringify(body ?? {}) } : {}),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error(`API ${method} ${path} failed:`, res.status, text);
          return null;
        }

        // Some endpoints may return empty 204
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return await res.text();
        return await res.json();
      } catch (e) {
        console.error(`API ${method} ${path} error:`, e);
        return null;
      }
    },
    [user]
  );

  const callAPI = fetchAPI || localFetchAPI;

  // --- STATE ---
  const [bookings, setBookings] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);

  // --- FORM STATE ---
  const [newAcc, setNewAcc] = useState({
    title: "", propertyType: "Apartment", roomType: "Entire Place", description: "", neighborhoodOverview: "", style: "", 
    country: "", city: "", neighborhood: "", address: "", parking: "Free Parking", mapUrl: "",
    maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    wifi: false, ac: false, kitchen: false, tv: false, pool: false, washer: false, firstAid: false, smokeDetector: false,
    checkInTime: "15:00", checkOutTime: "11:00", smoking: false, pets: false, events: false,
    price: "", cleaningFee: "", currency: "USD", minStay: 1, cancellation: "Flexible", 
    coverPhoto: "",
    whatsappContact: "",
    galleryPhotos: "" // <--- NEW: State for gallery input
  });

  const [calendarFilter, setCalendarFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'calendar'

  // --- LOAD DATA ---
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [bk, acc, rev, adv, plans] = await Promise.all([
        callAPI("/accommodationprovider_bookings"),
        callAPI("/accommodationprovider_listings"),
        callAPI("/accommodationprovider_reviews"),
        callAPI("/entity_ai_advice?category=accommodation"),
        callAPI("/entity_ai_advice?category=action_plan_acc"),
      ]);
      if (bk) setBookings(bk);
      if (acc) setAccommodations(acc);
      if (rev) setReviews(rev);
      if (adv) setAdvice(adv);
      if (plans) setActionPlans(plans);
    };
    load();
  }, [callAPI, user]);

  const accommodationById = useMemo(() => {
    const map = new Map();
    accommodations.forEach((a) => {
      if (a?.id) map.set(a.id, a);
    });
    return map;
  }, [accommodations]);

  const bookingRows = useMemo(() => {
    return bookings.map((b) => {
      const listing =
        accommodationById.get(b.listing_id) ||
        accommodationById.get(b.accommodation_id) ||
        accommodationById.get(b.listingId) ||
        null;

      const checkIn = b.check_in || b.check_in_date || b.start_date || "";
      const checkOut = b.check_out || b.check_out_date || b.end_date || "";

      return {
        id: b.id,
        guest: b.guest_name || b.guest || "Guest",
        type: b.booking_type || b.type || "Short-term",
        checkIn,
        checkOut,
        status: b.status || (b.confirmed === false ? "Pending" : "Confirmed"),
        accommodation: b.accommodation_name || listing?.title || "Listing",
        check_in: checkIn,
        check_out: checkOut,
      };
    });
  }, [bookings, accommodationById]);

  // --- DERIVED STATE ---
  const analytics = useMemo(() => {
    const confirmed = bookingRows.filter((b) => b.status === "Confirmed").length;
    const pending = bookingRows.filter((b) => b.status === "Pending").length;
    return {
      confirmed,
      pending,
      occupancyHint: Math.min(98, 55 + confirmed * 9),
      avgRating: 4.7,
      topListing: accommodations[0]?.title || "N/A",
    };
  }, [bookingRows, accommodations]);

  const calendarRows = useMemo(() => {
    const rows = bookingRows
      .filter((b) => b.type === "Short-term" || !b.type)
      .map((b) => ({
        id: b.id,
        guest: b.guest,
        range: `${b.checkIn} -> ${b.checkOut}`,
        check_in: b.checkIn,
        check_out: b.checkOut,
        status: b.status,
        bucket: b.status === "Pending" ? "Potential Guests" : "Current/Upcoming Guests",
        accommodation: b.accommodation || "Unknown Unit",
      }));
    if (calendarFilter === "Potential Guests") return rows.filter((r) => r.bucket === "Potential Guests");
    if (calendarFilter === "Current/Upcoming Guests") return rows.filter((r) => r.bucket === "Current/Upcoming Guests");
    return rows;
  }, [bookingRows, calendarFilter]);

  // --- ACTIONS ---
  const handleAddAccommodation = async () => {
    const title = (newAcc.title || "").trim();
    const priceNum = Number(String(newAcc.price || "").replace(/[^\d.]/g, ""));
    const cleaningNum = Number(String(newAcc.cleaningFee || "0").replace(/[^\d.]/g, ""));
    
    if (!title || !priceNum) {
      alert("Please enter at least a Title and a Nightly Rate.");
      return;
    }

    // --- NEW: Parse gallery text to array ---
    const galleryArr = String(newAcc.galleryPhotos || "")
      .split(/[\n,]+/g)          // split by new line OR comma
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      entity_id: user.id,
      title: title,
      property_type: newAcc.propertyType,
      room_type: newAcc.roomType,
      description: newAcc.description,
      neighborhood_overview: newAcc.neighborhoodOverview,
      house_style: newAcc.style,
      country: newAcc.country,
      city: newAcc.city,
      neighborhood: newAcc.neighborhood,
      address: newAcc.address,
      parking_type: newAcc.parking,
      map_url: newAcc.mapUrl,
      max_guests: Number(newAcc.maxGuests),
      bedrooms: Number(newAcc.bedrooms),
      beds: Number(newAcc.beds),
      bathrooms: Number(newAcc.bathrooms),
      wifi: newAcc.wifi,
      ac: newAcc.ac,
      kitchen: newAcc.kitchen,
      tv: newAcc.tv,
      pool: newAcc.pool,
      washer: newAcc.washer,
      first_aid: newAcc.firstAid,
      smoke_detector: newAcc.smokeDetector,
      check_in_time: newAcc.checkInTime,
      check_out_time: newAcc.checkOutTime,
      smoking_allowed: newAcc.smoking,
      pets_allowed: newAcc.pets,
      events_allowed: newAcc.events,
      price_night: priceNum,
      cleaning_fee: cleaningNum,
      currency: newAcc.currency,
      min_stay: Number(newAcc.minStay),
      cancellation_policy: newAcc.cancellation,
      cover_photo: newAcc.coverPhoto,
      contact_whatsapp: newAcc.whatsappContact,
      gallery_photos: galleryArr.length ? galleryArr : null, // <--- NEW: Send array to DB
      active: true
    };

    const res = await callAPI("/accommodationprovider_listings", "POST", payload);
    if (res) {
      setAccommodations((prev) => [res, ...prev]);
      setNewAcc({
        title: "", propertyType: "Apartment", roomType: "Entire Place", description: "", neighborhoodOverview: "", style: "",
        country: "", city: "", neighborhood: "", address: "", parking: "Free Parking", mapUrl: "",
        maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
        wifi: false, ac: false, kitchen: false, tv: false, pool: false, washer: false, firstAid: false, smokeDetector: false,
        checkInTime: "15:00", checkOutTime: "11:00", smoking: false, pets: false, events: false,
        price: "", cleaningFee: "", currency: "USD", minStay: 1, cancellation: "Flexible", 
        coverPhoto: "",
        whatsappContact: "",
        galleryPhotos: "" // <--- NEW: Reset
      });
      alert("Property Added Successfully!");
    }
  };

  const updateField = (field, value) => {
    setNewAcc(prev => ({ ...prev, [field]: value }));
  };

  // --- RENDERERS ---

  if (activeTab === "Bookings") {
    return (
      <>
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><h2 style={S.h2}>Bookings</h2><div style={S.muted}>Live data from DB.</div></div>
            <div style={S.pill}>Confirmed: {analytics.confirmed} • Pending: {analytics.pending}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Table
              S={S}
              columns={["guest", "type", "checkIn", "checkOut", "status", "accommodation"]}
              rows={bookingRows}
            />
          </div>
        </div>

        <div style={S.card}>
          <h2 style={{...S.h2, fontSize: 18, borderBottom:'1px solid #eee', paddingBottom:15, marginBottom: 25}}>
            Add New Property
          </h2>
          
          <SectionHeader title="Basic Details" S={S} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 32 }}>
            <InputGroup label="Listing Title" value={newAcc.title} onChange={v=>updateField('title', v)} S={S} />
            <SelectGroup label="Property Type" value={newAcc.propertyType} onChange={v=>updateField('propertyType', v)} options={["Apartment","House","Villa","Guesthouse","Hotel"]} S={S} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 32 }}>
            <SelectGroup label="Room Type" value={newAcc.roomType} onChange={v=>updateField('roomType', v)} options={["Entire Place","Private Room","Shared Room"]} S={S} />
            <InputGroup label="House Style (Optional)" placeholder="e.g. Modern, Colonial" value={newAcc.style} onChange={v=>updateField('style', v)} S={S} />
          </div>
          <div style={{ marginBottom: 32 }}>
             <div style={{...S.muted, marginBottom: 8}}>Description</div>
             <textarea 
               style={{...S.input, height: 110, resize:'vertical', fontFamily:'inherit', lineHeight: '1.5'}} 
               value={newAcc.description} 
               onChange={(e) => updateField('description', e.target.value)} 
               placeholder="Tell guests what makes your place unique..."
             />
          </div>

          <div style={{ marginBottom: 32 }}>
            <InputGroup
              label="WhatsApp Contact"
              placeholder="+1 246 555 1234"
              value={newAcc.whatsappContact}
              onChange={v=>updateField('whatsappContact', v)}
              S={S}
            />
          </div>

          <SectionHeader title="Location" S={S} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30, marginBottom: 32 }}>
            <InputGroup label="Country" value={newAcc.country} onChange={v=>updateField('country', v)} S={S} />
            <InputGroup label="City" value={newAcc.city} onChange={v=>updateField('city', v)} S={S} />
            <InputGroup label="Neighborhood" value={newAcc.neighborhood} onChange={v=>updateField('neighborhood', v)} S={S} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 30, marginBottom: 32 }}>
            <InputGroup label="Address (Hidden pre-booking)" value={newAcc.address} onChange={v=>updateField('address', v)} S={S} />
            <SelectGroup label="Parking" value={newAcc.parking} onChange={v=>updateField('parking', v)} options={["Free Parking","Paid Parking","Street Parking","No Parking"]} S={S} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <InputGroup 
              label="Google Maps Link (Share Link or Embed URL)" 
              placeholder="e.g. https://maps.app.goo.gl/..." 
              value={newAcc.mapUrl} 
              onChange={v=>updateField('mapUrl', v)} 
              S={S} 
            />
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
              Go to Google Maps → Share → Copy Link
            </div>
          </div>

          <SectionHeader title="Capacity & Layout" S={S} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 30, marginBottom: 32 }}>
            <InputGroup label="Max Guests" type="number" value={newAcc.maxGuests} onChange={v=>updateField('maxGuests', v)} S={S} />
            <InputGroup label="Bedrooms" type="number" value={newAcc.bedrooms} onChange={v=>updateField('bedrooms', v)} S={S} />
            <InputGroup label="Beds" type="number" value={newAcc.beds} onChange={v=>updateField('beds', v)} S={S} />
            <InputGroup label="Bathrooms" type="number" value={newAcc.bathrooms} onChange={v=>updateField('bathrooms', v)} S={S} />
          </div>

          <SectionHeader title="Amenities" S={S} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
            <Checkbox label="Wi-Fi" checked={newAcc.wifi} onChange={v=>updateField('wifi', v)} />
            <Checkbox label="A/C" checked={newAcc.ac} onChange={v=>updateField('ac', v)} />
            <Checkbox label="Kitchen" checked={newAcc.kitchen} onChange={v=>updateField('kitchen', v)} />
            <Checkbox label="TV" checked={newAcc.tv} onChange={v=>updateField('tv', v)} />
            <Checkbox label="Pool" checked={newAcc.pool} onChange={v=>updateField('pool', v)} />
            <Checkbox label="Washer" checked={newAcc.washer} onChange={v=>updateField('washer', v)} />
            <Checkbox label="First Aid" checked={newAcc.firstAid} onChange={v=>updateField('firstAid', v)} />
            <Checkbox label="Smoke Detector" checked={newAcc.smokeDetector} onChange={v=>updateField('smokeDetector', v)} />
          </div>

          <SectionHeader title="House Rules" S={S} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 32 }}>
            <InputGroup label="Check-in Time" type="time" value={newAcc.checkInTime} onChange={v=>updateField('checkInTime', v)} S={S} />
            <InputGroup label="Check-out Time" type="time" value={newAcc.checkOutTime} onChange={v=>updateField('checkOutTime', v)} S={S} />
          </div>
          <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
            <Checkbox label="Smoking Allowed" checked={newAcc.smoking} onChange={v=>updateField('smoking', v)} />
            <Checkbox label="Pets Allowed" checked={newAcc.pets} onChange={v=>updateField('pets', v)} />
            <Checkbox label="Events Allowed" checked={newAcc.events} onChange={v=>updateField('events', v)} />
          </div>

          <SectionHeader title="Pricing" S={S} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30, marginBottom: 32 }}>
            <InputGroup label="Nightly Rate" placeholder="$0.00" value={newAcc.price} onChange={v=>updateField('price', v)} S={S} />
            <InputGroup label="Cleaning Fee" placeholder="$0.00" value={newAcc.cleaningFee} onChange={v=>updateField('cleaningFee', v)} S={S} />
            <SelectGroup label="Currency" value={newAcc.currency} onChange={v=>updateField('currency', v)} options={["USD","BBD", "EUR", "GBP"]} S={S} />
          </div>

          <SectionHeader title="Photos" S={S} />
          <div style={{marginBottom: 40}}>
            <InputGroup label="Cover Photo URL" placeholder="https://..." value={newAcc.coverPhoto} onChange={v=>updateField('coverPhoto', v)} S={S} />
            
            {/* --- NEW: Gallery Input --- */}
            <div style={{ marginTop: 20 }}>
              <div style={{...S.muted, marginBottom: 8}}>Gallery Photo URLs (comma or new line separated)</div>
              <textarea 
                style={{...S.input, height: 110, resize:'vertical', fontFamily:'inherit', lineHeight: '1.5'}} 
                value={newAcc.galleryPhotos} 
                onChange={(e) => updateField('galleryPhotos', e.target.value)} 
                placeholder={"https://image1.jpg\nhttps://image2.jpg"}
              />
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", borderTop:'1px solid #eee', paddingTop: 25 }}>
            <button style={{...S.btnPrimary, fontSize: 14, padding: "14px 36px"}} onClick={handleAddAccommodation}>
              Publish Listing
            </button>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Your Listings</h2>
          <Table 
            S={S} 
            // --- NEW: Added 'photos' column
            columns={["title", "property_type", "beds", "price", "photos", "active"]} 
            rows={accommodations.map((a) => ({
              ...a, 
              title: a.title || "Untitled",
              property_type: a.property_type || "N/A",
              price: a.price_night ? `$${a.price_night}/night` : "N/A", 
              // --- NEW: Calculate array length
              photos: Array.isArray(a.gallery_photos) ? `${a.gallery_photos.length} photos` : "—",
              active: a.active ? "Active" : "Inactive" 
            }))} 
          />
        </div>
      </>
    );
  }

  // --- RESTORED TABS + NEW CALENDAR FEATURE ---
  if (activeTab === "Calendar") {
    return (
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <h2 style={S.h2}>Calendar</h2>
          
          <div style={{display:'flex', gap: 12}}>
            {/* View Switcher */}
            <div style={{display:'flex', background: '#f1f5f9', borderRadius: 10, padding: 3}}>
              <button 
                onClick={() => setViewMode("table")}
                style={{
                  border:'none', borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  background: viewMode === "table" ? "#fff" : "transparent",
                  color: viewMode === "table" ? "#0f172a" : "#64748b",
                  boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Table
              </button>
              <button 
                onClick={() => setViewMode("calendar")}
                style={{
                  border:'none', borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  background: viewMode === "calendar" ? "#fff" : "transparent",
                  color: viewMode === "calendar" ? "#0f172a" : "#64748b",
                  boxShadow: viewMode === "calendar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Calendar
              </button>
            </div>

            {/* Filters */}
            <div style={S.row}>
              {["All", "Potential Guests", "Current/Upcoming Guests"].map(f => (
                <button key={f} style={calendarFilter === f ? S.btnPrimary : S.btn} onClick={() => setCalendarFilter(f)}>{f === "All" ? "All" : f.split(' ')[0]}</button>
              ))}
            </div>
          </div>
        </div>

        {viewMode === "table" ? (
          <Table S={S} columns={["bucket", "guest", "range", "status", "accommodation"]} rows={calendarRows} />
        ) : (
          <CalendarGrid bookings={calendarRows} S={S} />
        )}
      </div>
    );
  }

  if (activeTab === "Reviews") {
    return (
      <div style={S.card}>
        <h2 style={S.h2}>Reviews</h2>
        {reviews.length === 0 && <div style={S.muted}>No Data</div>}
        {reviews.map(r => (
          <div key={r.id} style={{border:'1px solid #e5e7eb', padding:10, marginBottom:10, borderRadius:8}}>
            <b>{r.reviewer_name}</b>: {r.text}
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === "Advice (AI)") return <AdviceList S={S} advice={advice} />;
  if (activeTab === "Action Plans") return <AdviceList S={S} advice={actionPlans} title="Action Plans" />;

  if (activeTab === "Analytics") {
    return (
      <div style={S.card}>
        <h2 style={S.h2}>Analytics</h2>
        <div style={{ marginTop: 12, ...S.grid3 }}>
          <StatCard S={S} title="Occupancy Hint" value={`${analytics.occupancyHint}%`} />
          <StatCard S={S} title="Avg rating" value={analytics.avgRating} />
          <StatCard S={S} title="Top Listing" value={analytics.topListing} />
        </div>
      </div>
    );
  }

  return null;
}

// --- SUB-COMPONENT: CALENDAR GRID (MYTRIP STYLE) ---
const CalendarGrid = ({ bookings, S }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells = [];
  
  // 1. Empty slots for previous month (Fillers)
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} style={{ background: 'transparent' }}></div>);
  }

  // 2. Actual Days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Find bookings for this day
    const dayBookings = bookings.filter(b => dateStr >= b.check_in && dateStr <= b.check_out);
    
    // Determine visuals
    const hasBooking = dayBookings.length > 0;

    cells.push(
      <div key={day} style={{
        minHeight: 100, // Taller for guest info
        border: hasBooking ? "1px solid #c4b5fd" : "1px solid #e5e7eb", // Purple border if booked
        borderRadius: 8, 
        padding: 8,
        background: hasBooking ? "#f3e8ff" : "#f8fafc", // Purple tint if booked (like MyTrip)
        display: "flex", 
        flexDirection: "column", 
        gap: 4,
        position: 'relative'
      }}>
        {/* Day Number */}
        <div style={{ 
          fontSize: 12, 
          fontWeight: 700, 
          color: hasBooking ? "#6b21a8" : "#64748b",
          marginBottom: 4
        }}>
          {day}
        </div>

        {/* Guest Chips (Pills) */}
        {dayBookings.map((b, idx) => (
          <div key={`${b.id}-${idx}`} style={{
            fontSize: 10, 
            background: b.status === 'Confirmed' ? '#ffffff' : '#fef9c3', // White pill on purple bg
            color: b.status === 'Confirmed' ? '#4c1d95' : '#854d0e',
            border: b.status === 'Confirmed' ? '1px solid #d8b4fe' : '1px solid #fde047',
            padding: '2px 6px', 
            borderRadius: 4, 
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }} title={`${b.guest} (${b.status})`}>
            {b.guest}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 15 }}>
      {/* Header (Like MyTrip) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <button onClick={handlePrev} style={{...S.btn, padding: "6px 12px"}}>←</button>
        <div style={{ fontWeight: "800", fontSize: 16, color: "#4b5563" }}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={handleNext} style={{...S.btn, padding: "6px 12px"}}>→</button>
      </div>

      {/* Weekdays Row */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(7, 1fr)", 
        textAlign: "center", 
        fontSize: 11, 
        fontWeight: "800", 
        color: "#9ca3af", 
        marginBottom: 10, 
        textTransform: 'uppercase',
        gap: 6 // Match cell gap
      }}>
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      {/* Days Grid (MyTrip Style: gap 6, clean layout) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {cells}
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const SectionHeader = ({ title, S }) => (
  <div style={{ color: "#0f172a", fontWeight: "800", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 35, marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
    {title}
  </div>
);

const InputGroup = ({ label, value, onChange, placeholder, type="text", S }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={S.muted}>{label}</div>
    <input 
      style={S.input} 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder} 
    />
  </div>
);

const SelectGroup = ({ label, value, onChange, options, S }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={S.muted}>{label}</div>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      style={{ ...S.select, width: "100%" }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#334155", padding: "6px 0" }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

const Table = ({ S, columns, rows }) => (
  <table style={S.table}><thead><tr>{columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={columns.length} style={{...S.td, textAlign:'center'}}>No Data</td></tr> : rows.map((r, i) => <tr key={r.id || i}>{columns.map(c => <td key={c} style={S.td}>{r[c] || "—"}</td>)}</tr>)}</tbody></table>
);
const StatCard = ({ S, title, value }) => <div style={S.card}><div style={S.muted}>{title}</div><div style={{ fontSize: 20, fontWeight: 1000, marginTop: 6 }}>{value}</div></div>;
const AdviceList = ({ S, advice, title="AI Advice" }) => <div style={S.card}><h2 style={S.h2}>{title}</h2>{advice.length===0 && <div style={S.muted}>No Data</div>}{advice.map(a=><div key={a.id} style={{border:'1px solid #e5e7eb', padding:10, marginBottom:10, borderRadius:8}}><b>{a.title}</b><p style={{margin:0}}>{a.text}</p></div>)}</div>;
