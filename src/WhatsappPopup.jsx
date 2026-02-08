import React, { useEffect, useState } from "react";
import axios from "axios";

export default function WhatsappPopUp({
  phone,
  listingId,
  startDate,
  endDate,
  image,
  onClose,
}) {
  const [whatsAppPhone, setWhatsAppPhone] = useState(phone || "");

  useEffect(() => {
    const fetchListing = async () => {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const TOURISM_API = `${API_URL}/api/tourism-entities`;
      const token = localStorage.getItem("access_token");

      try {
        const endpoint = listingId
          ? `${TOURISM_API}/accommodationprovider_listings/${listingId}`
          : `${TOURISM_API}/accommodationprovider_listings`;

        const response = await axios.get(endpoint, {
          withCredentials: true,
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        const payload = response.data?.data;
        const listing = Array.isArray(payload) ? payload[0] : payload;
        const number =
          listing?.whatsapp_contact ||
          listing?.contact_whatsapp ||
          listing?.whatsappContact;

        if (number) setWhatsAppPhone(number);
      } catch (err) {
        console.error("Failed to load accommodationprovider_listings", err);
      }
    };

    fetchListing();
  }, [listingId]);

  const title = "Booking Confirmation";
  const description =
    "To Confirmation and Receive Approval for Accommodations";

  const message = `Hey I am interested in dating for ${startDate || "[start date]"} ${endDate || "[end date]"}`;

  const whatsappUrl = `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {onClose && (
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        )}

        {image && <img src={image} alt="Accommodation" style={styles.image} />}

        <h3 style={styles.title}>{title}</h3>
        <p style={styles.description}>{description}</p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.button}
        >
          Confirm on WhatsApp
        </a>
      </div>
    </div>
  );
}

/* =======================
   Inline Styles
======================= */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 360,
    background: "#ffffff",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
    textAlign: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
    color: "#555",
  },
  image: {
    width: "100%",
    maxHeight: 180,
    objectFit: "cover",
    borderRadius: 10,
    marginBottom: 12,
  },
  title: {
    margin: "10px 0 6px",
    fontSize: 20,
    fontWeight: 700,
    color: "#222",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  button: {
    display: "inline-block",
    width: "100%",
    padding: "12px 14px",
    background: "#25D366",
    color: "#fff",
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: "none",
  },
};
