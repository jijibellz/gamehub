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
      className="w-96 p-8 rounded-2xl shadow-xl bg-[#1e1f22] flex flex-col gap-5 border border-[#2f3136]"
    >
      <h2 className="text-center text-2xl font-semibold text-gray-100">
        {isLogin ? "Welcome Back 👋" : "Create an Account"}
      </h2>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full px-4 py-3 rounded-md bg-[#2b2d31] text-gray-200 placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5865f2] transition"
        required
      />

      {!isLogin && (
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-md bg-[#2b2d31] text-gray-200 placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5865f2] transition"
          required
        />
      )}

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-3 rounded-md bg-[#2b2d31] text-gray-200 placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5865f2] transition"
        required
      />

      <button
        type="submit"
        className="w-full py-3 rounded-md bg-[#5865f2] text-white font-semibold hover:bg-[#4752c4] transition"
      >
        {isLogin ? "Login" : "Register"}
      </button>

      {message && (
        <p
          className={`text-center text-sm ${
            message.startsWith("✅") || message.startsWith("🎉")
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}

      <p className="text-center text-gray-400 text-xs">
        {isLogin ? "Need an account?" : "Already have one?"}{" "}
        <span className="text-[#5865f2] cursor-pointer hover:underline">
          {isLogin ? "Register" : "Login"}
        </span>
      </p>
    </form>
  );
}
