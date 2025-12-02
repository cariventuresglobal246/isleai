// AdminSendNotification.jsx
import { useState } from "react";
import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  "https://lgurtucciqvwgjaphdqp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXJ0dWNjaXF2d2dqYXBoZHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2MzgzNTAsImV4cCI6MjA0NTIxNDM1MH0.I1ajlHp5b4pGL-NQzzvcVdznoiyIvps49Ws5GZHSXzk"
);



export default function AdminSendNotification() {
  const [form, setForm] = useState({ title: "", description: "", type: "traffic" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from("notifications").insert([form]);
    if (error) {
      alert("Error sending notification");
    } else {
      alert("Notification sent!");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <select onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="traffic">Traffic</option>
        <option value="water">Water</option>
        <option value="waste">Waste</option>
      </select>
      <button type="submit">Send</button>
    </form>
  );
}

