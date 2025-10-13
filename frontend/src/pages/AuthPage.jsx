import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#0e0f10] via-[#1a1b1e] to-[#2b2d31] text-gray-200">
      <div className="flex flex-col items-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-100">
          {isLogin ? "Welcome Back 👋" : "Join GameHub ✨"}
        </h1>

        <AuthForm isLogin={isLogin} onSuccess={handleSuccess} />

        <p className="text-sm text-gray-400">
          {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#5865f2] font-medium hover:underline transition"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
