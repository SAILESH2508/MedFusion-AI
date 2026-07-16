import React, { useState, useEffect, createContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Activity, FileUp, Database, User, LogOut, Menu, X, Home, PanelLeft, Pill, Smile, Calendar, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import GuestUpload from './pages/GuestUpload';
import GuestDashboard from './pages/dashboard/GuestDashboard';
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

function RedirectToHomeAndOpenAuth({ openAuth }) {
  useEffect(() => {
    openAuth('patient', 'To view your clinical profile and vault details, please authenticate.');
  }, [openAuth]);
  return <Navigate to="/" replace />;
}

function AppContent({ user, login, logout }) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');
  const isSidebarPage = location.pathname.includes('dashboard') || location.pathname.includes('upload') || (!!user && location.pathname.includes('profile'));
  
  const [sidebarContent, setSidebarContent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const [navbarHealthScore, setNavbarHealthScore] = useState(() => {
    if (!user || user.role !== 'Patient') return null;
    const userId = user.id || user.user_id || user.pk || 'guest';
    return localStorage.getItem(`medfusion_health_score_${userId}`) || null;
  });

  useEffect(() => {
    const handleScoreUpdate = () => {
      const userId = user?.id || user?.user_id || user?.pk || 'guest';
      if (user && user.role === 'Patient' && userId) {
        const score = localStorage.getItem(`medfusion_health_score_${userId}`);
        setNavbarHealthScore(score);
      } else {
        setNavbarHealthScore(null);
      }
    };

    window.addEventListener('medfusion_health_score_updated', handleScoreUpdate);
    window.addEventListener('storage', handleScoreUpdate);
    
    handleScoreUpdate();

    return () => {
      window.removeEventListener('medfusion_health_score_updated', handleScoreUpdate);
      window.removeEventListener('storage', handleScoreUpdate);
    };
  }, [user]);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPortalType, setAuthPortalType] = useState('patient');
  const [authMessage, setAuthMessage] = useState('');

  const openAuth = useCallback((portalType, message) => {
    setAuthPortalType(portalType || 'patient');
    setAuthMessage(message || '');
    setIsAuthOpen(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setIsAuthOpen(false);
    setAuthMessage('');
  }, []);

  console.log('MedFusion Layout Debug:', {
    pathname: location.pathname,
    hasUser: !!user,
    isSidebarPage: isSidebarPage
  });

  return (
    <SidebarContext.Provider value={{ sidebarContent, setSidebarContent }}>
      <div className="min-vh-100 d-flex flex-column">
        {/* Top Navbar visible on all pages - covers 100% width! */}
        <Navbar user={user} logout={logout} toggleSidebar={toggleSidebar} isSidebarPage={isSidebarPage} openAuth={openAuth} navbarHealthScore={navbarHealthScore} />
        
        {/* Main layout underneath the navbar */}
        <div className={`flex-grow-1 d-flex ${isSidebarPage ? 'flex-md-row' : 'flex-column'}`} style={{ minHeight: 0 }}>
          
          {/* Sidebar ONLY on dashboard/profile/upload */}
          {isSidebarPage && <Sidebar user={user} logout={logout} sidebarContent={sidebarContent} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} openAuth={openAuth} navbarHealthScore={navbarHealthScore} />}
          
          <div className={`flex-grow-1 d-flex flex-column ${isSidebarPage ? 'main-content-wrapper' : ''}`} style={{ minHeight: 0 }}>
            <main className={`container-fluid ${location.pathname === '/upload' ? 'p-2 p-md-3' : 'py-4 px-md-5'} flex-grow-1 d-flex flex-column`} style={{ minHeight: 0 }}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth login={login} />} />
                
                <Route path="/dashboard" element={user ? <Dashboard user={user} openAuth={openAuth} /> : <GuestDashboard openAuth={openAuth} />} />
                <Route path="/upload" element={user ? <Upload user={user} /> : <GuestUpload openAuth={openAuth} />} />
                <Route path="/vault" element={<Navigate to="/profile" />} />
                <Route path="/profile" element={user ? <Profile user={user} onUserUpdate={login} /> : <RedirectToHomeAndOpenAuth openAuth={openAuth} />} />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>

      {isAuthOpen && (
        <div className="modal-overlay" onClick={handleCloseAuth}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseAuth}>
              <X size={20} />
            </button>
            <Auth login={login} initialPortal={authPortalType} onClose={handleCloseAuth} message={authMessage} />
          </div>
        </div>
      )}
    </SidebarContext.Provider>
  );
}

