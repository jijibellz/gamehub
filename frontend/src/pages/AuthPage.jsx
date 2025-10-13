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
    <div className="min-h-screen flex items-center justify-center bg-[#1e1f22]">
      <div className="flex flex-col items-center space-y-6">
        <AuthForm isLogin={isLogin} onSuccess={handleSuccess} />

        <p className="text-gray-400 text-sm mt-4">
          {isLogin ? "Need an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-white hover:underline transition"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
