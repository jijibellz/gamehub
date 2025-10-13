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
      className="bg-[#2f3136] p-8 rounded-2xl shadow-2xl w-96 space-y-5 text-white"
    >
      <h2 className="text-2xl font-semibold text-center mb-2">
        {isLogin ? "Welcome back!" : "Create an account"}
      </h2>
      <p className="text-gray-400 text-center mb-4">
        {isLogin
          ? "We're so excited to see you again!"
          : "Join us and start connecting!"}
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400 block mb-1">
            Username
          </label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 bg-[#202225] border border-transparent rounded-md focus:border-white focus:outline-none text-white placeholder-gray-500 transition"
            required
          />
        </div>

        {!isLogin && (
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-400 block mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#202225] border border-transparent rounded-md focus:border-white focus:outline-none text-white placeholder-gray-500 transition"
              required
            />
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400 block mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-[#202225] border border-transparent rounded-md focus:border-white focus:outline-none text-white placeholder-gray-500 transition"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-200 transition mt-3"
      >
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
