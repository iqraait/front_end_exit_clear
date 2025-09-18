import React, { useState } from "react";
import api from "../api/api";

function HRRegister() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("hr/", form);
    alert("HR Registered Successfully");
    window.location.href = "/login";
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>HR Register</h2>
      <input name="username" placeholder="Username" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input
        type="password"
        name="password"
        placeholder="Password"
        onChange={handleChange}
      />
      <button type="submit">Register</button>
    </form>
  );
}

export default HRRegister;
