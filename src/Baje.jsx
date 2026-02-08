import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import sanitizeHtml from 'sanitize-html';
import './Baje.css';
import './tailwind.css';
import ChatBarTourism from './ChatBarTourism'; // tourism sidebar
import WhatsappPopUp from './WhatsappPopup';
import VariableProximity from '../components/VariableProximity';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUmbrellaBeach, faWaveSquare } from '@fortawesome/free-solid-svg-icons';
import { Umbrella, Waves, Bell, Menu, X, MapPin, Eye, Wifi, Wind, Coffee, Tv, Check } from 'lucide-react';

// --- COMPONENT: Hotel Details Modal ---
const HotelDetailsModal = ({ hotel, onClose }) => {
  if (!hotel) return null;

  // Helper to check boolean amenities from DB or CSV string
  const has = (key) => {
    if (hotel[key] === true || hotel[key] === 'true') return true;
    if (typeof hotel.amenities === 'string' && hotel.amenities.toLowerCase().includes(key)) return true;
    if (Array.isArray(hotel.amenities) && hotel.amenities.includes(key)) return true;
    return false;
  };


// ✅ Gallery (accommodations): supports DB array `gallery_photos` OR CSV/newline string
const [isGalleryOpen, setIsGalleryOpen] = useState(false);
const getHotelGallery = () => {
  const g =
    hotel.gallery_photos ??
    hotel.galleryPhotos ??
    hotel.gallery_images ??
    hotel.gallery ??
    null;
  if (!g) return [];
  if (Array.isArray(g)) return g.filter(Boolean);
  if (typeof g === 'string') return g.split(/[\n,]+/g).map((s) => s.trim()).filter(Boolean);
  return [];
};
const hotelGallery = getHotelGallery();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'fade-in 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white', width: '90%', maxWidth: '600px', maxHeight: '85vh', borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        position: 'relative', animation: 'slide-up 0.3s ease-out'
      }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white', borderRadius: '50%', padding: '6px', border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px'
        }}>
          <X size={20} />
        </button>

        {/* Header Image */}
        <div style={{ height: '220px', backgroundColor: '#e2e8f0', width: '100%', position: 'relative' }}>
          {hotel.cover_photo ? (
            <img src={hotel.cover_photo} alt={hotel.title || hotel.name || 'Accommodation'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <span>No cover photo available</span>
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '16px', paddingTop: '48px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
          }}>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{hotel.title || hotel.name || 'Accommodation'}</h2>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
               <MapPin size={14} color="#60a5fa" />
               {hotel.neighborhood || hotel.city || hotel.country || 'Barbados'}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
               💵 {hotel.price_night != null ? `${hotel.price_night} ${hotel.currency || 'USD'} / night` : (hotel.priceRange || 'Contact for price')}
            </span>
            <span style={{ backgroundColor: '#fefce8', color: '#a16207', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
               ⭐ {hotel.review_count > 0 ? `${hotel.rating_overall} (${hotel.review_count})` : (hotel.rating || 'New')}
            </span>
          </div>

          {/* Description */}
          {hotel.description && (
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>About this place</h3>
              <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                {hotel.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Amenities</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: '#475569' }}>
               {has('wifi') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Wifi size={14} color="#94a3b8"/> Wifi</div>}
               {has('ac') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Wind size={14} color="#94a3b8"/> A/C</div>}
               {has('pool') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Waves size={14} color="#94a3b8"/> Pool</div>}
               {has('kitchen') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Coffee size={14} color="#94a3b8"/> Kitchen</div>}
               {has('tv') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Tv size={14} color="#94a3b8"/> TV</div>}
               {has('washer') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Check size={14} color="#94a3b8"/> Washer</div>}
               {(has('free_parking') || hotel.parking_type === 'Free Parking') && <div style={{display:'flex', gap:'6px', alignItems:'center'}}><Check size={14} color="#94a3b8"/> Free Parking</div>}
            </div>
          </div>

{/* ✅ Gallery dropdown */}
{hotelGallery.length > 0 && (
  <div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsGalleryOpen((v) => !v);
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        cursor: 'pointer',
        fontWeight: 700,
        color: '#334155',
      }}
    >
      <span>Gallery photos</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
        {hotelGallery.length} {hotelGallery.length === 1 ? 'photo' : 'photos'} {isGalleryOpen ? '▲' : '▼'}
      </span>
    </button>

    {isGalleryOpen && (
      <div
        style={{
          marginTop: 10,
          padding: 12,
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          background: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          {hotelGallery.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: '0 0 auto',
                width: 150,
                height: 105,
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
              }}
              title="Open full image"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={url}
                alt={`Gallery ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
)}



{/* Full details */}
<div style={{ marginTop: 14 }}>
  <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
    Full details
  </h3>

  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
    {[
      { l: 'Title', v: hotel.title || hotel.name },
      { l: 'Property type', v: hotel.property_type },
      { l: 'Room type', v: hotel.room_type },
      { l: 'House style', v: hotel.house_style },
      { l: 'Max guests', v: hotel.max_guests },
      { l: 'Bedrooms', v: hotel.bedrooms },
      { l: 'Beds', v: hotel.beds },
      { l: 'Bathrooms', v: hotel.bathrooms },
      { l: 'Floor level', v: hotel.floor_level },
      { l: 'Size (sqm)', v: hotel.size_sqm },

      { l: 'Country', v: hotel.country },
      { l: 'State/Province', v: hotel.state_province },
      { l: 'City', v: hotel.city },
      { l: 'Neighborhood', v: hotel.neighborhood },
      { l: 'Address', v: hotel.address },
      { l: 'Latitude', v: hotel.latitude },
      { l: 'Longitude', v: hotel.longitude },
      { l: 'Map URL', v: hotel.map_url },

      { l: 'Parking', v: hotel.parking_type },
      { l: 'Check-in time', v: hotel.check_in_time },
      { l: 'Check-out time', v: hotel.check_out_time },

      { l: 'Self check-in', v: hotel.self_check_in != null ? (hotel.self_check_in ? 'Yes' : 'No') : null },
      { l: 'Smoking allowed', v: hotel.smoking_allowed != null ? (hotel.smoking_allowed ? 'Yes' : 'No') : null },
      { l: 'Pets allowed', v: hotel.pets_allowed != null ? (hotel.pets_allowed ? 'Yes' : 'No') : null },
      { l: 'Events allowed', v: hotel.events_allowed != null ? (hotel.events_allowed ? 'Yes' : 'No') : null },
      { l: 'Quiet hours', v: hotel.quiet_hours },

      { l: 'Price / night', v: hotel.price_night != null ? `${hotel.price_night} ${hotel.currency || 'USD'}` : null },
      { l: 'Cleaning fee', v: hotel.cleaning_fee != null ? `${hotel.cleaning_fee} ${hotel.currency || 'USD'}` : null },
      { l: 'Security deposit', v: hotel.security_deposit != null ? `${hotel.security_deposit} ${hotel.currency || 'USD'}` : null },
      { l: 'Weekly discount (%)', v: hotel.weekly_discount_percent },
      { l: 'Monthly discount (%)', v: hotel.monthly_discount_percent },
      { l: 'Min stay (nights)', v: hotel.min_stay },
      { l: 'Max stay (nights)', v: hotel.max_stay },
      { l: 'Cancellation policy', v: hotel.cancellation_policy },
      { l: 'Instant book', v: hotel.instant_book != null ? (hotel.instant_book ? 'Yes' : 'No') : null },

      { l: 'Rating overall', v: hotel.rating_overall },
      { l: 'Review count', v: hotel.review_count },
    ]
      .filter((i) => i.v !== undefined && i.v !== null && String(i.v).trim() !== '')
      .map((i, idx) => (
        <div key={idx}>
          <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{i.l}</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155', wordBreak: 'break-word' }}>{String(i.v)}</span>
        </div>
      ))}
  </div>

  {Array.isArray(hotel.other_amenities) && hotel.other_amenities.length > 0 && (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
        Other amenities
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {hotel.other_amenities.map((a, i) => (
          <span key={i} style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px' }}>
            {String(a)}
          </span>
        ))}
      </div>
    </div>
  )}
</div>
        </div>
        
        {/* Footer */}
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
           <button onClick={onClose} style={{
             padding: '8px 20px', backgroundColor: '#1e293b', color: 'white', borderRadius: '999px', border: 'none',
             fontWeight: 500, cursor: 'pointer', fontSize: '13px'
           }}>Close Details</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: Activity Details Modal ---
const ActivityDetailsModal = ({ activity, onClose }) => {
  if (!activity) return null;

  // Helper to render list items safely
  const renderList = (items, label, icon) => {
    if (!items || items.length === 0) return null;
    const list = Array.isArray(items) ? items : items.split(','); // Handle Array or CSV
    return (
      <div style={{ marginTop: '12px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display:'flex', alignItems:'center', gap:'6px' }}>
          {icon} {label}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {list.map((item, i) => (
             <span key={i} style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px' }}>
               {item.trim()}
             </span>
          ))}
        </div>
      </div>
    );
  };


// ✅ Gallery (activities): supports DB array `gallery_image_urls` OR CSV/newline string
const [isGalleryOpen, setIsGalleryOpen] = useState(false);
const getActivityGallery = () => {
  const g =
    activity.gallery_image_urls ??
    activity.gallery_photos ??
    activity.galleryPhotos ??
    activity.gallery_images ??
    activity.gallery ??
    null;
  if (!g) return [];
  if (Array.isArray(g)) return g.filter(Boolean);
  if (typeof g === 'string') return g.split(/[\n,]+/g).map((s) => s.trim()).filter(Boolean);
  return [];
};
const activityGallery = getActivityGallery();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'fade-in 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white', width: '90%', maxWidth: '550px', maxHeight: '85vh', borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        position: 'relative', animation: 'slide-up 0.3s ease-out'
      }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white', borderRadius: '50%', padding: '6px', border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px'
        }}>
          <X size={20} />
        </button>

        {/* Header Image */}
        <div style={{ height: '200px', backgroundColor: '#e2e8f0', width: '100%', position: 'relative' }}>
          {activity.cover_image_url ? (
            <img src={activity.cover_image_url} alt={activity.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column' }}>
              <Waves size={40} opacity={0.5} />
              <span style={{fontSize:'12px', marginTop:5}}>No image available</span>
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '16px', paddingTop: '48px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
          }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {activity.title || activity.name}
            </h2>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
               <MapPin size={13} color="#60a5fa" />
               {activity.meeting_point_text || "Barbados"}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
               💵 {activity.base_price ? `${activity.base_price} ${activity.price_currency}` : 'Free/Varies'}
            </span>
            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
               ⏱️ {activity.duration_text || `${activity.duration_minutes || 0} mins`}
            </span>
             <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
               📊 {activity.difficulty || 'All Levels'}
            </span>
          </div>

          {/* Description */}
          <div style={{ marginTop: '12px' }}>
            <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {activity.short_description || "No description provided."}
            </p>
          </div>

          


          {/* Full details */}
          <div style={{ marginTop: 14 }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Full details
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { l: 'Title', v: activity.title || activity.name },
                { l: 'Category', v: activity.category },
                { l: 'Duration', v: activity.duration_text || (activity.duration_minutes ? `${activity.duration_minutes} mins` : null) },
                { l: 'Difficulty', v: activity.difficulty },
                { l: 'Price', v: activity.base_price != null ? `${activity.base_price} ${activity.price_currency || 'USD'}` : null },
                { l: 'Max participants', v: activity.max_participants },
                { l: 'Min participants', v: activity.min_participants },
                { l: 'Min age', v: activity.min_age },
                { l: 'Max age', v: activity.max_age },
                { l: 'Age restrictions', v: activity.age_restrictions },

                { l: 'Meeting point', v: activity.meeting_point_text },
                { l: 'Meeting address', v: activity.meeting_point_address },
                { l: 'Google Maps URL', v: activity.meeting_point_google_maps_url },
                { l: 'Parking info', v: activity.parking_info },
                { l: 'Pickup available', v: activity.pickup_available != null ? (activity.pickup_available ? 'Yes' : 'No') : null },
                { l: 'Accessibility notes', v: activity.accessibility_notes },

                { l: 'Start time', v: activity.start_time },
                { l: 'End time', v: activity.end_time },

                { l: 'Booking cutoff (hours)', v: activity.booking_cutoff_hours_before },
                { l: 'Instant confirmation', v: activity.instant_confirmation != null ? (activity.instant_confirmation ? 'Yes' : 'No') : null },
                { l: 'Cancellation policy', v: activity.cancellation_policy },
                { l: 'Weather policy', v: activity.weather_policy },
                { l: 'No-show policy', v: activity.no_show_policy },

                { l: 'Required fitness level', v: activity.required_fitness_level },
                { l: 'Health disclaimer', v: activity.health_disclaimer },
                { l: 'Waiver required', v: activity.waiver_required != null ? (activity.waiver_required ? 'Yes' : 'No') : null },

                { l: 'Guide credentials', v: activity.guide_credentials },
                { l: 'Years experience', v: activity.years_experience },
                { l: 'Certifications', v: Array.isArray(activity.certifications) ? activity.certifications.join(', ') : activity.certifications },

                { l: 'Phone', v: activity.contact_phone },
                { l: 'WhatsApp', v: activity.contact_whatsapp },
                { l: 'Email', v: activity.contact_email },

                { l: 'Price currency', v: activity.price_currency },
                { l: 'Price includes tax', v: activity.price_includes_tax != null ? (activity.price_includes_tax ? 'Yes' : 'No') : null },
                { l: 'Service fee', v: activity.service_fee },

                { l: 'Average rating', v: activity.average_rating },
                { l: 'Review count', v: activity.review_count },
              ]
                .filter((i) => i.v !== undefined && i.v !== null && String(i.v).trim() !== '')
                .map((i, idx) => (
                  <div key={idx}>
                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{i.l}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155', wordBreak: 'break-word' }}>{String(i.v)}</span>
                  </div>
                ))}
            </div>

            {activity.extra_inclusions && (
              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Extra inclusions
                </h3>
                <pre style={{ margin: 0, fontSize: 12, background: '#0b1220', color: '#e5e7eb', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
{JSON.stringify(activity.extra_inclusions, null, 2)}
                </pre>
              </div>
            )}

            {activity.preparation_tips && (
              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Preparation tips
                </h3>
                <pre style={{ margin: 0, fontSize: 12, background: '#0b1220', color: '#e5e7eb', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
{JSON.stringify(activity.preparation_tips, null, 2)}
                </pre>
              </div>
            )}

            {activity.metadata && (
              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Metadata
                </h3>
                <pre style={{ margin: 0, fontSize: 12, background: '#0b1220', color: '#e5e7eb', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
{JSON.stringify(activity.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>{/* ✅ Gallery dropdown */}
{activityGallery.length > 0 && (
  <div style={{ marginTop: 14 }}>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsGalleryOpen((v) => !v);
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        cursor: 'pointer',
        fontWeight: 700,
        color: '#334155',
      }}
    >
      <span>Gallery photos</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
        {activityGallery.length} {activityGallery.length === 1 ? 'photo' : 'photos'} {isGalleryOpen ? '▲' : '▼'}
      </span>
    </button>

    {isGalleryOpen && (
      <div
        style={{
          marginTop: 10,
          padding: 12,
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          background: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          {activityGallery.map((url, idx2) => (
            <a
              key={idx2}
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: '0 0 auto',
                width: 150,
                height: 105,
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
              }}
              title="Open full image"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={url}
                alt={`Gallery ${idx2 + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
)}

{/* Details Lists */}
          {renderList(activity.highlights, "Highlights", <Check size={14} />)}
          {renderList(activity.what_to_bring, "What to Bring", <Umbrella size={14} />)}
          {renderList(activity.included_items, "Included", <Coffee size={14} />)}

        </div>
        
        {/* Footer */}
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
           <button onClick={onClose} style={{
             padding: '8px 20px', backgroundColor: '#1e293b', color: 'white', borderRadius: '999px', border: 'none',
             fontWeight: 500, cursor: 'pointer', fontSize: '13px'
           }}>Close Details</button>
        </div>
      </div>
    </div>
  );
};

// Simple Barbados accommodation options for onboarding (Static fallbacks)
const BARBADOS_HOTELS = [
  {
    id: 'o2',
    name: 'O2 Beach Club & Spa',
    priceRange: '$400–$800',
    rating: '4.8',
    description: 'A premium all-inclusive luxury resort located on the South Coast.',
    cover_photo: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/330856128.jpg?k=1092a4729013093282294101168196128919101150116121&o=&hp=1'
  },
  {
    id: 'sandals',
    name: 'Sandals Royal Barbados',
    priceRange: '$500–$900',
    rating: '4.7',
    description: 'Experience the Royal Treatment at this all-suite resort featuring the most innovative suites.',
    cover_photo: 'https://www.sandals.com/blog/content/images/2021/01/Sandals-Royal-Barbados-Pool-Sky.jpg'
  },
  {
    id: 'accra',
    name: 'Accra Beach Hotel & Spa',
    priceRange: '$250–$450',
    rating: '4.3',
    description: 'Accra Beach Hotel & Spa is located on the beautiful South Coast of Barbados.',
    cover_photo: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/29/72/7a/76/accra-beach-hotel-spa.jpg?w=1200&h=-1&s=1'
  },
  {
    id: 'airbnb',
    name: 'South Coast Airbnb Apartment',
    priceRange: '$120–$250',
    rating: '4.6',
    description: 'Cozy local apartments near the best beaches and food spots.',
    cover_photo: 'https://a0.muscache.com/im/pictures/miso/Hosting-53857326/original/52538183-5353-4151-1181-185191919191.jpeg?im_w=720'
  },
];

// Shared Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000", // Fallback for safety
  withCredentials: true,
});

// ✅ HELPER: Robustly find the token (Custom key OR Supabase default)
const getSmartToken = () => {
  // 1. Try explicit 'auth_token' key
  let token = localStorage.getItem('auth_token');
  if (token) return token;

  // 2. Try to find a standard Supabase session in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const sessionStr = localStorage.getItem(key);
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session && session.access_token) {
            return session.access_token;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Error parsing Supabase session from localStorage", e);
  }

  return null;
};

function Baje() {
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fetchingProfileRef = useRef(false);
  const fetchingFactRef = useRef(false);
  const fetchingTipRef = useRef(false);
  const messagesContainerRef = useRef(null);
  const tourismBarRef = useRef(null);
  const tourismButtonRef = useRef(null);
  const agentMenuRef = useRef(null);
  const agentButtonRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [avatarImage, setAvatarImage] = useState(null);

  // Agent picker
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('Main');
  const [agentIcon, setAgentIcon] = useState('🤖');

  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);

  // Fact/Tip UI state
  const [isFactsCardOpen, setIsFactsCardOpen] = useState(false);
  const [isTipCardOpen, setIsTipCardOpen] = useState(false);
  const [fact, setFact] = useState({ questions: '', answers: '' });
  const [currentTip, setCurrentTip] = useState({ id: null, tip_text: '' });

  // ✅ Viewing State for Modals
  const [viewingHotel, setViewingHotel] = useState(null);
  const [viewingActivity, setViewingActivity] = useState(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [usageStartTime, setUsageStartTime] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'Barbados',
    nickname: 'Bajan',
    flagUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Flag_of_Barbados.svg/1200px-Flag_of_Barbados.svg.png',
  });
  const [chatSessionId, setChatSessionId] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const navigate = useNavigate();
  const createdBookingKeysRef = useRef({
    accommodation: new Set(),
    activities: new Set(),
  });

  const TIP_INTERVAL = 1800000; // 30m

  // Tourism sidebar toggle
  const [isTourismBarOpen, setIsTourismBarOpen] = useState(false);

  // Onboarding state for "Planning a Visit"
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
    const [onboardingData, setOnboardingData] = useState({
      budget: '',
      startDate: '',
      endDate: '',
      wantReminder: false,
      stayOption: '',
      stayListingId: null,
      interests: [],
      wantBucket: false,
      selectedActivities: [] // ✅ NEW: Store selected activities
    });
    const [showWhatsappPopup, setShowWhatsappPopup] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // ✅ DB Listings State
  const [dbListings, setDbListings] = useState([]);
  // ✅ DB Activities State
  const [dbActivities, setDbActivities] = useState([]);

  // Per-message VariableProximity toggle for tourism agent
  const [proximityToggles, setProximityToggles] = useState({}); // { [msgId]: boolean }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const TIP_TIMER_KEY = 'tipTimerStart';

  /* ---------------------- Axios CSRF & Auth interceptor ---------------------- */
  useEffect(() => {
    const reqId = api.interceptors.request.use((cfg) => {
      // 1. Attach CSRF Token if available
      if (csrfToken) cfg.headers['X-CSRF-Token'] = csrfToken;
      
      // 2. Attach Auth Token (Using Smart Helper)
      const token = getSmartToken();
      if (token) {
        cfg.headers['Authorization'] = `Bearer ${token}`;
      }

      return cfg;
    });

    const resId = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401) {
          console.warn("401 Unauthorized detected.");
        }
        return Promise.reject(err);
      }
    );
    return () => {
      api.interceptors.request.eject(reqId);
      api.interceptors.response.eject(resId);
    };
  }, [csrfToken, navigate]);

  /* -------------------------- CSRF on mount -------------------------- */
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await api.get('/api/csrf-token');
        setCsrfToken(res.data.csrfToken);
      } catch (err) {
        console.error('Error fetching CSRF token', err);
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: 'Sorry, unable to initialize (CSRF). Please refresh the page.',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    };
    fetchCsrfToken();
  }, []);

  /* ------------------------- Fetch user profile ------------------------- */
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!csrfToken || fetchingProfileRef.current) return;
      fetchingProfileRef.current = true;
      try {
        const res = await api.get('/api/profile');
        setUserId(res.data.id);
        setAvatarImage(res.data.avatarUrl || null);
        setProfileName(res.data.name || res.data.username || res.data.email || '');
      } catch (err) {
        if (err.response?.status === 401) navigate('/login', { replace: true });
      } finally {
        fetchingProfileRef.current = false;
      }
    };
    if (csrfToken) fetchUserProfile();
  }, [csrfToken, navigate]);

  /* ---------------- Fetch Accommodation & Activities (UPDATED) ---------------- */
  useEffect(() => {
    const fetchTourismData = async () => {
      const token = getSmartToken();
      if (!token) return;

      try {
        // 1. Accommodations
        const resAccom = await api.get("/api/listings/public");
        if (resAccom.data && Array.isArray(resAccom.data.data)) {
          setDbListings(resAccom.data.data);
        } else if (Array.isArray(resAccom.data)) {
           setDbListings(resAccom.data);
        }

        // 2. ✅ Activities
        const resAct = await api.get("/api/activities/public");
        if (resAct.data && Array.isArray(resAct.data.data)) {
          setDbActivities(resAct.data.data);
        }

      } catch (err) {
        console.warn('Failed to fetch tourism data:', err);
      }
    };

    fetchTourismData();
  }, [userId]); 

  /* -------------------- Fetch Onboarding Status -------------------- */
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!csrfToken || !userId || !selectedCountry.name) return;

      const token = getSmartToken();
      if (!token) return;

      try {
        const res = await api.get('/api/tourism-onboarding/status', {
          params: { country: selectedCountry.name },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.data.hasCompletedOnboarding) {
          setHasCompletedOnboarding(true);
        }

        if (res.data.onboarding) {
          const dbData = res.data.onboarding;
          setOnboardingData({
            budget: dbData.budget || '',
            startDate: dbData.start_date || '',
            endDate: dbData.end_date || '',
            wantReminder: !!dbData.want_reminder,
            stayOption: dbData.stay_option || '',
            stayListingId: dbData.stayListingId || dbData.stay_listing_id || null,
            interests: Array.isArray(dbData.interests) ? dbData.interests : [],
            wantBucket: !!dbData.want_bucket_list,
            selectedActivities: Array.isArray(dbData.selectedActivities)
              ? dbData.selectedActivities
              : Array.isArray(dbData.selected_activities)
              ? dbData.selected_activities
              : []
          });
        }
      } catch (err) {
        console.error('Error fetching onboarding status:', err);
      }
    };

    fetchOnboardingStatus();
  }, [csrfToken, userId, selectedCountry.name]);

  /* ----------------------- Initialize chat session ----------------------- */
  useEffect(() => {
    if (location.state?.restoredChat) {
      const { id, messages } = location.state.restoredChat;
      setChatSessionId(id);
      setMessages(messages);
    } else {
      const newSessionId = uuidv4();
      setChatSessionId(newSessionId);
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: `Welcome to ${selectedCountry.name}! I'm your ${selectedCountry.nickname} helper! Ask me about beaches, food, history, festivals!`,
          created_at: new Date().toISOString(),
          animated: false,
          isWelcome: true,
        },
      ]);
      saveChat(newSessionId, []);
    }
    setUsageStartTime(Date.now());
  }, [selectedCountry, location.state]);

  /* --------------------------- Notifications --------------------------- */
  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!csrfToken || !userId) return;
      try {
        const res = await api.get('/api/notifications');
        const count = Array.isArray(res.data) ? res.data.length : 0;
        setNotificationCount((prev) => Math.max(prev, count));

        const cached = Number(localStorage.getItem('notificationsCount') || '0');
        if (count > cached) {
          localStorage.setItem('notificationsCount', String(count));
          window.dispatchEvent(new Event('notifications:updated'));
        }
        const lastSeen = Number(localStorage.getItem('lastSeenNotificationCount') || 0);
        setShowNotificationBadge(count > lastSeen);
      } catch (err) {
        console.error('Error fetching notifications', err?.response?.data || err.message);
      }
    };
    fetchNotificationCount();
  }, [csrfToken, userId]);

  useEffect(() => {
    const syncFromStorage = () => {
      const count = Number(localStorage.getItem('notificationsCount') || '0');
      const lastSeen = Number(localStorage.getItem('lastSeenNotificationCount') || '0');
      setNotificationCount((prev) => Math.max(prev, count));
      setShowNotificationBadge(count > lastSeen);
    };
    syncFromStorage();
    const onFocus = () => syncFromStorage();
    const onUpdated = () => syncFromStorage();
    window.addEventListener('notifications:updated', onUpdated);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('notifications:updated', onUpdated);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const sync = async () => {
      const cached = Number(localStorage.getItem('notificationsCount') || '0');
      if (cached > 0) {
        setNotificationCount((prev) => Math.max(prev, cached));
      } else if (csrfToken && userId) {
        try {
          const res = await api.get('/api/notifications');
          const count = Array.isArray(res.data) ? res.data.length : 0;
          setNotificationCount((prev) => Math.max(prev, count));
          localStorage.setItem('notificationsCount', String(count));
          const lastSeen = Number(
            localStorage.getItem('lastSeenNotificationCount') || '0'
          );
          setShowNotificationBadge(count > lastSeen);
        } catch {
          /* no-op */
        }
      }
    };
    sync();

    const onStorage = (e) => {
      if (e.key === 'notificationsCount') {
        const v = Number(e.newValue || '0');
        setNotificationCount((prev) => Math.max(prev, v));
      }
    };
    const onVisibility = () => {
      if (!document.hidden) sync();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [csrfToken, userId]);

  /* ----------------------- Persist chat on change ----------------------- */
  useEffect(() => {
    if (messages.some((m) => m.role === 'user')) {
      saveChat(chatSessionId, messages);
    }
  }, [messages, chatSessionId]);

  /* ------------------------ Tips timer ONLY ------------------------ */
  useEffect(() => {
    const initializeTimer = (key, interval, callback) => {
      const startTime = localStorage.getItem(key);
      const now = Date.now();
      let delay;
      if (startTime) {
        const elapsed = now - parseInt(startTime, 10);
        const timeSinceLast = elapsed % interval;
        delay = timeSinceLast === 0 ? interval : interval - timeSinceLast;
      } else {
        localStorage.setItem(key, now.toString());
        delay = interval;
      }
      const timer = setTimeout(() => {
        callback();
        const intervalId = setInterval(callback, interval);
        return () => clearInterval(intervalId);
      }, delay);
      return () => clearTimeout(timer);
    };

    const fetchTip = async () => {
      if (fetchingTipRef.current || !csrfToken) return;
      fetchingTipRef.current = true;
      try {
        if (!isFactsCardOpen && !isTipCardOpen) {
          const res = await api.get('/api/tips', {
            params: { country: selectedCountry.name },
          });
          setCurrentTip(
            res.data || { id: uuidv4(), tip_text: 'Visit Oistins Fish Fry on Friday nights!' }
          );
          setIsTipCardOpen(true);
          setIsFactsCardOpen(false);
        }
      } catch {
        setCurrentTip({
          id: uuidv4(),
          tip_text: 'Visit Oistins Fish Fry on Friday nights!',
        });
        setIsTipCardOpen(true);
        setIsFactsCardOpen(false);
      } finally {
        fetchingTipRef.current = false;
      }
    };

    if (!isFactsCardOpen && !isTipCardOpen && csrfToken) {
      const tipCleanup = initializeTimer(TIP_TIMER_KEY, TIP_INTERVAL, fetchTip);
      return () => {
        tipCleanup();
      };
    }
  }, [csrfToken, selectedCountry.name, isFactsCardOpen, isTipCardOpen]);

  /* ----------------------------- Scroll down ----------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ----------------------- Save usage on unmount ----------------------- */
  useEffect(() => {
    return () => {
      if (chatSessionId && usageStartTime) {
        const durationSeconds = Math.round((Date.now() - usageStartTime) / 1000);
        saveUsageTime(chatSessionId, durationSeconds);
      }
    };
  }, [chatSessionId, usageStartTime]);

  /* ------------------ Persist Agent Picker across refresh ----------------- */
  useEffect(() => {
    const a = localStorage.getItem('activeAgent');
    const i = localStorage.getItem('agentIcon');
    if (a) setActiveAgent(a);
    if (i) setAgentIcon(i);
  }, []);
  useEffect(() => {
    localStorage.setItem('activeAgent', activeAgent);
    localStorage.setItem('agentIcon', agentIcon);
  }, [activeAgent, agentIcon]);

  /* -------------------- Click-outside to close tourism bar -------------------- */
  useEffect(() => {
    if (!isTourismBarOpen) return;

    const handleClickOutside = (e) => {
      const barEl = tourismBarRef.current;
      const btnEl = tourismButtonRef.current;

      if (barEl && barEl.contains(e.target)) return;
      if (btnEl && btnEl.contains(e.target)) return;

      setIsTourismBarOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isTourismBarOpen]);

  useEffect(() => {
    if (!isAgentMenuOpen) return;

    const handleClickOutside = (e) => {
      const menuEl = agentMenuRef.current;
      const btnEl = agentButtonRef.current;

      if (menuEl && menuEl.contains(e.target)) return;
      if (btnEl && btnEl.contains(e.target)) return;

      setIsAgentMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAgentMenuOpen]);



  /* ----------------------------- API helpers ----------------------------- */
  const saveChat = async (sessionId, chatMessages) => {
    try {
      if (!csrfToken || !userId) return;
      const userMessage = [...chatMessages].reverse().find((m) => m.role === 'user');
      const snippet = userMessage
        ? userMessage.content.slice(0, 100) + '...'
        : 'No user messages';
      await api.post('/api/chat/save', {
        sessionId,
        messages: chatMessages,
        title: `${selectedCountry.name} ${activeAgent} Chat`,
        snippet,
        userId,
      });
    } catch (err) {
      console.error('Error saving chat', err?.response?.data || err.message);
    }
  };

  const saveUsageTime = async (sessionId, durationSeconds) => {
    try {
      if (!csrfToken || !userId) return;
      await api.post('/api/usage', { sessionId, durationSeconds, userId });
    } catch (err) {
      console.error('Error saving usage time', err?.response?.data || err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: `${activeAgent}: ${inputValue}`,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await api.post('/ask', {
        prompt: `${selectedCountry.name} ${activeAgent}: ${userMessage.content.replace(
          /^Main:\s*/,
          ''
        )}`,
        userId,
        countryName: selectedCountry.name,
      });

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        agent: activeAgent, // tag which agent answered
        type: res.data.responseType || 'text',
        title: res.data.title,
        mapEmbedUrl: res.data.mapEmbedUrl,
        content: res.data.response || res.data.text || 'No response',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Error:', err);

      let errorMsg = 'Sorry mon Try again later';
      if (err?.response?.data?.detail) {
        errorMsg = `AI error: ${err.response.data.detail}`;
      } else if (err?.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err?.message) {
        errorMsg = `Network: ${err.message}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: errorMsg,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login', { replace: true });
  };

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const toggleCountryMenu = () => setIsCountryMenuOpen(!isCountryMenuOpen);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Profile', path: '/profile' },
    { name: 'Saved Chats', path: '/saved-chats' },
    { name: 'Settings', path: '/settings' },
    { name: 'Help', path: '/help' },
    {
      name: 'Logout',
      path: '/login',
      onClick: (e) => {
        e.preventDefault();
        handleLogout();
        setIsNavOpen(false);
      },
    },
  ];

  const isTourism = activeAgent === 'Tourism';
  const showTourismBar = isTourism && isTourismBarOpen;

  const handleShowFacts = async () => {
    if (fetchingFactRef.current || !csrfToken) return;
    fetchingFactRef.current = true;
    try {
      const res = await api.get('/api/facts', { params: { country: selectedCountry.name } });
      setFact(
        res.data || { questions: 'What is the capital of Barbados?', answers: 'Bridgetown' }
      );
      setIsFactsCardOpen(true);
      setIsTipCardOpen(false);
    } catch {
      setFact({ questions: 'What is the capital of Barbados?', answers: 'Bridgetown' });
      setIsFactsCardOpen(true);
      setIsTipCardOpen(false);
    } finally {
      fetchingFactRef.current = false;
    }
  };

  // ---------------- Onboarding helpers ("Planning a Visit") ----------------

  const startOnboarding = () => {
    if (isOnboardingActive || hasCompletedOnboarding) return;
    const initialStep = 1;
    setIsOnboardingActive(true);
    setOnboardingStep(initialStep);
    setOnboardingData({
      budget: '',
      startDate: '',
      endDate: '',
      wantReminder: false,
      stayOption: '',
      stayListingId: null,
      interests: [],
      wantBucket: false,
      selectedActivities: [] // Reset selected activities
    });
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        type: 'onboarding',
        step: initialStep,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const goToOnboardingStep = (step) => {
    setOnboardingStep(step);
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        type: 'onboarding',
        step,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handleInterestToggle = (value) => {
    setOnboardingData((prev) => {
      const exists = prev.interests.includes(value);
      const interests = exists
        ? prev.interests.filter((v) => v !== value)
        : [...prev.interests, value];
      return { ...prev, interests };
    });
  };

  // ✅ New helper: Toggle Activity Selection
  const handleActivityToggle = (activityId, activityName) => {
    setOnboardingData((prev) => {
      const currentList = prev.selectedActivities || [];
      const exists = currentList.find((a) => a.id === activityId);

      let newList;
      if (exists) {
        // Remove if exists
        newList = currentList.filter((a) => a.id !== activityId);
      } else {
        // Add if new (date/time chosen in Step 6)
        newList = [
          ...currentList,
          {
            id: activityId,
            name: activityName,
            scheduled_date: "",
            scheduled_time: "",
          },
        ];
      }
      return { ...prev, selectedActivities: newList };
    });
  };

  const createAccommodationBooking = async (listingId, checkIn, checkOut) => {
    if (!listingId || !checkIn || !checkOut) return;
    const token = getSmartToken();
    if (!token) return;
    const guestName = (profileName || '').trim() || 'Guest';
    const key = `${listingId}|${checkIn}|${checkOut}|${guestName}`;
    if (createdBookingKeysRef.current.accommodation.has(key)) return;
    createdBookingKeysRef.current.accommodation.add(key);
    try {
      await api.post(
        "/api/tourism-onboarding/book-accommodation",
        {
          listingId,
          checkIn,
          checkOut,
          guestName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.warn(
        "Failed to create accommodation booking",
        err?.response?.data || err.message || err
      );
    }
  };

  const createActivityBooking = async (activityId, activityDate, activityTime) => {
    if (!activityId || !activityDate || !activityTime) return;
    const token = getSmartToken();
    if (!token) return;
    const guestName = (profileName || '').trim() || 'Guest';
    const key = `${activityId}|${activityDate}|${activityTime}|${guestName}`;
    if (createdBookingKeysRef.current.activities.has(key)) return;
    createdBookingKeysRef.current.activities.add(key);
    try {
      await api.post(
        "/api/tourism-onboarding/book-activity",
        {
          activityId,
          activityDate,
          activityTime,
          guestName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.warn(
        "Failed to create activity booking",
        err?.response?.data || err.message || err
      );
    }
  };

  // ✅ Update scheduled date/time for a selected activity
  const handleActivityScheduleChange = (activityId, key, value) => {
    setOnboardingData((prev) => {
      const nextList = (prev.selectedActivities || []).map((a) =>
        a.id === activityId ? { ...a, [key]: value } : a
      );
      const updated = nextList.find((a) => a.id === activityId);
      if (updated?.scheduled_date && updated?.scheduled_time) {
        createActivityBooking(activityId, updated.scheduled_date, updated.scheduled_time);
      }
      return { ...prev, selectedActivities: nextList };
    });
  };


  const suggestStayOption = () => {
    if (!onboardingData.budget) {
      alert('Pick your budget first so I can suggest something Bajan-nice! 😄');
      return;
    }

    let suggested = BARBADOS_HOTELS[2]; // default

    if (onboardingData.budget === '$200-5000') {
      suggested = BARBADOS_HOTELS[2]; // Accra
    } else if (
      onboardingData.budget === '$6000' ||
      onboardingData.budget === '$10,000'
    ) {
      suggested = BARBADOS_HOTELS[1]; // Sandals
    } else if (onboardingData.budget === 'Other') {
      suggested = BARBADOS_HOTELS[3]; // Airbnb
    }

    setOnboardingData((prev) => ({
      ...prev,
      stayOption: `Suggested: ${suggested.name} (${suggested.priceRange}, ⭐ ${suggested.rating})`,
      stayListingId: null,
    }));
  };

  const finishOnboarding = async (wantBucketList) => {
    // Build an updated snapshot of onboarding data
    const updatedData = {
      ...onboardingData,
      wantBucket: wantBucketList,
    };

    // ✅ Ensure each selected activity has a scheduled_date + scheduled_time
    const ensureScheduledActivities = (list, startDate, endDate) => {
      const arr = Array.isArray(list) ? list : [];

      const parseYMD = (s) => {
        if (!s) return null;
        const parts = String(s).split("-");
        if (parts.length !== 3) return null;
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
        return new Date(y, m, d);
      };

      const start = parseYMD(startDate);
      const end = parseYMD(endDate);

      const pickRandomYMD = () => {
        if (!start || !end || end < start) return "";
        const startMs = start.getTime();
        const endMs = end.getTime();
        const randMs = startMs + Math.floor(Math.random() * (endMs - startMs + 1));
        const dt = new Date(randMs);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const d = String(dt.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const defaultTime = "10:00";

      return arr.map((a) => ({
        ...a,
        name: a.name || a.title || "",
        scheduled_date: a.scheduled_date || pickRandomYMD(),
        scheduled_time: a.scheduled_time || defaultTime,
      }));
    };

    updatedData.selectedActivities = ensureScheduledActivities(
      updatedData.selectedActivities,
      updatedData.startDate,
      updatedData.endDate
    );


    // Update React state
    setOnboardingData(updatedData);
    setIsOnboardingActive(false);
    setHasCompletedOnboarding(true);

    const interestsText =
      updatedData.interests && updatedData.interests.length
        ? updatedData.interests.join(', ')
        : 'Not specified yet';

    // ✅ Generate Activity Text for summary
    const activityText = updatedData.selectedActivities?.length > 0 
        ? updatedData.selectedActivities.map(a => `• ${a.name}${a.scheduled_date ? ` — ${a.scheduled_date}${a.scheduled_time ? ` ${a.scheduled_time}` : ''}` : ''}`).join('\n')
        : (wantBucketList ? '• AI will generate a bucket list for you' : '• No specific activities selected');

    const summaryText = [
      "Sweet! I've saved your trip profile:",
      `• Budget: ${updatedData.budget || 'Not specified'}`,
      `• Dates: ${
        updatedData.startDate && updatedData.endDate
          ? `${updatedData.startDate} → ${updatedData.endDate}`
          : 'Not specified'
      }`,
      `• Encouragement reminders: ${updatedData.wantReminder ? 'Yes' : 'No'}`,
      `• Stay: ${updatedData.stayOption || 'Not decided yet'}`,
      `• Interests: ${interestsText}`,
      "----------------",
      "**Your Activities:**",
      activityText
    ].join('\n');

    // Show summary message in the chat
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        content: summaryText,
        created_at: new Date().toISOString(),
        animated: false,
      },
    ]);

    // Persist onboarding to backend controller
    try {
      if (csrfToken && userId && chatSessionId) {
        
        // ✅ Use Smart Token Helper
        const token = getSmartToken();
        if(!token) {
           console.error("Missing auth token for complete (checked 'auth_token' and 'sb-*')");
           // Optionally prompt login
           return;
        }

        const guestName = (profileName || '').trim() || 'Guest';
        await api.post('/api/tourism-onboarding/complete', {
          sessionId: chatSessionId,
          country: selectedCountry.name,
          budget: updatedData.budget,
          startDate: updatedData.startDate,
          endDate: updatedData.endDate,
          wantReminder: updatedData.wantReminder,
          stayOption: updatedData.stayOption,
          stayListingId: updatedData.stayListingId || null,
          interests: updatedData.interests,
          wantBucket: updatedData.wantBucket,
          selectedActivities: updatedData.selectedActivities, // ✅ Send to backend
          guestName
        }, {
          headers: {
             'Authorization': `Bearer ${token}`
          }
        });

      } else {
        console.warn(
          'Skipping onboarding save – missing csrfToken, userId or chatSessionId',
          {
            csrfTokenPresent: !!csrfToken,
            userId,
            chatSessionId,
          }
        );
      }
    } catch (err) {
      console.error(
        'Error saving onboarding',
        err?.response?.data || err.message || err
      );
    }
  };

  const displayCount = notificationCount > 9 ? '9+' : String(notificationCount);

  // ----------- Message renderer (welcome, onboarding, proximity text) -----------

  const renderMessageContent = (msg, isProximityOn = false) => {
    // Onboarding Q&A cards
    if (msg.type === 'onboarding') {
      const isCurrent = isOnboardingActive && msg.step === onboardingStep;

      const baseCardStyle = {
        background: '#ffffff',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        maxWidth: '100%',
        fontSize: '14px',
        color: '#111827',
        opacity: isCurrent ? 1 : 0.7,
        pointerEvents: isCurrent ? 'auto' : 'none',
      };

      if (msg.step === 1) {
        // Budget card
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Trip Budget</div>
            <p style={{ marginBottom: 8 }}>
              What&apos;s your total budget for this Barbados visit?
            </p>
            <select
              value={onboardingData.budget}
              disabled={!isCurrent}
              onChange={(e) =>
                setOnboardingData((prev) => ({ ...prev, budget: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                marginBottom: 12,
              }}
            >
              <option value="">Select your budget</option>
              <option value="$200-5000">$200–5,000</option>
              <option value="$6000">$6,000</option>
              <option value="$10,000">$10,000</option>
              <option value="Other">Other</option>
            </select>
            <button
              type="button"
              disabled={!isCurrent || !onboardingData.budget}
              onClick={() => goToOnboardingStep(2)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor: !isCurrent || !onboardingData.budget ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 2) {
        // Trip dates + reminder
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Trip Dates</div>
            <p style={{ marginBottom: 8 }}>How long will your trip be?</p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: 4 }}>
                  Start date
                </label>
                <input
                  type="date"
                  disabled={!isCurrent}
                  value={onboardingData.startDate}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: 4 }}>
                  End date
                </label>
                <input
                  type="date"
                  disabled={!isCurrent}
                  value={onboardingData.endDate}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                disabled={!isCurrent}
                checked={onboardingData.wantReminder}
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    wantReminder: e.target.checked,
                  }))
                }
              />
              Want to set an encouragement reminder?
            </label>
            <button
              type="button"
              disabled={!isCurrent || !onboardingData.startDate || !onboardingData.endDate}
              onClick={() => goToOnboardingStep(3)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor:
                  !isCurrent || !onboardingData.startDate || !onboardingData.endDate
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 3) {
        // ✅ COMBINE STATIC + DYNAMIC LISTINGS (Preserving full object for Modal)
        const combinedHotels = [
          ...BARBADOS_HOTELS.map((h) => ({ ...h, isDbListing: false })),
          ...dbListings.map((l) => ({
            ...l, // Spread all DB fields
            id: l.id || uuidv4(),
            name: l.title || "Accommodation",
            isDbListing: !!l.id,
            // Handle currency and price nicely
            priceRange: l.price_night
              ? `$${l.price_night} ${l.currency || 'USD'} / night`
              : "Contact for price",
            // Clean up rating: Show "New" if 0, else show rating + count
            rating: l.review_count > 0 
                ? `${l.rating_overall} (${l.review_count})` 
                : "New",
          }))
        ];

        const hotelLabel = (h) => `${h.name} (${h.priceRange}, ⭐ ${h.rating})`;

        // Find the full object of the selected hotel to pass to the modal
        const selectedHotelObj = combinedHotels.find(h => 
            onboardingData.stayOption === hotelLabel(h)
        );

        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Where do you plan to stay?</div>
            <p style={{ marginBottom: 8 }}>
              Pick an option or let me suggest one based on your budget.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: 10 }}>
                <select
                disabled={!isCurrent}
                value={onboardingData.stayOption}
                onChange={(e) => {
                    const value = e.target.value;
                    const found = combinedHotels.find((h) => hotelLabel(h) === value);
                    setOnboardingData((prev) => ({
                    ...prev,
                    stayOption: value,
                    stayListingId: found?.isDbListing ? found.id : null,
                    }));
                    if (found?.isDbListing) {
                      createAccommodationBooking(
                        found.id,
                        onboardingData.startDate,
                        onboardingData.endDate
                      );
                    }
                }}
                style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                }}
                >
                <option value="">Choose a place to stay</option>
                {combinedHotels.map((h) => (
                    <option
                    key={h.id}
                    value={hotelLabel(h)}
                    >
                    {h.name} — {h.priceRange} — ⭐ {h.rating}
                    </option>
                ))}
                <option value="Not sure yet">I&apos;m not sure yet</option>
                </select>

                {/* ✅ EYE ICON BUTTON: Only shows if a valid hotel is selected */}
                  {selectedHotelObj && (
                      <button 
                          type="button"
                          onClick={() => setViewingHotel(selectedHotelObj)}
                        style={{
                            background: '#F3E8FF', // Light purple
                            color: '#7E22CE', // Dark purple
                            border: '1px solid #D8B4FE',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="View Details"
                    >
                          <Eye size={20} />
                      </button>
                  )}
              </div>

              {onboardingData.stayListingId && (
                <div
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '10px',
                    background: '#f8fafc',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Are you ready to confim accommodation?
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    If yes, we&apos;ll open WhatsApp so you can contact the owner for approval.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowWhatsappPopup(true)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: '1px solid #22c55e',
                        background: '#ecfdf3',
                        color: '#166534',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWhatsappPopup(false)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        color: '#111827',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {showWhatsappPopup && onboardingData.stayListingId && (
                <WhatsappPopUp
                  listingId={onboardingData.stayListingId}
                  startDate={onboardingData.startDate}
                  endDate={onboardingData.endDate}
                  onClose={() => setShowWhatsappPopup(false)}
                />
              )}
  
              <button
                type="button"
                disabled={!isCurrent}
              onClick={suggestStayOption}
              style={{
                background: 'white',
                border: '1px solid #1E90FF',
                color: '#1E90FF',
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '13px',
                marginBottom: 8,
                cursor: !isCurrent ? 'not-allowed' : 'pointer',
              }}
            >
              Suggest one for me
            </button>
            {onboardingData.stayOption && (
              <div
                style={{
                  fontSize: '13px',
                  marginBottom: 8,
                  color: '#047857',
                }}
              >
                {onboardingData.stayOption}
              </div>
            )}
            <button
              type="button"
              disabled={!isCurrent || !onboardingData.stayOption}
              onClick={() => goToOnboardingStep(4)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor:
                  !isCurrent || !onboardingData.stayOption ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 4) {
        // Interests
        const interestOptions = [
          'Surfing',
          'Partying',
          'Foodie',
          'Culture',
          'Nature',
          'Family fun',
          'Other',
        ];

        const isChecked = (val) => onboardingData.interests.includes(val);

        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Your Interests</div>
            <p style={{ marginBottom: 8 }}>
              What kind of vibes are you looking for on this trip?
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: 10,
              }}
            >
              {interestOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={!isCurrent}
                  onClick={() => handleInterestToggle(opt)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '999px',
                    border: isChecked(opt) ? '1px solid #1E90FF' : '1px solid #d1d5db',
                    background: isChecked(opt) ? '#1E90FF' : '#ffffff',
                    color: isChecked(opt) ? '#ffffff' : '#111827',
                    fontSize: '13px',
                    cursor: !isCurrent ? 'not-allowed' : 'pointer',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!isCurrent || onboardingData.interests.length === 0}
              onClick={() => goToOnboardingStep(5)}
              style={{
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                cursor:
                  !isCurrent || onboardingData.interests.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        );
      }

      if (msg.step === 5) {
        // Bucket list yes/no
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Bucket List</div>
            <p style={{ marginBottom: 10 }}>
              Would you like me to create a personalized Barbados bucket list for you?
            </p>
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button
                type="button"
                disabled={!isCurrent}
                onClick={() => {
                  setOnboardingData((prev) => ({ ...prev, wantBucket: true }));
                  goToOnboardingStep(6);
                }}
                style={{
                  width: '100%',
                  background: '#1E90FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 0',
                  cursor: !isCurrent ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                Yes, curate it for me!
              </button>
              <button
                type="button"
                disabled={!isCurrent}
                onClick={() => {
                  setOnboardingData((prev) => ({ ...prev, wantBucket: false }));
                  goToOnboardingStep(6);
                }} // ✅ Redirects to Step 6
                style={{
                  width: '100%',
                  background: '#ffffff',
                  color: '#1F2933',
                  border: '1px solid #d1d5db',
                  borderRadius: '999px',
                  padding: '10px 0',
                  cursor: !isCurrent ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                Choose my own
              </button>
            </div>
          </div>
        );
      }

      // ✅ NEW STEP 6: Activity Selection (With Eye Icon)
      if (msg.step === 6) {
        return (
          <div style={baseCardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Build Your Experience</div>
            <p style={{ marginBottom: 12, fontSize: '13px', color: '#4b5563' }}>
              Select the activities you'd like to do.
            </p>
            
            {/* Scrollable List Container */}
            <div style={{ 
              maxHeight: '250px', 
              overflowY: 'auto', 
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px',
              background: '#f8fafc'
            }}>
              {dbActivities.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>
                  Loading activities...
                </div>
              ) : (
                dbActivities.map(act => {
                   const isSelected = onboardingData.selectedActivities?.some(a => a.id === act.id);
                   const selectedObj = onboardingData.selectedActivities?.find(a => a.id === act.id);
                   const activityName = act.title || act.name || "Untitled Activity"; 
                   
                   return (
                     <div 
                       key={act.id} 
                       onClick={() => isCurrent && handleActivityToggle(act.id, activityName)}
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         padding: '10px',
                         marginBottom: '6px',
                         borderRadius: '8px',
                         background: 'white',
                         border: isSelected ? '1px solid #1E90FF' : '1px solid #e2e8f0',
                         cursor: isCurrent ? 'pointer' : 'default',
                         transition: 'all 0.2s',
                         position: 'relative'
                       }}
                     >
                        {/* Selection Box */}
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '4px',
                          border: isSelected ? '5px solid #1E90FF' : '1px solid #cbd5e1',
                          marginRight: '10px',
                          flexShrink: 0,
                          backgroundColor: isSelected ? '#1E90FF' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSelected && <Check size={12} color="white" />}
                        </div>
                        
                        {/* Info Section */}
                        <div style={{ flex: 1, paddingRight: '35px' }}> {/* Padding right to avoid overlap with eye button */}
                           <div style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>{activityName}</div>
                           <div style={{ fontSize: '11px', color: '#64748b', display:'flex', gap:'8px', marginTop:'2px' }}>
                             {(act.base_price !== undefined || act.price) && <span>💵 {act.base_price || act.price} {act.price_currency || ''}</span>}
                             {(act.duration_text || act.duration) && <span>⏱️ {act.duration_text || act.duration}</span>}
                           </div>

                        {/* ✅ Date + Time (only when selected) */}
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginTop: 8,
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Date</span>
                              <input
                                type="date"
                                value={selectedObj?.scheduled_date || ''}
                                min={onboardingData.startDate || undefined}
                                max={onboardingData.endDate || undefined}
                                onChange={(e) =>
                                  handleActivityScheduleChange(act.id, 'scheduled_date', e.target.value)
                                }
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 8,
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  background: '#fff',
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Time</span>
                              <input
                                type="time"
                                value={selectedObj?.scheduled_time || ''}
                                onChange={(e) =>
                                  handleActivityScheduleChange(act.id, 'scheduled_time', e.target.value)
                                }
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 8,
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  background: '#fff',
                                }}
                              />
                            </div>
                          </div>
                        )}

                        </div>

                        {/* ✅ EYE BUTTON for Details */}
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent toggling selection
                                setViewingActivity(act);
                            }}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                background: '#F3E8FF',
                                color: '#7E22CE',
                                border: '1px solid #D8B4FE',
                                borderRadius: '6px',
                                width: '28px', 
                                height: '28px',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 5
                            }}
                            title="View Details"
                        >
                            <Eye size={16} />
                        </button>
                     </div>
                   );
                })
              )}
            </div>

            <button
              type="button"
              disabled={!isCurrent}
              onClick={() => finishOnboarding(!!onboardingData.wantBucket)} 
              style={{
                width: '100%',
                background: '#1E90FF',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '10px 0',
                cursor: !isCurrent ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Confirm Selection ({onboardingData.selectedActivities?.length || 0})
            </button>
          </div>
        );
      }

      return <div style={baseCardStyle}>Loading trip setup…</div>;
    }

    // Map card
    if (msg.type === 'map' && msg.mapEmbedUrl) {
      return (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '100%',
          }}
        >
          {msg.title && (
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
              {msg.title}
            </div>
          )}
          {msg.content && (
            <div style={{ fontSize: '13px', marginBottom: '8px', color: '#4b5563' }}>
              {msg.content}
            </div>
          )}
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            <iframe
              src={msg.mapEmbedUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
                borderRadius: '8px',
              }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title={msg.title || 'Location map'}
            />
          </div>
        </div>
      );
    }

    // File upload responses (if backend sends fileUrl)
    if (msg.fileUrl) {
      return (
        <>
          <div>{msg.content}</div>
          {/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
            <img
              src={msg.fileUrl}
              alt="Uploaded"
              style={{ maxWidth: '200px', marginTop: '10px' }}
            />
          ) : (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
              View File
            </a>
          )}
        </>
      );
    }

    // Welcome message with "Planning a Visit" button (Tourism agent only)
    if (msg.role === 'assistant' && msg.isWelcome) {
      const showPlanningButton =
        activeAgent === 'Tourism' && !isOnboardingActive && !hasCompletedOnboarding;

      return (
        <div>
          <div>{msg.content}</div>
          {showPlanningButton && (
            <button
              type="button"
              onClick={startOnboarding}
              style={{
                marginTop: '10px',
                background: '#1E90FF', // dodger blue
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Planning a Visit
            </button>
          )}
        </div>
      );
    }

    // Tourism agent normal response (VariableProximity only affects text; button is rendered outside)
    if (
      msg.role === 'assistant' &&
      (msg.agent === 'Tourism' || (!msg.agent && activeAgent === 'Tourism')) &&
      !msg.isWelcome &&
      msg.type !== 'map' &&
      msg.type !== 'onboarding'
    ) {
      if (!isProximityOn) {
        // Just normal text when proximity is off
        return msg.content;
      }

      // VariableProximity ON: overlay effect but keep same layout space INSIDE .message
      return (
        <div style={{ position: 'relative' }}>
          {/* Invisible text to preserve layout inside .message */}
          <div
            style={{
              visibility: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            <VariableProximity
              label={msg.content}
              className="variable-proximity-demo"
              fromFontVariationSettings="'wght' 400, 'opsz' 9"
              toFontVariationSettings="'wght' 1000, 'opsz' 40"
              containerRef={messagesContainerRef}
              radius={100}
              falloff="linear"
            />
          </div>
        </div>
      );
    }

    // Main agent: plain text always
    if (msg.role === 'assistant') {
      return msg.content;
    }

    // default user / other roles
    return msg.content;
  };

  return (
    <div className="baje-container" style={{ zIndex: 100, position: 'relative' }}>
      
      {/* ✅ RENDER MODALS */}
      <HotelDetailsModal hotel={viewingHotel} onClose={() => setViewingHotel(null)} />
      <ActivityDetailsModal activity={viewingActivity} onClose={() => setViewingActivity(null)} />

      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className="ai-avatar"
            style={{
              ...(avatarImage && {
                backgroundImage: `url(${avatarImage})`,
                backgroundColor: 'transparent',
              }),
            }}
          >
            {!avatarImage && 'ISLE'}
          </div>
          <div className="ai-info">
            <div className="ai-name">ISLE</div>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div className="ai-status">Your {selectedCountry.name} Guide</div>
              <div
                className="barbados-flag"
                onClick={toggleCountryMenu}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: `url(${selectedCountry.flagUrl}) center/cover`,
                  marginLeft: '10px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>

        <div className="header-buttons">
          <div
            className="bell-container"
            style={{ display: 'flex', marginRight: '8px', position: 'relative' }}
          >
            <button
              className="notification-button"
              onClick={() => {
                if (chatSessionId && usageStartTime) {
                  const durationSeconds = Math.round(
                    (Date.now() - usageStartTime) / 1000
                  );
                  saveUsageTime(chatSessionId, durationSeconds);
                }
                localStorage.setItem(
                  'lastSeenNotificationCount',
                  notificationCount.toString()
                );
                localStorage.setItem('notificationsCount', notificationCount.toString());
                window.dispatchEvent(new Event('notifications:updated'));
                setShowNotificationBadge(false);
                navigate('/notifications');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.3s ease',
                fontSize: '18px',
              }}
            >
              🔔
            </button>
            <span
              className="badge"
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-12px',
                zIndex: 2000,
                backgroundColor: 'red',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                padding: 0,
                lineHeight: '20px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                display:
                  notificationCount > 0 && showNotificationBadge ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px white',
              }}
              aria-label={`Amount of Notifications: ${displayCount}`}
              title={`Amount of Notifications: ${displayCount}`}
            >
              {displayCount}
            </span>
          </div>

          <button
            className={`hamburger-button ${isNavOpen ? 'active' : ''}`}
            onClick={toggleNav}
          >
            <span className="hamburger-button-span"></span>
            <span className="hamburger-button-span"></span>
            <span className="hamburger-button-span"></span>
          </button>
        </div>
      </div>

      <div
        className={`nav-overlay ${
          isNavOpen || isCountryMenuOpen || isFactsCardOpen || isTipCardOpen
            ? 'active'
            : ''
        }`}
      >
        <div className={`nav-card ${isNavOpen ? 'nav-card-open' : ''}`}>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.name} className="nav-item">
                <Link
                  to={item.path}
                  className="nav-item-a"
                  onClick={(e) => {
                    if (item.onClick) {
                      item.onClick(e);
                    } else {
                      if (chatSessionId && usageStartTime) {
                        const durationSeconds = Math.round(
                          (Date.now() - usageStartTime) / 1000
                        );
                        saveUsageTime(chatSessionId, durationSeconds);
                      }
                      setIsNavOpen(false);
                    }
                  }}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={messagesContainerRef}
        className="chat-messages"
        style={{
          marginLeft: 0,
          transition: 'margin-left .28s ease',
        }}
      >
        {messages.map((msg) => {
          const isAssistantTourismReply =
            msg.role === 'assistant' &&
            (msg.agent === 'Tourism' || (!msg.agent && activeAgent === 'Tourism')) &&
            !msg.isWelcome &&
            msg.type !== 'map' &&
            msg.type !== 'onboarding';

          const isProximityOn = !!proximityToggles[msg.id];

          return (
            // Parent wrapper (not visible)
            <div
              key={msg.id}
              className="message-wrapper"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start', // everything on left side
              }}
            >
              {/* Actual bubble/card */}
              <div
                className="message"
                style={{
                  alignSelf: 'flex-start', // user + assistant both left
                }}
              >
                {renderMessageContent(msg, isAssistantTourismReply ? isProximityOn : false)}
              </div>

              {/* Variable Proximity toggle button as sibling, bottom-left */}
              {isAssistantTourismReply && (
                <button
                  type="button"
                  onClick={() =>
                    setProximityToggles((prev) => ({
                      ...prev,
                      [msg.id]: !prev[msg.id],
                    }))
                  }
                  style={{
                    marginTop: '4px',
                    marginLeft: '10px',
                    fontSize: '13px',
                    padding: '4px 6px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={
                    isProximityOn
                      ? 'Turn off variable proximity'
                      : 'Turn on variable proximity'
                  }
                >
                  <FontAwesomeIcon
                    icon={faWaveSquare}
                    style={{
                      fontSize: '14px',
                      opacity: isProximityOn ? 1 : 0.6,
                    }}
                  />
                </button>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="message">
            <div style={{ display: 'flex', gap: '5px' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ccc',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Facts Card */}
      <div
        className="facts-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          background: '#F5F5F5',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.5)',
          display: isFactsCardOpen && !isTipCardOpen ? 'block' : 'none',
          zIndex: 1003,
          color: 'black',
          textAlign: 'center',
        }}
      >
        <button
          className="facts-card-close"
          onClick={() => setIsFactsCardOpen(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'black',
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '10px',
          }}
        >
          Did you know?
        </div>
        <div style={{ fontSize: '14px', marginBottom: '8px' }}>{fact.questions}</div>
        <div style={{ color: '#008000', fontSize: '14px' }}>{fact.answers}</div>
      </div>

      {/* Tip Card */}
      <div
        className="tip-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          background: '#F5F5F5',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.5)',
          display: isTipCardOpen && !isFactsCardOpen ? 'block' : 'none',
          zIndex: 1003,
          color: 'black',
          textAlign: 'center',
        }}
      >
        <button
          className="tip-card-close"
          onClick={() => setIsTipCardOpen(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'black',
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '15px',
            marginBottom: '15px',
          }}
        >
          {selectedCountry.name} Travel Tip
        </div>
        <div style={{ fontSize: '14px' }}>{currentTip.tip_text}</div>
      </div>

      {/* Tourism sidebar inside container, above input (LEFT side) */}
      {showTourismBar && (
        <div
          ref={tourismBarRef}
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            bottom: 80,
            zIndex: 1001,
          }}
        >
          <button
            type="button"
            onClick={() => setIsTourismBarOpen(false)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.4)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1002,
            }}
            aria-label="Close tourism tools"
          >
            ✕
          </button>
          <ChatBarTourism 
            visible={true} 
            onFactsClick={handleShowFacts}
            // ✅ PASSED: The new onboarding data
            onboardingData={onboardingData}
            hasCompletedOnboarding={hasCompletedOnboarding}
          />
        </div>
      )}

      {/* Purple circular button for tourism bar */}
      {isTourism && !showTourismBar && (
        <button
          ref={tourismButtonRef}
          type="button"
          onClick={() => setIsTourismBarOpen(true)}
          style={{
            position: 'absolute',
            right: '10px',
            bottom: '80px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: '#E0BBFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            zIndex: 1000,
          }}
          title="Show Tourism Tools"
        >
          <FontAwesomeIcon
            icon={faUmbrellaBeach}
            style={{ color: '#5A189A', fontSize: '18px' }}
          />
        </button>
      )}

      {/* Input section */}
      <div
        className="input-section"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '15px',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 100,
          marginLeft: 0,
          transition: 'margin-left .28s ease',
        }}
      >
        <textarea
          className="input-field"
          rows={2}
          placeholder={`Ask me about ${selectedCountry.name}...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          style={{ flexGrow: 1, marginRight: '10px' }}
        />

        {/* Agent Picker */}
      <div
  className='agent-menu-container'
  style={{ position: 'relative', marginRight: '10px' }}
>
  <button
    ref={agentButtonRef}
    className='agent-button'
    type='button'
    onClick={() => setIsAgentMenuOpen((prev) => !prev)}
    aria-haspopup='menu'
    aria-expanded={isAgentMenuOpen}
    title={`Agent: ${activeAgent}`}
  >
    {agentIcon}
  </button>

  <div
    ref={agentMenuRef}
    className={`agent-menu ${isAgentMenuOpen ? 'open' : ''}`}
    role='menu'
    aria-label='Choose agent'
    style={{
      position: 'absolute',
      bottom: '100%',
      right: '1%',
      marginRight: '5px',
      marginBottom: '20px',
      zIndex: 2000,
      left: 'auto',
      minWidth: 'max-content',
    }}
  >
    {['Main', 'Tourism'].map((agent) => (
      <button
        key={agent}
        className={`agent-item ${activeAgent === agent ? 'active' : ''}`}
        role='menuitem'
        onClick={() => {
          setActiveAgent(agent);
          setAgentIcon(agent === 'Main' ? '🤖' : '🏖️');
          setIsAgentMenuOpen(false);
          if (agent !== 'Tourism') setIsTourismBarOpen(false);
        }}
      >
        {agent === 'Main' && '🤖'}
        {agent === 'Tourism' && '🏖️'}
        <span style={{ marginLeft: 8 }}>{agent}</span>
      </button>
    ))}
  </div>
</div>


        {/* Send button */}
        <button
          className="submit-button"
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          style={{
            background: '#1E90FF',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            transition: '0.3s ease',
          }}
        >
          {isLoading ? '...' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes slide-up {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .baje-container { position: relative; z-index: 100; }
        .chat-header { position: sticky; top: 0; z-index: 101; }
        .nav-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0); z-index: 99; transition: background 0.3s ease; visibility: hidden;
        }
        .nav-overlay.active { background: rgba(0, 0, 0, 0.5); visibility: visible; }
        .nav-card {
          position: fixed; top: 0; right: -300px; width: 250px; height: 100vh;
          background: rgba(0, 0, 0, 0.9); padding: 20px; transition: right 0.3s ease; z-index: 1000;
          visibility: hidden; border-radius: 10px; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.35);
          display: flex; flex-direction: column; align-items: center;
        }
        .nav-card.nav-card-open { right: 0; visibility: visible; }
        .nav-list {
          list-style: none; padding: 0; margin: 150px 0 0 0;
          display: flex; flex-direction: column; align-items: center; width: 100%;
        }
        .nav-item { margin: 15px 0; width: 100%; text-align: center; }
        .nav-item-a {
          color: white; text-decoration: none; font-size: 18px; transition: color 0.2s ease;
          display: block; padding: 10px 0;
        }
        .nav-item-a:hover { color: #1E90FF; }
        .hamburger-button.active .hamburger-button-span { background: white; }
        .hamburger-button.active .hamburger-button-span:nth-child(1) {
          position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(45deg);
        }
        .hamburger-button.active .hamburger-button-span:nth-child(2) { opacity: 0; }
        .hamburger-button.active .hamburger-button-span:nth-child(3) {
          position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(-45deg);
        }
        .notification-button:hover { background: #1E90FF; }
        .submit-button:hover, .barbados-flag:hover { background: #1873CC; }
        .message { max-width: 70%; margin: 10px; border-radius: 5px; padding: 10px; }
        .message img { max-width: 200px; border-radius: 5px; margin: 10px; }
        .message a { color: #1E90FF; text-decoration: none; }
        .message a:hover { text-decoration: underline; }
        .bell-container { position: relative; width: 30px; height: 30px; cursor: pointer; }
        .bell-container .badge { --badge-size: 20px; --badge-font: 11px; }
        @media (max-width: 360px) {
          .bell-container .badge { --badge-size: 24px; --badge-font: 13px; }
        }
        @media (min-width: 361px) and (max-width: 450px) {
          .bell-container .badge { --badge-size: 22px; --badge-font: 12px; }
        }
        @media (min-width: 768px) {
          .bell-container .badge { --badge-size: 20px; --badge-font: 11px; }
        }
        @media only screen and (max-width: 450px) {
          .chat-header { padding: 10px; }
          .hamburger-button { margin-left: auto; }
          .nav-card { width: 100%; max-width: 450px; right: -450px; border-radius: 0; }
          .nav-card.nav-card-open { right: 0; }
        }
        .agent-menu { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); overflow: hidden; display: none; }
        .agent-menu.open { display: block; }
        .agent-item { display: flex; align-items: center; width: 100%; padding: 10px 15px; border: none; background: transparent; cursor: pointer; text-align: left; color: #333; }
        .agent-item:hover { background: #f0f9ff; }
        .agent-item.active { background: #e0f2fe; color: #0284c7; }
      `}</style>
    </div>
  );
}

export default Baje;
