import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import "jspdf-autotable";

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

  const signup = async (name, email, password, role) => {
    try {
      const response = await axios.post(`${API}/auth/signup`, { name, email, password, role });
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
        <span className="font-semibold text-purple-600">Datateam-STC AP</span>
      </p>
    </motion.div>
  );
};

// Login Component
const Login = ({ onSwitchToSignup }) => {
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
            className={`${isDark ? 'bg-gray-700' : 'bg-white'} rounded-2xl p-4 inline-block shadow-lg mb-4`}
          >
            <img 
              src="https://showtimeconsulting.in/images/settings/2fd13f50.png" 
              alt="Showtime Consulting" 
              className="w-16 h-16 object-contain mx-auto"
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

        <div className="text-center mt-6">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Don't have an account? </span>
          <button
            onClick={onSwitchToSignup}
            className="text-purple-600 hover:text-purple-700 font-medium transition-all duration-200"
          >
            Create Account
          </button>
        </div>
      </div>
      <Footer />
    </motion.div>
  );
};

// Signup Component
const Signup = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { isDark, toggleTheme } = useTheme();

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
    
    const result = await signup(name, email, password, role);
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
            className={`${isDark ? 'bg-gray-700' : 'bg-white'} rounded-2xl p-4 inline-block shadow-lg mb-4`}
          >
            <img 
              src="https://showtimeconsulting.in/images/settings/2fd13f50.png" 
              alt="Showtime Consulting" 
              className="w-16 h-16 object-contain mx-auto"
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
              onChange={(e) => setRole(e.target.value)}
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

  const sections = [
    { id: 'welcome', label: 'Welcome', icon: '🏠' },
    { id: 'daily-report', label: 'Daily Report', icon: '📝' },
    { id: 'team-report', label: "RM's Team Report", icon: '👥' },
    { id: 'summary-report', label: 'Summary Report', icon: '📊' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${
        isDark ? 'bg-gray-800 text-white' : 'bg-white'
      } rounded-2xl shadow-lg p-6 mb-6`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
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
        
        <div className="flex items-center space-x-4">
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
            className="text-red-600 hover:text-red-700 text-sm transition-all duration-200"
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
      
      <div className="flex space-x-2 mt-6">
        {sections.map((section) => (
          <motion.button
            key={section.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
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
    return selectedDepartment ? Object.keys(departments[selectedDepartment] || {}) : [];
  };

  const getManagers = () => {
    if (selectedDepartment && selectedTeam) {
      return departments[selectedDepartment][selectedTeam] || [];
    }
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
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSelectedManager('');
              }}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              required
              disabled={!selectedDepartment}
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
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              required
              disabled={!selectedTeam}
            >
              <option value="">Select Reporting Manager</option>
              {getManagers().map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
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
              onChange={(e) => setEmployeeName(e.target.value)}
              className={`w-full px-4 py-3 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white'
              } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Enter your full name"
              required
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

// Daily Report Component
const DailyReport = () => {
  const { user, token } = useAuth();
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
    return selectedDepartment ? Object.keys(departments[selectedDepartment] || {}) : [];
  };

  const getManagers = () => {
    if (selectedDepartment && selectedTeam) {
      return departments[selectedDepartment][selectedTeam] || [];
    }
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
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Daily Work Report</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedTeam('');
                setSelectedManager('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Select Department</option>
              {Object.keys(departments).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team *
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSelectedManager('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              disabled={!selectedDepartment}
            >
              <option value="">Select Team</option>
              {getTeams().map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reporting Manager *
            </label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              disabled={!selectedTeam}
            >
              <option value="">Select Reporting Manager</option>
              {getManagers().map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee Name *
            </label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <div className="max-w-xs">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks & Status</h3>
          
          {tasks.map((task, index) => (
            <div key={task.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="lg:col-span-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Details {index + 1} *
                </label>
                <textarea
                  value={task.details}
                  onChange={(e) => updateTask(task.id, 'details', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter detailed task description..."
                  rows="3"
                  required
                />
              </div>
              
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="w-full py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition duration-200"
                  disabled={tasks.length === 1}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addTask}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition duration-200"
          >
            ➕ Add New Task
          </button>
        </div>

        {message && (
          <div className={`text-center p-3 rounded-lg ${
            message.includes('successfully') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : '📋 Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Team Report Component
const TeamReport = () => {
  const { user, token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState({});
  const [filters, setFilters] = useState({
    department: '',
    team: '',
    manager: ''
  });
  const [editingReport, setEditingReport] = useState(null);
  const [editTasks, setEditTasks] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchDepartments();
    fetchStatusOptions();
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
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'All') params.append(key, value);
      });

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

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'All') params.append(key, value);
      });

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
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">
        RM's Team Work Report
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {Object.keys(departments).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Team
          </label>
          <select
            value={filters.team}
            onChange={(e) => setFilters({
              ...filters,
              team: e.target.value,
              manager: ''
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={!filters.department}
          >
            <option value="">All Teams</option>
            {getTeams().map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Reporting Manager
          </label>
          <select
            value={filters.manager}
            onChange={(e) => setFilters({
              ...filters,
              manager: e.target.value
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={!filters.team}
          >
            <option value="">All Reporting Managers</option>
            {getManagers().map(manager => (
              <option key={manager} value={manager}>{manager}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={exportCSV}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition duration-200"
        >
          📄 Export CSV
        </button>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No reports found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Date</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Employee Name</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Department</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Team</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Reporting Manager</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Status</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Tasks</th>
                {user?.role === 'manager' && (
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3">{report.date}</td>
                  <td className="border border-gray-300 px-4 py-3">{report.employee_name}</td>
                  <td className="border border-gray-300 px-4 py-3">{report.department}</td>
                  <td className="border border-gray-300 px-4 py-3">{report.team}</td>
                  <td className="border border-gray-300 px-4 py-3">{report.reporting_manager}</td>
                  <td className="border border-gray-300 px-4 py-3">
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
                  <td className="border border-gray-300 px-4 py-3">
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
                              className="flex-1 px-2 py-1 border rounded text-sm"
                              rows="2"
                            />
                            <select
                              value={task.status}
                              onChange={(e) => {
                                const newTasks = [...editTasks];
                                newTasks[idx].status = e.target.value;
                                setEditTasks(newTasks);
                              }}
                              className="px-2 py-1 border rounded text-sm"
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
                    <td className="border border-gray-300 px-4 py-3">
                      {editingReport === report.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdits(report.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingReport(null)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(report)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Summary Report Component
const SummaryReport = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState({});
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchReports();
  }, []);

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

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (selectedDepartment && selectedDepartment !== 'All Departments') {
        params.append('department', selectedDepartment);
      }

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

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedDepartment('');
  };

  const exportPDF = async () => {
    // Note: This is a placeholder. In a real implementation, you'd use a library like jsPDF
    alert('PDF export functionality would be implemented here using a PDF generation library');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Summary Report</h2>
      
      <p className="text-gray-600 mb-8">
        Hierarchical view: Date → Department → Team → Manager → Employee → Tasks → Status
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Department
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {Object.keys(departments).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={fetchReports}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200"
        >
          🔍 Apply Filters
        </button>
        <button
          onClick={clearFilters}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition duration-200"
        >
          🗑️ Clear Filters
        </button>
        <button
          onClick={exportPDF}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200"
        >
          📄 Export PDF
        </button>
      </div>

      {/* Reports Display */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-gray-500">Loading reports...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-gray-500 text-lg font-medium">No reports available</div>
          <div className="text-gray-400 mt-2">Submit some reports to see the team summary</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-800">{reports.length}</div>
              <div className="text-sm text-blue-600">Total Reports</div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-800">
                {reports.reduce((acc, report) => acc + report.tasks.filter(task => task.status === 'Completed').length, 0)}
              </div>
              <div className="text-sm text-green-600">Completed Tasks</div>
            </div>
            
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-800">
                {reports.reduce((acc, report) => acc + report.tasks.filter(task => task.status === 'WIP').length, 0)}
              </div>
              <div className="text-sm text-yellow-600">WIP Tasks</div>
            </div>
            
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-800">
                {reports.reduce((acc, report) => acc + report.tasks.filter(task => task.status === 'Delayed').length, 0)}
              </div>
              <div className="text-sm text-red-600">Delayed Tasks</div>
            </div>
          </div>

          {/* Detailed Reports */}
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{report.employee_name}</h4>
                    <p className="text-gray-600">
                      {report.department} → {report.team} → {report.reporting_manager}
                    </p>
                    <p className="text-sm text-gray-500">Date: {report.date}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    Submitted: {new Date(report.submitted_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {report.tasks.map((task, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm">{task.details}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ml-4 ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'WIP' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [activeSection, setActiveSection] = useState('welcome');

  return (
    <AuthProvider>
      <AppContent 
        isLogin={isLogin} 
        setIsLogin={setIsLogin}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
    </AuthProvider>
  );
};

const AppContent = ({ isLogin, setIsLogin, activeSection, setActiveSection }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return isLogin ? (
      <Login onSwitchToSignup={() => setIsLogin(false)} />
    ) : (
      <Signup onSwitchToLogin={() => setIsLogin(true)} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Navigation activeSection={activeSection} setActiveSection={setActiveSection} />
        
        {activeSection === 'welcome' && <Welcome />}
        {activeSection === 'daily-report' && <DailyReport />}
        {activeSection === 'team-report' && <TeamReport />}
        {activeSection === 'summary-report' && <SummaryReport />}
      </div>
    </div>
  );
};

export default App;