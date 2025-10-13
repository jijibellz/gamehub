import { useState } from "react";
import axios from "axios";
import { ROUTES } from "../api/routes";
import "./AuthForm.css";

export default function AuthForm({ isLogin, onSuccess }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isLogin) {
        const res = await axios.post(ROUTES.LOGIN, { username, password });
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("currentUser", JSON.stringify(res.data.user));
        setMessage("✅ Login successful!");
        if (onSuccess) onSuccess();
      } else {
        await axios.post(ROUTES.REGISTER, { username, email, password });
        setMessage("🎉 Registration successful! You can now login.");
      }
    } catch (err) {
      console.error(err);
      let errorMsg = "❌ Something went wrong";
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          errorMsg = `❌ ${detail}`;
        } else if (Array.isArray(detail)) {
          errorMsg = `❌ ${detail[0].msg}`;
        }
      }
      setMessage(errorMsg);
    }
  };

  return (
  <form
    onSubmit={handleSubmit}
    className="auth-form bg-[#313338] text-white p-8 rounded-lg shadow-2xl border border-[#3f4147]"
  >
    <h2 className="text-2xl font-bold text-center mb-1">
      {isLogin ? "Welcome back!" : "Create an account"}
    </h2>
    <p className="text-gray-400 text-center mb-6 text-sm">
      {isLogin
        ? "We’re so excited to see you again!"
        : "Join us and start connecting!"}
    </p>

    {/* Left align form fields */}
    <div className="form-fields flex flex-col space-y-4 items-start">
      {/* Username */}
      <div>
        <label className="block text-xs uppercase text-gray-400 mb-1">
          Username
        </label>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="auth-input"
        />
      </div>

      {/* Email (only register) */}
      {!isLogin && (
        <div>
          <label className="block text-xs uppercase text-gray-400 mb-1">
            Email
          </label>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
        </div>
      )}

      {/* Password */}
      <div>
        <label className="block text-xs uppercase text-gray-400 mb-1">
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="auth-input"
        />
      </div>
    </div>

    {/* Add a lil gap from the password */}
    <button type="submit" className="submit-btn mt-5">
      {isLogin ? "Login" : "Register"}
    </button>

    {message && (
      <p
        className={`mt-3 text-center text-sm ${
          message.startsWith("✅") || message.startsWith("🎉")
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {message}
      </p>
    )}
  </form>
);
}