function Sidebar({ user, logout, sidebarContent, isOpen, toggleSidebar, openAuth, navbarHealthScore }) {
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

  const scoreNum = navbarHealthScore ? parseInt(navbarHealthScore, 10) : null;
  const healthStatus = scoreNum >= 85 ? 'Optimal' : scoreNum >= 70 ? 'Moderate' : 'Unstable';
  const themeAccentColor = scoreNum >= 85 ? 'var(--accent-green)' : scoreNum >= 70 ? 'var(--accent-orange)' : 'var(--accent-red)';

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <button className="btn-icon d-md-none text-white position-absolute end-0 top-0 m-3 z-index-1000" onClick={toggleSidebar}>
        <X size={24} />
      </button>
      <div className="sidebar-menu flex-grow-1 overflow-visible py-2 mt-4 mt-md-0">
        {sidebarContent}
      </div>

      {user && user.role === 'Patient' && navbarHealthScore && (
        <div className="mb-4 d-flex align-items-center gap-3 bg-white-5 p-3 rounded-4 border border-white-5 hover-border-theme-accent-glow transition-all" style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.04) 0%, rgba(0,4,45,0.45) 100%)' }}>
          <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
            <svg className="position-absolute" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 36 36">
              <path strokeWidth="3" stroke="rgba(255, 255, 255, 0.08)" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path 
                strokeDasharray={`${scoreNum}, 100`} 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                stroke={themeAccentColor} 
                fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
            </svg>
            <strong className="text-white fs-6">{scoreNum}</strong>
          </div>
          <div className="text-start">
            <span className="text-secondary d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>VITALS INDEX</span>
            <strong className="text-uppercase" style={{ fontSize: '0.78rem', color: themeAccentColor }}>
              {healthStatus}
            </strong>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        {user ? (
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-circle">
                {getInitials(user.full_name, user.email)}
              </div>
              <div className="user-details overflow-hidden" style={{ maxWidth: '175px' }}>
                <span className="text-white fw-bold d-block text-truncate" style={{ fontSize: '1.05rem' }}>
                  {user.full_name || user.email}
                </span>
                <span className="text-secondary d-block text-truncate" style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                  {user.email}
                </span>
              </div>
            </div>
            <button onClick={logout} className="btn-icon p-2 border-0 bg-transparent text-white opacity-70 hover-opacity-100 transition-all">
              <LogOut size={24} />
            </button>
          </div>
        ) : (
          <div className="d-flex align-items-center justify-content-between w-100">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-circle" style={{ background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)' }}>
                GS
              </div>
              <div className="user-details overflow-hidden" style={{ maxWidth: '140px' }}>
                <span className="text-secondary d-block font-monospace" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  GUEST PORTAL
                </span>
                <span className="text-white fw-bold d-block text-truncate" style={{ fontSize: '0.88rem' }}>
                  Anonymous Mode
                </span>
              </div>
            </div>
            <button 
              onClick={() => openAuth('patient')} 
              className="primary px-3 py-1.5 rounded-pill text-decoration-none text-white font-monospace text-uppercase cursor-pointer" 
              style={{ fontSize: '0.72rem', width: 'auto', border: '1px solid var(--theme-accent)' }}
            >
              Login
            </button>
          </div>
        )}
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

function Navbar({ user, logout, toggleSidebar, isSidebarPage, openAuth, navbarHealthScore }) {
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
          <NavLink to="/" icon={<Home size={18} />} label="Home" />
          {user && user.role === 'Doctor' && (
            <>
              <NavLink to="/dashboard" icon={<Activity size={18} />} label="Patient Registry" />
              <NavLink to="/upload" icon={<FileUp size={18} />} label="Clinical Ingestion" />
            </>
          )}
          {user && user.role === 'Patient' && (
            <>
              <NavLink to="/dashboard" icon={<Activity size={18} />} label="AI Health Check" />
              <NavLink to="/upload" icon={<FileUp size={18} />} label="AI Report Scanner" />
            </>
          )}
          {!user && (
            <>
              <NavLink to="/dashboard" icon={<Activity size={18} />} label="AI Health Check" />
              <NavLink to="/upload" icon={<FileUp size={18} />} label="AI Report Scanner" />
            </>
          )}
          {user ? (
            <>
              <div className="d-flex align-items-center gap-3">
                <NavLink to="/profile" icon={<User size={18} />} label={isDoctor ? "Credentials Vault" : "My Profile"} />
              </div>
              {!isSidebarPage && (
                <button onClick={logout} className="btn-icon p-2 border-0 bg-transparent text-white opacity-70 hover-opacity-100">
                  <LogOut size={20} />
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={() => openAuth('patient')} 
              className="primary px-4 py-2 rounded-pill text-decoration-none font-monospace text-uppercase cursor-pointer"
              style={{ width: 'auto', fontSize: '0.88rem' }}
            >
              Login
            </button>
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
               <MobileNavLink to="/" label="Home" onClick={() => setIsOpen(false)} />
                {user && user.role === 'Doctor' && (
                  <>
                    <MobileNavLink to="/dashboard" label="Patient Registry" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label="Clinical Ingestion" onClick={() => setIsOpen(false)} />
                  </>
                )}
                {user && user.role === 'Patient' && (
                  <>
                    <MobileNavLink to="/dashboard" label="AI Health Check" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label="AI Report Scanner" onClick={() => setIsOpen(false)} />
                  </>
                )}
                {!user && (
                  <>
                    <MobileNavLink to="/dashboard" label="AI Health Check" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label="AI Report Scanner" onClick={() => setIsOpen(false)} />
                  </>
                )}
                {user ? (
                   <>
                     <div className="d-flex align-items-center justify-content-between border-bottom border-white-5 py-2">
                       <MobileNavLink to="/profile" label={isDoctor ? "Credentials Vault" : "My Profile"} onClick={() => setIsOpen(false)} />
                     </div>
                     <button onClick={logout} className="text-start p-0 border-0 bg-transparent text-danger mt-2">Logout</button>
                   </>
                ) : (
                    <button 
                      onClick={() => { setIsOpen(false); openAuth('patient'); }} 
                      className="primary p-2 text-center rounded text-decoration-none font-monospace text-uppercase cursor-pointer"
                      style={{ width: '100%', fontSize: '0.88rem' }}
                    >
                      Login
                    </button>
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





