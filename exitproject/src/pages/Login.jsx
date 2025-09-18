import React, { useState } from "react";
import api from "../api/api";
import "./styles/Login.css";

function Login() {
  const [role, setRole] = useState("HR");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let res;
      if (role === "HR") {
        res = await api.post("hr/login/", {
          username: form.username,
          password: form.password,
        });
        localStorage.setItem("token", res.data.token);
        window.location.href = "/hr-page";
      } else {
        res = await api.post("departments/login/", {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("department_id", res.data.department_id);
        localStorage.setItem("department", res.data.department);
        window.location.href = "/department-page";
      }
    } catch (err) {
      setAlert("Invalid credentials!");
      setTimeout(() => setAlert(null), 3000);
    }
  };

  return (
    <div className="login-page">
      {alert && (
        <div className="alert alert-error">
          {alert}
          <button onClick={() => setAlert(null)}>&times;</button>
        </div>
      )}

      <div className="login-card">
        <form onSubmit={handleSubmit}>
          <h2>Login</h2>

          {/* Modern Role Selector */}
          <div className="role-selector-toggle">
            <div
              className={`role-option ${role === "HR" ? "active" : ""}`}
              onClick={() => setRole("HR")}
            >
              HR
            </div>
            <div
              className={`role-option ${role === "Department" ? "active" : ""}`}
              onClick={() => setRole("Department")}
            >
              Department
            </div>
          </div>

          {/* HR Fields */}
          {role === "HR" && (
            <>
              <div className="input-group">
                <input
                  name="username"
                  placeholder=" "
                  onChange={handleChange}
                />
                <label>Username</label>
              </div>
              <div className="input-group">
                <input
                  type="password"
                  name="password"
                  placeholder=" "
                  onChange={handleChange}
                />
                <label>Password</label>
              </div>
            </>
          )}

          {/* Department Fields */}
          {role === "Department" && (
            <>
              <div className="input-group">
                <input name="email" placeholder=" " onChange={handleChange} />
                <label>Email</label>
              </div>
              <div className="input-group">
                <input
                  type="password"
                  name="password"
                  placeholder=" "
                  onChange={handleChange}
                />
                <label>Password</label>
              </div>
            </>
          )}

          <button type="submit">Login</button>
          <div className="reset-password-link">
            <a href="http://localhost:5173/set-password">Forgot Password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
