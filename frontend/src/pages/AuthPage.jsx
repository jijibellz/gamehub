import AuthForm from "../components/AuthForm";

export default function AuthPage({ isLogin, onSuccess }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#202225] text-white">
      <div className="flex flex-col items-center justify-center space-y-6">
        <AuthForm isLogin={isLogin} onSuccess={onSuccess} />
        <p className="text-sm text-gray-400">
          {isLogin ? (
            <>
              Need an account?{" "}
              <a href="/register" className="text-white hover:underline">
                Register
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a href="/login" className="text-white hover:underline">
                Login
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
