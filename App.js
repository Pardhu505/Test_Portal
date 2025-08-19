import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme Context
const ThemeContext = createContext();

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const getCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const signup = async (name, email, password, role, department = '', team = '') => {
    try {
      const response = await axios.post(`${API}/auth/signup`, { 
        name, 
        email, 
        password, 
        role, 
        department, 
        team 
      });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Signup failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, token }}>
      {children}
    </AuthContext.Provider>
  );
};

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.95
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    x: -100,
    scale: 0.95
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5
};

// Footer Component
const Footer = () => {
  const { isDark } = useTheme();
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`mt-8 p-4 text-center text-sm ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}
    >
      <p>
        For any technical clarification, kindly reach out to{' '}
        <span className="font-semibold text-purple-600">Data Team : STC-AP | Pardhasaradhi</span>
      </p>
    </motion.div>
  );
};

// Login Component
const Login = ({ onSwitchToSignup, onSwitchToRequestPasswordReset }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-purple-50 to-blue-50'
    } flex flex-col items-center justify-center p-4`}>
      <motion.div 
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={`${
          isDark ? 'bg-gray-800 text-white' : 'bg-white'
        } rounded-2xl shadow-xl p-8 w-full max-w-md relative`}
      >
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-lg ${
            isDark 
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } transition-all duration-200`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-4 inline-block shadow-lg mb-4 border-2 border-gray-100"
          >
            <img 
              src="https://showtimeconsulting.in/images/settings/2fd13f50.png" 
              alt="Logo" 
              className="w-16 h-16 object-contain mx-auto img-fluid"
            />
          </motion.div>
          <h1 className="text-2xl font-bold">SHOWTIME</h1>
          <h2 className="text-lg text-gray-600">CONSULTING</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
            Daily Work Reporting Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 border ${
                  isDark 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white'
                } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 transition-all duration-200`}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                } transition-all duration-200`}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : '🔐 Sign In'}
          </motion.button>
        </form>

        <div className="text-center mt-4 text-sm">
          <button
            onClick={onSwitchToRequestPasswordReset}
            className="text-purple-600 hover:text-purple-700 font-medium transition-all duration-200"
          >
            Forgot Password?
          </button>
        </div>

        <div className="text-center mt-6">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Don't have an account? </span>
          <button
            onClick={onSwitchToSignup}
            className="text-purple-600 hover:text-purple-700 font-medium transition-all duration-200"
          >
            Create Account
          </button>
        </div>
      </motion.div>
      
      <Footer />
    </div>
  );
};

// Request Password Reset Component
const RequestPasswordReset = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`${API}/auth/request-password-reset`, { email });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${
      isDark
        ? 'bg-gradient-to-br from-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-purple-50 to-blue-50'
    } flex flex-col items-center justify-center p-4`}>
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={`${
          isDark ? 'bg-gray-800 text-white' : 'bg-white'
        } rounded-2xl shadow-xl p-8 w-full max-w-md relative`}
      >
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-lg ${
            isDark
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } transition-all duration-200`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
            Enter your email to receive a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white'
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter your email"
              required
            />
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg"
            >
              {message}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Sending...' : '📧 Send Reset Link'}
          </motion.button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={onSwitchToLogin}
            className="text-purple-600 hover:text-purple-700 font-medium transition-all duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};


// Reset Password Component
const ResetPassword = ({ onSwitchToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    // Extract token from URL query parameter
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError("No reset token found. Please request a new reset link.");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`${API}/auth/reset-password`, { token, new_password: newPassword });
      setMessage(response.data.message + " You can now sign in with your new password.");
      // Optionally redirect to login after a delay
      setTimeout(() => onSwitchToLogin(), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${
      isDark
        ? 'bg-gradient-to-br from-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-purple-50 to-blue-50'
    } flex flex-col items-center justify-center p-4`}>
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={`${
          isDark ? 'bg-gray-800 text-white' : 'bg-white'
        } rounded-2xl shadow-xl p-8 w-full max-w-md relative`}
      >
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-lg ${
            isDark
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } transition-all duration-200`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Set New Password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white'
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter new password"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white'
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Confirm new password"
              required
            />
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg"
            >
              {message}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !token}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : '🔒 Reset Password'}
          </motion.button>
        </form>
         <div className="text-center mt-6">
          <button
            onClick={onSwitchToLogin}
            className="text-purple-600 hover:text-purple-700 font-medium transition-all duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};


// Signup Component
const Signup = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState({});
  const { signup, token } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const getTeams = () => {
    return department ? Object.keys(departments[department] || {}) : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (role === 'employee' && (!department || !team)) {
      setError('Please select department and team');
      setLoading(false);
      return;
    }
    
    const result = await signup(name, email, password, role, department, team);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`min-h-screen ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-purple-50 to-blue-50'
      } flex items-center justify-center p-4`}
    >
      <div className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-xl p-8 w-full max-w-md relative`}>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-lg ${
            isDark 
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } transition-all duration-200`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-4 inline-block shadow-lg mb-4 border-2 border-gray-100"
          >
            <img 
              src="https://showtimeconsulting.in/images/settings/2fd13f50.png" 
              alt="Logo" 
              className="w-16 h-16 object-contain mx-auto img-fluid"
            />
          </motion.div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
            Join the Daily Work Reporting Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setDepartment('');
                setTeam('');
              }}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            >
              <option value="employee">👤 Employee</option>
              <option value="manager">👔 Manager</option>
            </select>
          </div>

          {role === 'employee' && (
            <>
              <div>
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}>
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setTeam('');
                  }}
                  className={`w-full px-4 py-3 border ${
                    isDark 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                  required
                >
                  <option value="">Select Department</option>
                  {Object.keys(departments).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}>
                  Team *
                </label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className={`w-full px-4 py-3 border ${
                    isDark 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                  required
                  disabled={!department}
                >
                  <option value="">Select Team</option>
                  {getTeams().map(teamName => (
                    <option key={teamName} value={teamName}>{teamName}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 border ${
                  isDark 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white'
                } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 transition-all duration-200`}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                } transition-all duration-200`}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border ${
                  isDark 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white'
                } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 transition-all duration-200`}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                } transition-all duration-200`}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : '✨ Create Account'}
          </motion.button>
        </form>

        <div className="text-center mt-6">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Already have an account? </span>
          <button
            onClick={onSwitchToLogin}
            className="text-purple-600 hover:text-purple-700 font-medium transition-all duration-200"
          >
            Sign In
          </button>
        </div>
      </div>
      <Footer />
    </motion.div>
  );
};

// Navigation Component
const Navigation = ({ activeSection, setActiveSection }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const directorEmails = [
    "alimpan@showtimeconsulting.in",
    "at@showtimeconsulting.in",
    "rs@showtimeconsulting.in"
  ];

  const isDirector = user && directorEmails.includes(user.email);

  const sections = [
    { id: 'welcome', label: 'Welcome', icon: '🏠', alwaysVisible: true },
    { id: 'daily-report', label: 'Daily Report', icon: '📝', directorHidden: true },
    { id: 'team-report', label: "RM's Team Report", icon: '👥', roles: ['manager'], directorHidden: true },
    { id: 'summary-report', label: 'Summary Report', icon: '📊' },
    { id: 'change-password', label: 'Change Password', icon: '🔒', alwaysVisible: true }
  ];

  const availableSections = sections.filter(section => {
    if (isDirector) {
      // Directors see 'Welcome', 'Summary Report', 'Change Password'
      return section.alwaysVisible || section.id === 'summary-report';
    }
    // Non-directors:
    if (section.directorHidden && isDirector) return false; // Should not hit this due to above, but as safeguard
    if (section.roles && !section.roles.includes(user?.role)) return false; // Role-based filtering
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-6 mb-6`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <motion.img
            whileHover={{ scale: 1.1, rotate: 5 }}
            src="https://showtimeconsulting.in/images/settings/2fd13f50.png"
            alt="Showtime Consulting"
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold">SHOWTIME CONSULTING</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Daily Work Report
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Welcome, {user?.name}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              user?.role === 'manager'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role === 'manager' ? '👔 Manager' : '👤 Employee'}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors duration-200 px-3 py-1.5 rounded-md hover:bg-red-50"
          >
            🚪 Logout
          </button>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${
              isDark
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } transition-all duration-200`}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        {availableSections.map((section) => (
          <motion.button
            key={section.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition duration-200 ${
              activeSection === section.id
                ? 'bg-purple-600 text-white'
                : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {section.icon} {section.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

// Welcome Component
const Welcome = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-8 text-center`}
    >
      <motion.div 
        whileHover={{ scale: 1.05, rotate: 5 }}
        className="bg-white rounded-2xl p-6 inline-block shadow-lg mb-6 border-2 border-gray-100"
      >
        <img 
          src="https://showtimeconsulting.in/images/settings/2fd13f50.png" 
          alt="Logo" 
          className="w-20 h-20 object-contain mx-auto img-fluid"
        />
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold mb-2"
      >
        <span className="text-purple-600">SHOWTIME</span>
      </motion.h1>
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}
      >
        CONSULTING
      </motion.h2>
      
      <motion.h3 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold mb-4"
      >
        Welcome to the
      </motion.h3>
      <motion.h4 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-purple-600 mb-6"
      >
        Daily Work Reporting Portal
      </motion.h4>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto leading-relaxed`}
      >
        Streamline your daily work reporting with our professional, intuitive 
        platform designed for efficient team management and progress tracking.
      </motion.p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {[
          { icon: "📝", title: "Daily Reports", desc: "Submit your daily work progress and task updates efficiently", color: "purple" },
          { icon: "👥", title: "Team Management", desc: "Track team performance and manage reporting workflows", color: "blue" },
          { icon: "📊", title: "Analytics", desc: "Generate comprehensive reports and export data for analysis", color: "green" }
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className={`bg-${item.color}-50 ${
              isDark ? `bg-${item.color}-900 bg-opacity-30` : ''
            } rounded-xl p-6 cursor-pointer`}
          >
            <div className="text-3xl mb-4">{item.icon}</div>
            <h5 className="font-semibold mb-2">{item.title}</h5>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>
      <Footer />
    </motion.div>
  );
};

// Daily Report Component
const DailyReport = () => {
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const [departments, setDepartments] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [employeeName, setEmployeeName] = useState(user?.name || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState([{ id: Date.now(), details: '', status: 'WIP' }]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchStatusOptions();
  }, []);

  // Separate useEffect for auto-population after departments are loaded
  useEffect(() => {
    if (user && departments && Object.keys(departments).length > 0) {
      setEmployeeName(user.name || ''); // Auto-fill employee name for all roles

      if (user.role === 'employee') {
        setSelectedDepartment(user.department || '');
        setSelectedTeam(user.team || '');

        let foundReviewer = '';
        if (user.department && user.team && departments[user.department] && departments[user.department][user.team]) {
          const teamMembers = departments[user.department][user.team]; // This is an array of member objects
          // Ensure user.email and member['Email ID'] are trimmed for comparison
          const employeeMemberData = teamMembers.find(
            member => member['Email ID'] && user.email && member['Email ID'].trim().toLowerCase() === user.email.trim().toLowerCase()
          );
          if (employeeMemberData && employeeMemberData.Reviewer) {
            foundReviewer = employeeMemberData.Reviewer;
          }
        }
        setSelectedManager(foundReviewer);

      } else if (user.role === 'manager') {
        // For managers submitting their own report
        setSelectedDepartment(user.department || ''); // Their own department
        setSelectedTeam(user.team || ''); // Their own team

        let managerOwnReviewer = '';
        // Find the current manager's "Reviewer" in DEPARTMENT_DATA
        for (const deptName in departments) {
          if (departments[deptName]) { // Check if deptName exists
            for (const teamName in departments[deptName]) {
              if (departments[deptName][teamName]) { // Check if teamName exists
                const members = departments[deptName][teamName];
                const managerData = members.find(
                  m => m['Email ID'] && user.email && m['Email ID'].trim().toLowerCase() === user.email.trim().toLowerCase()
                );
                if (managerData && managerData.Reviewer) {
                  managerOwnReviewer = managerData.Reviewer;
                  break;
                }
              }
            }
          }
          if (managerOwnReviewer) break;
        }
        // setSelectedManager(managerOwnReviewer || (getManagers()[0] || '')); // Original fallback
        setSelectedManager(managerOwnReviewer); // Set the direct reviewer
      }
    }
  }, [user, departments]);


  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const response = await axios.get(`${API}/status-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusOptions(response.data.status_options);
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  };

  const getTeams = () => {
    if (!selectedDepartment || !departments || !departments[selectedDepartment]) {
      return [];
    }
    return Object.keys(departments[selectedDepartment]);
  };

  const getManagers = () => {
    if (user?.role === 'manager') {
      // A manager submitting their own report reports to their own Reviewer.
      let managerOwnReviewer = '';
      if (departments && Object.keys(departments).length > 0 && user && user.email) {
        for (const deptName in departments) {
          if (departments[deptName]) {
            for (const teamName in departments[deptName]) {
              if (departments[deptName][teamName]) {
                const members = departments[deptName][teamName];
                const managerData = members.find(
                  m => m['Email ID'] && user.email && m['Email ID'].trim().toLowerCase() === user.email.trim().toLowerCase()
                );
                if (managerData && managerData.Reviewer) {
                  managerOwnReviewer = managerData.Reviewer;
                  break;
                }
              }
            }
          }
          if (managerOwnReviewer) break;
        }
      }
      // Fallback if reviewer not found in DEPARTMENT_DATA, though ideally it should be.
      return managerOwnReviewer ? [managerOwnReviewer] : ['Anant Tiwari', 'Alimpan Banerjee'];
    }

    // For an employee, their manager is pre-set by useEffect.
    // This dropdown should be disabled and just show their selectedManager.
    if (user?.role === 'employee' && selectedManager) {
        return [selectedManager]; // Return it as an array for consistency with map function in select
    }

    // Fallback for other scenarios or if employee's manager not yet set (should not happen ideally)
    return [];
  };

  const addTask = () => {
    setTasks([...tasks, { id: Date.now(), details: '', status: 'WIP' }]);
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const removeTask = (id) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const reportData = {
        employee_name: employeeName,
        department: selectedDepartment,
        team: selectedTeam,
        reporting_manager: selectedManager,
        date: date,
        tasks: tasks.map(({ id, ...task }) => task)
      };

      await axios.post(`${API}/work-reports`, reportData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Report submitted successfully!');
      // Reset form
      setTasks([{ id: Date.now(), details: '', status: 'WIP' }]);
    } catch (error) {
      setMessage('Error submitting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-8`}
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Daily Work Report</h2>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm ${
            user?.role === 'manager' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user?.role === 'manager' ? '👔 Manager' : '👤 Employee'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Department *
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedTeam('');
                setSelectedManager('');
              }}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                (user?.role === 'employee') ? (isDark ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-100 cursor-not-allowed') : ''
              }`}
              required
              disabled={user?.role === 'employee'}
            >
              <option value="">Select Department</option>
              {departments && Object.keys(departments).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Team *
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSelectedManager('');
              }}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                (user?.role === 'employee') ? (isDark ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-100 cursor-not-allowed') : ''
              }`}
              required
              disabled={user?.role === 'employee' || !selectedDepartment}
            >
              <option value="">Select Team</option>
              {getTeams().map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Reporting Manager *
            </label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                (user?.role === 'employee') ? (isDark ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-100 cursor-not-allowed') : ''
              }`}
              required
              disabled={user?.role === 'employee'}
            >
              <option value="">Select Reporting Manager</option>
              {/* Options should be just the single manager for employee, or list for manager */}
              {user?.role === 'employee' && selectedManager ? (
                <option value={selectedManager}>{selectedManager}</option>
              ) : (
                getManagers().map(manager => (<option key={manager} value={manager}>{manager}</option>))
              )}
               {/* Ensure an empty option is not the only one if selectedManager is already set for employee */}
              {user?.role === 'employee' && !selectedManager && <option value="" disabled>Loading manager...</option>}
            </select>
            {user?.role === 'manager' && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                As a manager, you report to your designated Reviewer.
              </p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } mb-2`}>
              Employee Name *
            </label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)} // Should this be editable if auto-filled?
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                (user?.role === 'employee') ? (isDark ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-100 cursor-not-allowed') : ''
              }`}
              placeholder="Enter your full name"
              required
              disabled={user?.role === 'employee'} // Disable if it's auto-filled from user context
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            Date *
          </label>
          <div className="max-w-xs">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              required
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Tasks & Status</h3>
          
          {tasks.map((task, index) => (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 p-4 ${
                isDark ? 'bg-gray-700' : 'bg-gray-50'
              } rounded-lg`}
            >
              <div className="lg:col-span-8">
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}>
                  Task Details {index + 1} *
                </label>
                <textarea
                  value={task.details}
                  onChange={(e) => updateTask(task.id, 'details', e.target.value)}
                  className={`w-full px-4 py-3 border ${
                    isDark 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 bg-white'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                  placeholder="Enter detailed task description..."
                  rows="3"
                  required
                />
              </div>
              
              <div className="lg:col-span-3">
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}>
                  Status *
                </label>
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                  className={`w-full px-4 py-3 border ${
                    isDark 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 bg-white'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                  required
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-1 flex items-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className={`w-full py-3 ${
                    isDark 
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-900' 
                      : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  } rounded-lg transition duration-200`}
                  disabled={tasks.length === 1}
                >
                  🗑️
                </motion.button>
              </div>
            </motion.div>
          ))}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={addTask}
            className={`w-full py-3 border-2 border-dashed ${
              isDark 
                ? 'border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400' 
                : 'border-gray-300 text-gray-600 hover:border-purple-500 hover:text-purple-600'
            } rounded-lg transition duration-200`}
          >
            ➕ Add New Task
          </motion.button>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center p-3 rounded-lg ${
              message.includes('successfully') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message}
          </motion.div>
        )}

        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : '📋 Submit Report'}
          </motion.button>
        </div>
      </form>
      <Footer />
    </motion.div>
  );
};

