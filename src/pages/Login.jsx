import { useState } from "react";
import { motion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanError = (message) => {
    if (message.includes("auth/email-already-in-use")) return "This email already has an account.";
    if (message.includes("auth/invalid-credential")) return "Wrong email or password.";
    if (message.includes("auth/weak-password")) return "Password should be at least 6 characters.";
    if (message.includes("auth/popup-closed-by-user")) return "Google login popup was closed.";
    if (message.includes("auth/unauthorized-domain")) return "Add this domain in Firebase Authentication settings.";
    return message.replace("Firebase: ", "");
  };

  const validate = () => {
    if (!email.trim()) return "Enter your email.";
    if (!password.trim()) return "Enter your password.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(cleanError(err.message || "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(cleanError(err.message || "Google login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-os-login min-h-screen bg-[#070b18] text-white flex items-center justify-center p-4 overflow-hidden relative">
      <motion.div
        animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="absolute top-20 left-12 text-5xl opacity-25"
      >
        ✨
      </motion.div>
      <motion.div
        animate={{ y: [0, 18, 0], rotate: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 5 }}
        className="absolute bottom-24 right-14 text-6xl opacity-20"
      >
        ⭐
      </motion.div>
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.25),transparent_35%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl"
      >
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
            className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-700 flex items-center justify-center text-4xl shadow-2xl"
          >
            🎓
          </motion.div>
          <h1 className="text-3xl font-black mt-5">Student OS</h1>
          <p className="text-slate-300 mt-2">Secure login to your student command center.</p>
        </div>

        <form onSubmit={handleEmailAuth} className="mt-7 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
          />

          {error && (
            <div className="bg-red-500/15 border border-red-400/20 text-red-200 rounded-2xl p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-2xl font-bold shadow-xl"
          >
            {loading ? "Please wait..." : isSignup ? "Create Account" : "Login"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-slate-400 text-sm">
          <div className="h-px bg-white/10 flex-1" />
          OR
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-slate-900 hover:bg-slate-100 py-3 rounded-2xl font-bold shadow-xl"
        >
          Continue with Google
        </button>

        <button
          onClick={() => {
            setIsSignup((value) => !value);
            setError("");
          }}
          className="w-full mt-4 text-blue-200 hover:text-white py-2 rounded-xl font-semibold"
        >
          {isSignup ? "Already have an account? Login" : "New here? Create an account"}
        </button>

        <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
          Your account is protected with Firebase Authentication. Your current app data remains in this browser until cloud sync is added.
        </p>
      </motion.div>
    </div>
  );
}
