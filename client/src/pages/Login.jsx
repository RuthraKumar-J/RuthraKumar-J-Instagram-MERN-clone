import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const performLogin = async (loginId, loginPass) => {
    setError('');
    setSubmitting(true);
    try {
      await login(loginId, loginPass);
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Unable to sign in. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your username/email and password.');
      return;
    }
    performLogin(identifier.trim(), password);
  };

  const handleDemoLogin = () => {
    setIdentifier('ruthrakumar.j');
    setPassword('password123');
    performLogin('ruthrakumar.j', 'password123');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px] space-y-3">
        {/* Main card */}
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-8 py-10 shadow-sm">
          <h1 className="font-logo text-5xl text-center mb-8 select-none text-neutral-900 dark:text-white">
            Instagram
          </h1>

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or email"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium text-center pt-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 mt-1 rounded-lg bg-ig-blue hover:bg-ig-blueHover disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-xs font-semibold text-neutral-400">OR</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleDemoLogin}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            One-Click Demo Login
          </button>

          <p className="text-[11px] text-neutral-400 text-center mt-3">
            Signs in as <span className="font-semibold">@ruthrakumar.j</span> with seeded posts, stories & DMs
          </p>
        </div>

        {/* Footer switch card */}
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl py-5 text-center text-sm shadow-sm">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-ig-blue hover:text-ig-blueHover"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

