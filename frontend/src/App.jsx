import React, { useState, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Activity, FileUp, Database, User, LogOut, Menu, X, Home, PanelLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import { removeAuthToken } from './services/api';

import { SidebarContext } from './context/SidebarContext';

function App() {
  const getInitialUser = () => {
    try {
      const savedUser = localStorage.getItem('medfusion_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Failed to parse saved user data:', error);
      localStorage.removeItem('medfusion_user');
      return null;
    }
  };

  const [user, setUser] = useState(getInitialUser);

  const login = (userData) => {
    setUser(userData.user || userData);
    localStorage.setItem('medfusion_user', JSON.stringify(userData.user || userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('medfusion_user');
    removeAuthToken();
  };

  return (
    <Router>
      <AppContent user={user} login={login} logout={logout} />
    </Router>
  );
}

function AppContent({ user, login, logout }) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');
  const isSidebarPage = !!user && (location.pathname.includes('dashboard') || location.pathname.includes('upload') || location.pathname.includes('profile'));
  
  const [sidebarContent, setSidebarContent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  console.log('MedFusion Layout Debug:', {
    pathname: location.pathname,
    hasUser: !!user,
    isSidebarPage: isSidebarPage
  });

  return (
    <SidebarContext.Provider value={{ sidebarContent, setSidebarContent }}>
      <div className="min-vh-100 d-flex flex-column">
        {/* Top Navbar visible on all pages - covers 100% width! */}
        <Navbar user={user} logout={logout} toggleSidebar={toggleSidebar} isSidebarPage={isSidebarPage} />
        
        {/* Main layout underneath the navbar */}
        <div className={`flex-grow-1 d-flex ${isSidebarPage ? 'flex-md-row' : 'flex-column'}`} style={{ minHeight: 0 }}>
          
          {/* Sidebar ONLY on dashboard/profile/upload */}
          {isSidebarPage && <Sidebar user={user} logout={logout} sidebarContent={sidebarContent} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />}
          
          <div className={`flex-grow-1 d-flex flex-column ${isSidebarPage ? 'main-content-wrapper' : ''}`} style={{ minHeight: 0 }}>
            <main className={`container-fluid ${location.pathname === '/upload' ? 'p-2 p-md-3' : 'py-4 px-md-5'} flex-grow-1 d-flex flex-column`} style={{ minHeight: 0 }}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth login={login} />} />
                
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/auth" />} />
                <Route path="/upload" element={user ? <Upload user={user} /> : <Navigate to="/auth" />} />
                <Route path="/vault" element={<Navigate to="/profile" />} />
                <Route path="/profile" element={user ? <Profile user={user} onUserUpdate={login} /> : <Navigate to="/auth" />} />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ user, logout, sidebarContent, isOpen, toggleSidebar }) {
  const location = useLocation();

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'US';
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <button className="btn-icon d-md-none text-white position-absolute end-0 top-0 m-3 z-index-1000" onClick={toggleSidebar}>
        <X size={24} />
      </button>
      <div className="sidebar-menu flex-grow-1 overflow-visible py-2 mt-4 mt-md-0">
        {sidebarContent}
      </div>

      <div className="sidebar-footer">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="avatar-circle">
              {getInitials(user?.full_name, user?.email)}
            </div>
            <div className="user-details overflow-hidden" style={{ maxWidth: '175px' }}>
              <span className="text-white fw-bold d-block text-truncate" style={{ fontSize: '1.05rem' }}>
                {user?.full_name || user?.email || 'User'}
              </span>
              <span className="text-secondary d-block text-truncate" style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                {user?.email || 'patient@medfusion.ai'}
              </span>
            </div>
          </div>
          <button onClick={logout} className="btn-icon p-2 border-0 bg-transparent text-white opacity-70 hover-opacity-100 transition-all">
            <LogOut size={24} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? 'active' : ''}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Navbar({ user, logout, toggleSidebar, isSidebarPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const isDoctor = user && user.role === 'Doctor';

  return (
    <nav className="border-bottom border-white-10 py-4 bg-glass backdrop-blur w-100">
      <div className="container d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          {isSidebarPage && (
            <button className="btn-icon d-md-none text-white p-1" onClick={toggleSidebar}>
              <PanelLeft size={24} />
            </button>
          )}
          <Link to="/" className="text-decoration-none">
            <h1 className="m-0 fs-3 fw-bolder letter-spacing-tight">
              <span className="brand-logo-blue">MEDFUSION</span><span className="brand-logo-orange">AI</span>
            </h1>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="d-none d-md-flex align-items-center gap-4">
          {user ? (
            <>
              <NavLink to="/" icon={<Home size={18} />} label="Home" />
              <NavLink to="/dashboard" icon={<Activity size={18} />} label={isDoctor ? "Patient Registry" : "AI Health Check"} />
              <NavLink to="/upload" icon={<FileUp size={18} />} label={isDoctor ? "Clinical Ingestion" : "AI Report Scanner"} />
              <NavLink to="/profile" icon={<User size={18} />} label={isDoctor ? "Credentials Vault" : "My Profile"} />
              {!isSidebarPage && (
                <button onClick={logout} className="btn-icon p-2 border-0 bg-transparent text-white opacity-70 hover-opacity-100">
                  <LogOut size={20} />
                </button>
              )}
            </>
          ) : (
            <>
              <Link to="/" className="text-secondary text-decoration-none hover-white">Home</Link>
              <Link to="/auth" className="primary px-4 py-2 rounded-pill text-decoration-none">Login / Access</Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="btn-icon d-md-none text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="d-md-none position-absolute w-100 bg-deep border-bottom p-4 z-index-1000"
          >
             <div className="d-flex flex-column gap-3">
               {user ? (
                  <>
                    <MobileNavLink to="/" label="Home" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/dashboard" label={isDoctor ? "Patient Registry" : "AI Health Check"} onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label={isDoctor ? "Clinical Ingestion" : "AI Report Scanner"} onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/profile" label={isDoctor ? "Credentials Vault" : "My Profile"} onClick={() => setIsOpen(false)} />
                    <button onClick={logout} className="text-start p-0 border-0 bg-transparent text-danger">Logout</button>
                  </>
               ) : (
                  <>
                    <Link to="/" className="text-white text-decoration-none" onClick={() => setIsOpen(false)}>Home</Link>
                    <Link to="/auth" className="primary p-2 text-center rounded text-decoration-none" onClick={() => setIsOpen(false)}>Login / Access</Link>
                  </>
               )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({ to, icon, label }) {
  return (
    <Link to={to} className="text-secondary text-decoration-none d-flex align-items-center gap-2 hover-white transition-all">
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }) {
  return (
    <Link to={to} className="text-white text-decoration-none fs-5 py-2 border-bottom border-white-5" onClick={onClick}>
      {label}
    </Link>
  );
}

export default App;





