import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    fullName: '',
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (!form.fullName.trim()) {
      next.fullName = 'Full name is required';
    }
    const uname = form.username.trim().toLowerCase();
    if (uname.length < 2 || !/^[a-z0-9._]+$/.test(uname)) {
      next.username = 'Use lowercase letters, numbers, periods, or underscores';
    }
    if (form.password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
      });
      toast.success('Account created! Welcome to Instagram.');
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px] space-y-3">
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-8 py-9 shadow-sm">
          <h1 className="font-logo text-5xl text-center mb-3 select-none text-neutral-900 dark:text-white">
            Instagram
          </h1>
          <p className="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-6">
            Sign up to see photos, reels, and stories from your friends.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="Email"
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-500"
              />
              {errors.email && (
                <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                placeholder="Full Name"
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-500"
              />
              {errors.fullName && (
                <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                value={form.username}
                onChange={handleChange('username')}
                placeholder="Username"
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-500"
              />
              {errors.username && (
                <p className="text-[11px] text-red-500 mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Password (min. 6 characters)"
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-500"
              />
              {errors.password && (
                <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {serverError && (
              <p className="text-xs text-red-500 font-medium text-center">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 mt-1 rounded-lg bg-ig-blue hover:bg-ig-blueHover disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl py-5 text-center text-sm shadow-sm">
          Have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-ig-blue hover:text-ig-blueHover"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

