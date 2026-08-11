import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import logo from "../Assets/logo.png";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const { token, user } = await login(form);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err) {
      setMsg(err.response?.data?.message || "Invalid login or password.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center mb-5">
          <img src={logo} alt="MarineCash" className="w-14 h-14 rounded-full mb-2" />
          <h1 className="text-2xl font-extrabold text-orange-500">Welcome Back</h1>
          <p className="text-gray-400 text-sm">Log in to your MarineCash account</p>
        </div>

        {msg && (
          <div className="bg-red-50 border border-red-300 text-red-600 text-sm rounded-xl p-3 mb-4 text-center">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Email or Phone</label>
            <input
              type="text" name="identifier" value={form.identifier}
              onChange={handleChange} placeholder="your@email.com or +254..." required
              autoFocus
              className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-2.5 text-sm mt-1 outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Password</label>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"} name="password"
                value={form.password} onChange={handleChange}
                placeholder="••••••••" required
                className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-2.5 text-sm outline-none transition pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <i className={`fas ${showPw ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-orange-500 font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3 rounded-xl transition-all text-sm mt-2"
          >
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-orange-500 font-bold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
