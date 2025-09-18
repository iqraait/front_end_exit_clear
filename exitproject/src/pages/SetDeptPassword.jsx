import React, { useState } from "react";
import api from "../api/api";
import "./styles/setpassword.css";

function SetDeptPassword() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("departments/set_password/", form);
      alert("Password set successfully. You can now login.");
      window.location.href = "/";
    } catch (err) {
      alert("Error setting password. Make sure email is correct.");
      console.error(err); // Log the error for debugging
    }
  };

  return (
    <div className="set-password-page">
      {" "}
      {/* Wrapper for the entire page */}
      <form onSubmit={handleSubmit} className="set-password-card">
        {" "}
        {/* Card styling */}
        <h2>Set Department Password</h2>
        <div className="input-group">
          {" "}
          {/* Input group for email */}
          <input
            name="email"
            id="email" // Added id for label association
            placeholder=" " // Important for placeholder-shown to work
            value={form.email}
            onChange={handleChange}
            required
          />
          <label htmlFor="email">Department Email</label>{" "}
          {/* Label for email */}
        </div>
        <div className="input-group">
          {" "}
          {/* Input group for password */}
          <input
            type="password"
            name="password"
            id="password" // Added id for label association
            placeholder=" " // Important for placeholder-shown to work
            value={form.password}
            onChange={handleChange}
            required
          />
          <label htmlFor="password">New Password</label>{" "}
          {/* Label for password */}
        </div>
        <button type="submit">Save Password</button>
      </form>
    </div>
  );
}

export default SetDeptPassword;
