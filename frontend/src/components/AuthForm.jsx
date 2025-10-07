// components/AuthForm.jsx
import { useState } from "react";
import axios from "axios";
import { ROUTES } from "../api/routes";

export default function AuthForm({ isLogin, onSuccess }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); // reset previous messages

    // Debug: check values
    console.log("Submitting:", { username, email, password });

    try {
      if (isLogin) {
  const res = await axios.post(ROUTES.LOGIN, { username, password });
  localStorage.setItem("token", res.data.access_token);

  // Save current user info with all profile data
  localStorage.setItem(
    "currentUser",
    JSON.stringify(res.data.user)
  );

  setMessage("✅ Login successful!");
  if (onSuccess) onSuccess();
}
 else {
        // REGISTER
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
      className="bg-white p-8 rounded-2xl shadow-lg w-96 space-y-4"
    >
      {/* Username always */}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        required
      />

      {/* Email only on register */}
      {!isLogin && (
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      )}

      {/* Password always */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        {isLogin ? "Login" : "Register"}
      </button>

      {/* Message */}
      {message && (
        <p
          className={`mt-3 text-center ${
            message.startsWith("✅") || message.startsWith("🎉")
              ? "text-green-600"
              : "text-red-500"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
