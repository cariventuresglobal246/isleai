// AdminSendNotification.jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminSendNotification() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "traffic",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const payload = {
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      type: form.type || "traffic",
    };

    if (!payload.title) {
      alert("Please enter a title.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("notifications").insert([payload]);
      if (error) {
        console.error("Send notification error:", error);
        alert(error.message || "Error sending notification");
        return;
      }

      alert("Notification sent!");
      setForm({ title: "", description: "", type: "traffic" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
      <input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        placeholder="Description"
        value={form.description}
        rows={4}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <select
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        <option value="traffic">Traffic</option>
        <option value="water">Water</option>
        <option value="waste">Waste</option>
      </select>

      <button type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
