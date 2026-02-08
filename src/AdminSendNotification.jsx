// AdminSendNotification.jsx
import { useState } from "react";
import { supabase } from "./lib/supabaseClient";



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