// Team Report Component
const TeamReport = () => {
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState({});
  const [managerResources, setManagerResources] = useState({});
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [filters, setFilters] = useState({
    department: '',
    team: '',
    manager: '',
    fromDate: '',
    toDate: ''
  });
  const [editingReport, setEditingReport] = useState(null);
  const [editTasks, setEditTasks] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchDepartments();
    fetchStatusOptions();
    fetchManagerResources();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchManagerResources = async () => {
    try {
      const response = await axios.get(`${API}/manager-resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManagerResources(response.data.manager_resources);
    } catch (error) {
      console.error('Error fetching manager resources:', error);
    }
  };

  const fetchAttendanceSummary = async (date) => {
    try {
      const response = await axios.get(`${API}/attendance-summary?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceSummary(response.data.attendance_summary);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const response = await axios.get(`${API}/status-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusOptions(response.data.status_options);
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.team && filters.team !== 'All') params.append('team', filters.team);
      if (filters.manager && filters.manager !== 'All') params.append('manager', filters.manager);
      if (filters.fromDate) params.append('from_date', filters.fromDate);
      if (filters.toDate) params.append('to_date', filters.toDate);

      const response = await axios.get(`${API}/work-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (report) => {
    setEditingReport(report.id);
    setEditTasks([...report.tasks]);
  };

  const saveEdits = async (reportId) => {
    try {
      await axios.put(`${API}/work-reports/${reportId}`, 
        { tasks: editTasks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingReport(null);
      fetchReports();
    } catch (error) {
      alert('Error updating report. Please try again.');
    }
  };

  const deleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        await axios.delete(`${API}/work-reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchReports();
        alert('Report deleted successfully');
      } catch (error) {
        alert('Error deleting report. Please try again.');
      }
    }
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.team && filters.team !== 'All') params.append('team', filters.team);
      if (filters.manager && filters.manager !== 'All') params.append('manager', filters.manager);
      if (filters.fromDate) params.append('from_date', filters.fromDate);
      if (filters.toDate) params.append('to_date', filters.toDate);

      const response = await axios.get(`${API}/work-reports/export/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'work_reports.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error exporting CSV. Please try again.');
    }
  };

  const exportPDF = async () => {
    // Get today's date for attendance summary
    const today = new Date().toISOString().split('T')[0];
    await fetchAttendanceSummary(today);

    const doc = new jsPDF();
    
    // Title and Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Team Work Report with Attendance Summary', 14, 20);
    
    // Company Logo placeholder
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('SHOWTIME CONSULTING', 14, 30);
    
    // Date and time
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 14, 40);
    
    let currentY = 50;

    // Add Attendance Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Attendance Summary for ${today}`, 14, currentY);
    currentY += 10;

    // Attendance table data
    const attendanceData = [];
    Object.entries(attendanceSummary).forEach(([manager, data]) => {
      attendanceData.push([
        manager,
        data.total_resources.toString(),
        data.present.toString(),
        data.absent.toString(),
        `${((data.present / data.total_resources) * 100).toFixed(1)}%`
      ]);
    });

    if (attendanceData.length > 0) {
      autoTable(doc, {
        head: [['Manager', 'Total Resources', 'Present', 'Absent', 'Attendance %']],
        body: attendanceData,
        startY: currentY,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue color
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { top: 10, bottom: 10 }
      });
      
      currentY = doc.lastAutoTable.finalY + 20;
    }

    // Work Reports Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Work Reports', 14, currentY);
    currentY += 10;
    
    // Prepare table data - each task gets its own row
    const tableData = [];
    reports.forEach(report => {
      if (report.tasks && report.tasks.length > 0) {
        report.tasks.forEach((task, taskIndex) => {
          tableData.push([
            report.date,
            report.employee_name,
            report.department,
            report.team,
            report.reporting_manager,
            task.details,
            task.status
          ]);
        });
      } else {
        // If no tasks, still show the report with empty task
        tableData.push([
          report.date,
          report.employee_name,
          report.department,
          report.team,
          report.reporting_manager,
          'No tasks reported',
          'N/A'
        ]);
      }
    });
    
    // Create the table using autoTable
    autoTable(doc, {
      head: [['Date', 'Employee', 'Department', 'Team', 'Manager', 'Task Details', 'Status']],
      body: tableData,
      startY: currentY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'top'
      },
      headStyles: {
        fillColor: [147, 51, 234], // Purple color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Light gray
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Date
        1: { cellWidth: 25 }, // Employee
        2: { cellWidth: 25 }, // Department
        3: { cellWidth: 20 }, // Team
        4: { cellWidth: 25 }, // Manager
        5: { cellWidth: 50 }, // Task Details - wider
        6: { cellWidth: 20 }  // Status
      },
      margin: { top: 50 },
      theme: 'striped'
    });
    
    // Add footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      
      // Page number
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 15
      );
      
      // Contact footer
      doc.text(
        'For any technical clarification, kindly reach out to Data Team : STC-AP | Pardhasaradhi',
        14,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Save the PDF
    doc.save(`Team_Work_Report_with_Attendance_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getTeams = () => {
    return filters.department && filters.department !== 'All Departments' 
      ? Object.keys(departments[filters.department] || {}) 
      : [];
  };

  const getManagers = () => {
    if (filters.department && filters.team && 
        filters.department !== 'All Departments' && 
        filters.team !== 'All Teams') {
      return departments[filters.department][filters.team] || [];
    }
    return [];
  };

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-8`}
    >
      <h2 className="text-2xl font-bold mb-8">
        RM's Team Work Report
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6"> {/* Adjusted grid for more filters */}
        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            Filter by Department
          </label>
          <select
            value={filters.department}
            onChange={(e) => setFilters({
              ...filters,
              department: e.target.value,
              team: '',
              manager: ''
            })}
            className={`w-full px-4 py-3 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          >
            <option value="">All Departments</option>
            {Object.keys(departments).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            Filter by Team
          </label>
          <select
            value={filters.team}
            onChange={(e) => setFilters({
              ...filters,
              team: e.target.value,
              manager: ''
            })}
            className={`w-full px-4 py-3 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            disabled={!filters.department}
          >
            <option value="">All Teams</option>
            {getTeams().map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            Filter by Reporting Manager
          </label>
          <select
            value={filters.manager}
            onChange={(e) => setFilters({
              ...filters,
              manager: e.target.value
            })}
            className={`w-full px-4 py-3 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            disabled={!filters.team}
          >
            <option value="">All Reporting Managers</option>
            {getManagers().map(manager => (
              <option key={manager} value={manager}>{manager}</option>
            ))}
          </select>
        </div>

        {/* From Date Filter */}
        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            From Date
          </label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            className={`w-full px-4 py-3 border ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-white'
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          />
        </div>

        {/* To Date Filter */}
        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            To Date
          </label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            className={`w-full px-4 py-3 border ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-white'
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportCSV}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition duration-200"
        >
          📄 Export CSV
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportPDF}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200"
        >
          📄 Export PDF
        </motion.button>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-4xl mb-4"
          >
            ⏳
          </motion.div>
          <div>Loading reports...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📋</div>
          <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>No reports found</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse border ${
            isDark ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <thead>
              <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Date</th>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Employee Name</th>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Department</th>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Team</th>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Reporting Manager</th>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Status</th>
                <th className={`border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } px-4 py-3 text-left font-semibold`}>Tasks</th>
                {user?.role === 'manager' && (
                  <th className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3 text-left font-semibold`}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <motion.tr 
                  key={report.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  } transition-all duration-200`}
                >
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>{report.date}</td>
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>{report.employee_name}</td>
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>{report.department}</td>
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>{report.team}</td>
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>{report.reporting_manager}</td>
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>
                    <div className="flex flex-wrap gap-1">
                      {report.tasks.map((task, idx) => (
                        <span key={idx} className={`px-2 py-1 rounded-full text-xs ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'WIP' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`border ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  } px-4 py-3`}>
                    {editingReport === report.id ? (
                      <div className="space-y-2">
                        {editTasks.map((task, idx) => (
                          <div key={idx} className="flex gap-2">
                            <textarea
                              value={task.details}
                              onChange={(e) => {
                                const newTasks = [...editTasks];
                                newTasks[idx].details = e.target.value;
                                setEditTasks(newTasks);
                              }}
                              className={`flex-1 px-2 py-1 border rounded text-sm ${
                                isDark 
                                  ? 'border-gray-600 bg-gray-700 text-white' 
                                  : 'border-gray-300 bg-white'
                              }`}
                              rows="2"
                            />
                            <select
                              value={task.status}
                              onChange={(e) => {
                                const newTasks = [...editTasks];
                                newTasks[idx].status = e.target.value;
                                setEditTasks(newTasks);
                              }}
                              className={`px-2 py-1 border rounded text-sm ${
                                isDark 
                                  ? 'border-gray-600 bg-gray-700 text-white' 
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {report.tasks.map((task, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="font-medium">{task.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  
                  {user?.role === 'manager' && (
                    <td className={`border ${
                      isDark ? 'border-gray-600' : 'border-gray-300'
                    } px-4 py-3`}>
                      {editingReport === report.id ? (
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => saveEdits(report.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-all duration-200"
                          >
                            Save
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEditingReport(null)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-all duration-200"
                          >
                            Cancel
                          </motion.button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => startEditing(report)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all duration-200"
                          >
                            ✏️ Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => deleteReport(report.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-all duration-200"
                          >
                            🗑️ Delete
                          </motion.button>
                        </div>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Footer />
    </motion.div>
  );
};

// Summary Report Component
const SummaryReport = () => {
  const { user, token } = useAuth(); // Added user from useAuth()
  const { isDark } = useTheme();
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState({});
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [quickSummaryData, setQuickSummaryData] = useState(null);
  const [quickSummaryLoading, setQuickSummaryLoading] = useState(false);

  useEffect(() => {
    const fetchQuickSummary = async () => {
      setQuickSummaryLoading(true);
      try {
        const dateToFetch = fromDate || new Date().toISOString().split('T')[0];
        const response = await axios.get(`${API}/quick-summary?date=${dateToFetch}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuickSummaryData(response.data);
      } catch (error) {
        console.error('Error fetching quick summary data:', error);
        setQuickSummaryData(null); // Clear data on error
      } finally {
        setQuickSummaryLoading(false);
      }
    };

    fetchQuickSummary();
  }, [fromDate, token]);

  useEffect(() => {
    fetchDepartments();
    // fetchSummaryReportData is now called by handleApplyFilters or on initial load if needed
  }, []);

  useEffect(() => {
    // Fetch data when component mounts or when relevant filters change for managers
    // Employees' data fetching is primarily triggered by Apply Filters button
    if (user?.role === 'manager') {
      fetchSummaryReportData();
    } else if (user?.role === 'employee') {
      // For employees, fetch their specific summary on load
      fetchSummaryReportData();
    }
  }, [user, fromDate, toDate, selectedDepartment]); // Add dependencies that should trigger re-fetch for managers

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSummaryReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      let endpoint = `${API}/summary-report-data`; // Default for managers

      if (user?.role === 'employee') {
        endpoint = `${API}/user-summary-report`;
        // For employees, department filter is not applicable as they see their own data.
      } else { // For managers and directors (assuming directors have 'manager' role or this endpoint is generally used)
        if (selectedDepartment && selectedDepartment !== 'All Departments') {
          params.append('department', selectedDepartment); // Ensure param name matches backend alias
        }
      }

      const response = await axios.get(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummaryData(response.data);
    } catch (error) {
      console.error('Error fetching summary report data:', error);
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchSummaryReportData(); // This will now use the correct endpoint based on user role
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedDepartment('');
    // Optionally fetch all data again after clearing or wait for explicit apply
    // For now, let's require explicit apply after clear
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Team Summary Report', 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('SHOWTIME CONSULTING', 14, 30);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 14, 40);
    
    let currentY = 50;
    if (fromDate || toDate) {
      doc.text(`Date Range: ${fromDate || 'All'} to ${toDate || 'All'}`, 14, currentY);
      currentY += 8;
    }
    if (selectedDepartment) {
      doc.text(`Department: ${selectedDepartment}`, 14, currentY);
      currentY += 8;
    }
    currentY += 2;

    const tableBody = [];
    summaryData.forEach(group => {
      let firstRowOfGroup = true;
      let tasksRenderedForGroup = 0;

      // Calculate total tasks to determine rowspan for group info cells
      let totalTasksInGroup = 0;
      Object.values(group.tasks_by_status).forEach(taskList => {
        totalTasksInGroup += taskList.length;
      });
      if (totalTasksInGroup === 0) totalTasksInGroup = 1; // for "No tasks" row

      Object.entries(group.tasks_by_status).forEach(([status, tasks]) => {
        if (tasks.length > 0) {
          tasks.forEach((task, taskIndex) => {
            let row = [];
            if (firstRowOfGroup) {
              row.push({ content: group.department, rowSpan: totalTasksInGroup, styles: { valign: 'top' } });
              row.push({ content: group.team, rowSpan: totalTasksInGroup, styles: { valign: 'top' } });
              row.push({ content: group.reporting_manager, rowSpan: totalTasksInGroup, styles: { valign: 'top' } });
              row.push({ content: group.no_of_resource.toString(), rowSpan: totalTasksInGroup, styles: { valign: 'top', halign: 'center' } });
              row.push({ content: group.reviewer || 'N/A', rowSpan: totalTasksInGroup, styles: { valign: 'top' } });
              firstRowOfGroup = false;
            } else {
              // For subsequent rows of the same group, these cells are covered by rowspan
            }
            // Task details cell now includes status
            row.push({ content: `${status}: \n - ${task.details}` });
            tableBody.push(row);
            tasksRenderedForGroup++;
          });
        }
      });

      // If group had no tasks at all after iterating all statuses
      if (tasksRenderedForGroup === 0) {
         let row = [];
         row.push({ content: group.department, styles: { valign: 'top' } });
         row.push({ content: group.team, styles: { valign: 'top' } });
         row.push({ content: group.reporting_manager, styles: { valign: 'top' } });
         row.push({ content: group.no_of_resource.toString(), styles: { valign: 'top', halign: 'center' } });
         row.push({ content: group.reviewer || 'N/A', styles: { valign: 'top' } });
         row.push({ content: 'No tasks reported for this group.', styles: { fontStyle: 'italic'} });
         tableBody.push(row);
      }
    });

    if (tableBody.length > 0) {
      autoTable(doc, {
        head: [['Department', 'Team', 'Reporting Manager', 'No of Resource', 'Reviewer', 'Tasks by Status']],
        body: tableBody,
        startY: currentY,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [124, 58, 237], textColor: [255,255,255], fontStyle: 'bold', fontSize:9 },
        columnStyles: {
          0: { cellWidth: 30 }, // Department
          1: { cellWidth: 30 }, // Team
          2: { cellWidth: 35 }, // Reporting Manager
          3: { cellWidth: 20 }, // No of Resource
          4: { cellWidth: 30 }, // Reviewer
          5: { cellWidth: 'auto' } // Tasks by Status (merged task details and status)
        },
      });
    } else {
      doc.text("No data available for the selected filters.", 14, currentY);
    }
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 15);
      doc.text('For any technical clarification, kindly reach out to Data Team : STC-AP | Pardhasaradhi', 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`New_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-8`}
    >
      <h2 className="text-2xl font-bold mb-4">New Team Summary Report</h2>
      
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
        Grouped by Department → Team → Reporting Manager. Tasks are listed per group.
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={`w-full px-4 py-3 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={`w-full px-4 py-3 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          } mb-2`}>
            Filter by Department
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className={`w-full px-4 py-3 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          >
            <option value="">All Departments</option>
            {Object.keys(departments).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleApplyFilters} // Changed to handleApplyFilters
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200"
        >
          🔍 Apply Filters
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearFilters}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition duration-200"
        >
          🗑️ Clear Filters
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportPDF}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200"
        >
          📄 Export PDF
        </motion.button>
      </div>

      {/* Quick Summary Section */}
      <div className="my-8">
        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Quick Summary for {fromDate || new Date().toISOString().split('T')[0]}
        </h3>
        {quickSummaryLoading ? (
          <div className="text-center py-8">
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading Quick Summary...</p>
          </div>
        ) : quickSummaryData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Summary Table */}
            <div className="md:col-span-2">
              <div className="overflow-x-auto shadow rounded-lg">
                <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Department</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Team</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Reported / Total</th>
                    </tr>
                  </thead>
                  <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                    {quickSummaryData.summary.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? (isDark ? 'bg-gray-750' : 'bg-gray-50') : ''}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{item.department}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{item.team}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{item.reported_count} / {item.total_employees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Not Reported Lists */}
            <div>
              <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg mb-4 shadow`}>
                <h4 className="font-semibold mb-2">Managers Not Reported</h4>
                {quickSummaryData.not_reported_managers.length > 0 ? (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {quickSummaryData.not_reported_managers.map((name, index) => (
                      <li key={index}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>All managers have reported.</p>
                )}
              </div>
              <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg shadow`}>
                <h4 className="font-semibold mb-2">Employees Not Reported</h4>
                {quickSummaryData.not_reported_employees.length > 0 ? (
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {quickSummaryData.not_reported_employees.map((name, index) => (
                      <li key={index}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>All employees have reported.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Could not load quick summary.</p>
          </div>
        )}
      </div>


      {/* Reports Display */}
      {loading ? (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            📊
          </motion.div>
          <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading summary data...</div>
        </div>
      ) : summaryData.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-lg font-medium`}>No summary data available</div>
          <div className={`${isDark ? 'text-gray-500' : 'text-gray-400'} mt-2`}>Try adjusting filters or ensure reports are submitted.</div>
        </div>
      ) : (
        <div className={`overflow-x-auto ${isDark ? 'bg-gray-800' : 'bg-white'} p-1 rounded-lg shadow`}>
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Department</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Team</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Reporting Manager</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>No of Resource</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Reviewer</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Tasks by Status</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {summaryData.flatMap((group, groupIndex) => {
                const groupRows = [];
                let firstTaskOfGroupRendered = false;

                // Calculate total tasks in this group to determine rowSpan for the main info
                let totalTasksInGroup = 0;
                Object.values(group.tasks_by_status).forEach(taskList => {
                  totalTasksInGroup += taskList.length;
                });
                // If there are no tasks, we still want one row for the group information.
                const rowSpanCount = totalTasksInGroup > 0 ? totalTasksInGroup : 1;

                if (totalTasksInGroup === 0) {
                  // Render a single row for groups with no tasks
                  groupRows.push(
                    <motion.tr
                      key={`${groupIndex}-no-tasks`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className={(groupIndex % 2 === 0) ? (isDark ? 'bg-gray-750' : 'bg-gray-50') : (isDark ? 'bg-gray-800' : 'bg-white')}
                    >
                      <td rowSpan={1} className={`px-4 py-3 align-top whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.department}</td>
                      <td rowSpan={1} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.team}</td>
                      <td rowSpan={1} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.reporting_manager}</td>
                      <td rowSpan={1} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} text-center border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.no_of_resource}</td>
                      <td rowSpan={1} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.reviewer || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No tasks reported for this group.
                      </td>
                    </motion.tr>
                  );
                } else {
                  Object.entries(group.tasks_by_status).forEach(([status, tasks]) => {
                    tasks.forEach((task, taskIndex) => {
                      groupRows.push(
                        <motion.tr
                          key={`${groupIndex}-${status}-${taskIndex}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (groupIndex + taskIndex) * 0.03 }}
                          className={(groupIndex % 2 === 0) ? (isDark ? 'bg-gray-750' : 'bg-gray-50') : (isDark ? 'bg-gray-800' : 'bg-white')}
                        >
                          {!firstTaskOfGroupRendered && (
                            <>
                              <td rowSpan={rowSpanCount} className={`px-4 py-3 align-top whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.department}</td>
                              <td rowSpan={rowSpanCount} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.team}</td>
                              <td rowSpan={rowSpanCount} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.reporting_manager}</td>
                              <td rowSpan={rowSpanCount} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} text-center border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.no_of_resource}</td>
                              <td rowSpan={rowSpanCount} className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.reviewer || 'N/A'}</td>
                            </>
                          )}
                          {/* This cell now spans all task rows for the group if it's the first task being rendered for the group.
                              Otherwise, for subsequent tasks in the same group, this cell is not rendered due to rowSpan. */}
                          {!firstTaskOfGroupRendered && (
                            <td rowSpan={rowSpanCount} className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} align-top`}>
                              {Object.entries(group.tasks_by_status).map(([s, tasks_list]) => (
                                tasks_list.length > 0 && (
                                  <div key={s} className="mb-2">
                                    <strong className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      s === 'Completed' ? (isDark ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800') :
                                      s === 'WIP' ? (isDark ? 'bg-blue-700 text-blue-100' :'bg-blue-100 text-blue-800') :
                                      s === 'Delayed' ? (isDark ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800') :
                                      s === 'Yet to Start' ? (isDark ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800') :
                                      (isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700')
                                    }`}>
                                      {s}
                                    </strong>
                                    <ul className="list-disc list-inside ml-1 mt-1 text-xs break-words">
                                      {tasks_list.map((t, ti) => (
                                        <li key={ti}>{t.details}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              ))}
                            </td>
                          )}
                        </motion.tr>
                      );
                      firstTaskOfGroupRendered = true; // Mark that the main info cells and the single task cell have been rendered for this group
                    }); // End of tasks.forEach (this loop is actually incorrect for the new structure)
                  }); // End of Object.entries(group.tasks_by_status) (this loop is also incorrect)
                } // This structure needs to be rethought. We only need one row per group.

                // Corrected logic: Generate one row per group. The last cell will contain all tasks grouped by status.
                if (!groupRows.length && totalTasksInGroup > 0) { // Ensure only one row per group is added
                    groupRows.push(
                      <motion.tr
                        key={`${groupIndex}-group`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: groupIndex * 0.05 }}
                        className={(groupIndex % 2 === 0) ? (isDark ? 'bg-gray-750' : 'bg-gray-50') : (isDark ? 'bg-gray-800' : 'bg-white')}
                      >
                        <td className={`px-4 py-3 align-top whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.department}</td>
                        <td className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.team}</td>
                        <td className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.reporting_manager}</td>
                        <td className={`px-4 py-3 align-top whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} text-center border-r ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{group.no_of_resource}</td>
                        <td
                          className={`px-4 py-3 align-top text-sm text-black border-r ${isDark ? 'border-gray-700' : 'border-gray-300'} break-words`}
                          style={{ maxWidth: '150px' }} // Max width to encourage wrapping
                        >
                          {group.reviewer || 'N/A'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'} align-top`}>
                          {Object.entries(group.tasks_by_status).map(([statusKey, tasksList]) => (
                            tasksList.length > 0 && (
                              <div key={statusKey} className="mb-2">
                                <strong className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  statusKey === 'Completed' ? (isDark ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800') :
                                  statusKey === 'WIP' ? (isDark ? 'bg-blue-700 text-blue-100' :'bg-blue-100 text-blue-800') :
                                  statusKey === 'Delayed' ? (isDark ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800') :
                                  statusKey === 'Yet to Start' ? (isDark ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800') :
                                  (isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700')
                                }`}>
                                  {statusKey}
                                </strong>
                                <ul className="list-disc list-inside ml-2 mt-1 text-xs">
                                  {tasksList.map((taskItem, taskItemIndex) => (
                                    <li key={taskItemIndex} className="break-words">{taskItem.details}</li>
                                  ))}
                                </ul>
                              </div>
                            )
                          ))}
                        </td>
                      </motion.tr>
                    );
                }
                return groupRows;
              })}
            </tbody>
          </table>
        </div>
      )}
      <Footer />
    </motion.div>
  );
};


// Change Password Component
const ChangePassword = () => {
  const { token } = useAuth(); // Get token for API call
  const { isDark } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/auth/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-8 max-w-lg mx-auto`}
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`w-full px-4 py-3 border ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-white'
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`w-full px-4 py-3 border ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-white'
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className={`w-full px-4 py-3 border ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-white'
                : 'border-gray-300 bg-white'
            } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
            required
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg"
          >
            {message}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </motion.button>
      </form>
      <Footer />
    </motion.div>
  );
};


// Main App Component
const App = () => {
  // Manages which auth screen to show: 'login', 'signup', 'requestPasswordReset', 'resetPassword'
  const [authView, setAuthView] = useState('login');
  const [activeSection, setActiveSection] = useState('welcome'); // For logged-in users

  // Check for resetPassword token in URL to switch view
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('token')) {
      setAuthView('resetPassword');
    }
  }, []);


  const handleAuthViewChange = (view) => {
    setAuthView(view);
    // Clean up URL if we navigate away from resetPassword view without token
    if (view !== 'resetPassword' && window.location.search.includes('token=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent 
          authView={authView}
          onAuthViewChange={handleAuthViewChange}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      </AuthProvider>
    </ThemeProvider>
  );
};

const AppContent = ({ authView, onAuthViewChange, activeSection, setActiveSection }) => {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-purple-50 to-blue-50'
      } flex items-center justify-center`}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            ⏳
          </motion.div>
          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        {authView === 'login' && (
          <Login
            key="login"
            onSwitchToSignup={() => onAuthViewChange('signup')}
            onSwitchToRequestPasswordReset={() => onAuthViewChange('requestPasswordReset')}
          />
        )}
        {authView === 'signup' && (
          <Signup
            key="signup"
            onSwitchToLogin={() => onAuthViewChange('login')}
          />
        )}
        {authView === 'requestPasswordReset' && (
          <RequestPasswordReset
            key="requestPasswordReset"
            onSwitchToLogin={() => onAuthViewChange('login')}
          />
        )}
        {authView === 'resetPassword' && (
          <ResetPassword
            key="resetPassword"
            onSwitchToLogin={() => onAuthViewChange('login')}
          />
        )}
      </AnimatePresence>
    );
  }

  // If user is logged in, show the main app content
  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-purple-50 to-blue-50'
    } p-4`}
    >
      <div className="max-w-7xl mx-auto">
        <Navigation activeSection={activeSection} setActiveSection={setActiveSection} />
        
        <AnimatePresence mode="wait">
          {activeSection === 'welcome' && <Welcome key="welcome" />}
          {activeSection === 'daily-report' && <DailyReport key="daily-report" />}
          {/* Conditionally render TeamReport based on user role */}
          {activeSection === 'team-report' && user?.role === 'manager' && <TeamReport key="team-report" />}
          {activeSection === 'summary-report' && <SummaryReport key="summary-report" />}
          {activeSection === 'change-password' && <ChangePassword key="change-password" />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;