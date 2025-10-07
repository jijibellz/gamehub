import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate(); // 🚀 for programmatic navigation

  const handleSuccess = () => {
    // navigate to main feed after successful login
    navigate("/feed");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-pink-100 via-white to-blue-100">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 tracking-tight">
          {isLogin ? "Welcome Back 👋" : "Join GameHub ✨"}
        </h1>

        <AuthForm isLogin={isLogin} onSuccess={handleSuccess} />

        <p className="mt-6 text-center text-gray-600 text-sm">
          {isLogin ? "Don’t have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-pink-500 font-semibold hover:underline transition"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
