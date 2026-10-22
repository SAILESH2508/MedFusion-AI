import React, { useState, useEffect, useRef, createContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, NavLink as RouterNavLink } from 'react-router-dom';
import { Activity, FileUp, Database, User, LogOut, Menu, X, Home, PanelLeft, Pill, Smile, Calendar, MessageSquare, MapPin, Sun, Moon, Salad, Cpu, QrCode } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import GuestUpload from './pages/GuestUpload';
import GuestDashboard from './pages/dashboard/GuestDashboard';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import NearbyMap from './pages/NearbyMap';
import EmergencyCard from './pages/EmergencyCard';
import DietPlanner from './pages/DietPlanner';
import DigitalTwin from './pages/DigitalTwin';
import AIChatbot from './components/AIChatbot';
import { removeAuthToken, api } from './services/api';

import { SidebarContext } from './context/SidebarContext';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './context/useTheme';

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
    <ThemeProvider>
      <Router>
        <AppContent user={user} login={login} logout={logout} />
      </Router>
    </ThemeProvider>
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
  const isSidebarPage = location.pathname.includes('dashboard') || location.pathname.includes('upload') || location.pathname.includes('nearby') || location.pathname.includes('diet') || location.pathname.includes('digital-twin') || (!!user && location.pathname.includes('profile'));
  
  const [sidebarContent, setSidebarContent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // ── Persistent map state — lifted here so navigating away doesn't reset it ──
  const [mapLocation, setMapLocation] = useState(null);
  const [mapPlaces, setMapPlaces]     = useState([]);
  const [mapActiveTypes, setMapActiveTypes] = useState(['hospital', 'clinic', 'pharmacy']);
  const [mapRadius, setMapRadius]     = useState(null); // null = will default inside NearbyMap based on user role

  const [navbarHealthScore, setNavbarHealthScore] = useState(() => {
    if (!user || user.role !== 'Patient') return null;
    const userId = user.id || user.user_id || user.pk || 'guest';
    return localStorage.getItem(`medfusion_health_score_${userId}`) || null;
  });

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
    window.addEventListener('medfusion_auth_logout', logout);
    
    const handleOpenAuthEvent = (e) => {
      openAuth(e.detail?.role || 'patient', e.detail?.message || '');
    };
    window.addEventListener('medfusion_open_auth', handleOpenAuthEvent);
    
    handleScoreUpdate();

    return () => {
      window.removeEventListener('medfusion_health_score_updated', handleScoreUpdate);
      window.removeEventListener('storage', handleScoreUpdate);
      window.removeEventListener('medfusion_auth_logout', logout);
      window.removeEventListener('medfusion_open_auth', handleOpenAuthEvent);
    };
  }, [user, logout, openAuth]);

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
                <Route path="/nearby" element={
                  <NearbyMap
                    user={user}
                    persistedLocation={mapLocation}
                    setPersistedLocation={setMapLocation}
                    persistedPlaces={mapPlaces}
                    setPersistedPlaces={setMapPlaces}
                    persistedActiveTypes={mapActiveTypes}
                    setPersistedActiveTypes={setMapActiveTypes}
                    persistedRadius={mapRadius}
                    setPersistedRadius={setMapRadius}
                  />
                } />
                <Route path="/diet" element={user && user.role === 'Patient' ? <DietPlanner user={user} /> : <Navigate to="/" />} />
                <Route path="/digital-twin" element={user && user.role === 'Patient' ? <DigitalTwin user={user} /> : <Navigate to="/auth" />} />
                <Route path="/vault" element={<Navigate to="/profile" />} />
                <Route path="/profile" element={user ? <Profile user={user} onUserUpdate={login} /> : <RedirectToHomeAndOpenAuth openAuth={openAuth} />} />
                
                {/* Public emergency card — no auth required */}
                <Route path="/emergency/:token" element={<EmergencyCard />} />

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

      {/* Global AI Chatbot — available on all pages */}
      {!isAuthPage && <AIChatbot user={user} />}
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
  const themeAccentColor = scoreNum >= 85 ? 'var(--accent-green)' : scoreNum >= 70 ? 'var(--accent-amber)' : 'var(--accent-coral)';

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <button className="btn-icon d-md-none text-white position-absolute end-0 top-0 m-3 z-index-1000" onClick={toggleSidebar} aria-label="Close sidebar">
        <X size={24} />
      </button>
      <div className="sidebar-menu flex-grow-1 overflow-visible py-2 mt-4 mt-md-0">
        {sidebarContent}
      </div>

      {user && user.role === 'Patient' && navbarHealthScore && (
        <div className="mb-4 d-flex align-items-center gap-3 bg-white-5 p-3 rounded-4 border border-white-5 transition-all">
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
            <strong className="fs-6" style={{ color: 'var(--text-on-dark)' }}>{scoreNum}</strong>
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
                <span className="fw-bold d-block text-truncate" style={{ fontSize: '1.05rem', color: 'var(--text-on-dark)' }}>
                  {user.full_name || user.email}
                </span>
                <span className="text-secondary d-block text-truncate" style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                  {user.email}
                </span>
              </div>
            </div>
            <button onClick={logout} className="btn-icon p-2 border-0 bg-transparent text-white opacity-70 hover-opacity-100 transition-all" aria-label="Log out">
              <LogOut size={24} />
            </button>
          </div>
        ) : (
          <div className="d-flex align-items-center justify-content-between w-100">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-circle" style={{ background: 'rgba(255,255,255,0.1)', border: '1px dashed var(--border)' }}>
                GS
              </div>
              <div className="user-details overflow-hidden" style={{ maxWidth: '140px' }}>
                <span className="text-secondary d-block font-monospace" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  GUEST PORTAL
                </span>
                <span className="fw-bold d-block text-truncate" style={{ fontSize: '0.88rem', color: 'var(--text-on-dark)' }}>
                  Anonymous Mode
                </span>
              </div>
            </div>
            <button 
              onClick={() => openAuth('patient')} 
              aria-label="Log in"
              className="btn-clinical primary px-3 py-1.5 text-decoration-none text-white font-monospace text-uppercase cursor-pointer w-auto-override" 
              style={{ fontSize: '0.72rem' }}
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

function EmergencyQRDropdown({ user }) {
  const userId = user?.id || user?.user_id || user?.pk || 'guest';
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(`medfusion_emergency_token_${userId}`) || ''; }
    catch { return ''; }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // Fetch profile summary on first open
  useEffect(() => {
    if (user?.role === 'Patient' && isOpen && !profile) {
      api.get('/telemetry/emergency').then(r => setProfile(r.data)).catch(() => {});
    }
  }, [isOpen, user?.role, profile]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen]);

  if (!user || user.role !== 'Patient') return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/emergency/generate/');
      const t = res.data.token || '';
      setToken(t);
      localStorage.setItem(`medfusion_emergency_token_${userId}`, t);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleRevoke = async () => {
    try { await api.delete('/emergency/revoke/'); } catch {}
    setToken('');
    localStorage.removeItem(`medfusion_emergency_token_${userId}`);
  };

  const qrUrl = token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/emergency/' + token)}`
    : null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setIsOpen(o => !o)}
        aria-label="Emergency QR"
        aria-expanded={isOpen}
        className="btn-icon p-2"
        style={{ color: isOpen ? 'var(--brand-orange)' : 'var(--text-secondary)', position: 'relative' }}
      >
        <QrCode size={18} />
        {token && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--status-success)', border: '1.5px solid var(--bg-nav)'
          }} />
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: '60px',
            right: '16px',
            width: 'min(280px, calc(100vw - 32px))',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 2100,
            padding: '16px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-orange)' }}>Emergency QR Card</span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }} aria-label="Close QR panel"><X size={14} /></button>
          </div>

          {profile && (
            <div style={{ marginBottom: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{profile.first_name} {profile.last_name}</strong>
              {profile.blood_group && <span style={{ background: 'rgba(192,57,43,0.12)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: '4px', padding: '1px 6px', marginRight: '6px', fontSize: '0.65rem' }}>{profile.blood_group}</span>}
              {profile.allergies?.length > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Allergies: {profile.allergies.join(', ')}</span>}
            </div>
          )}

          {qrUrl ? (
            <>
              <img src={qrUrl} alt="Emergency QR Code" style={{ width: '100%', borderRadius: '6px', border: '1px solid var(--border)', display: 'block' }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button onClick={handleGenerate} disabled={loading} style={{ flex: 1, padding: '5px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.64rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Regenerate</button>
                <button onClick={handleRevoke} style={{ flex: 1, padding: '5px 8px', background: 'transparent', border: '1px solid var(--accent-red)', borderRadius: '4px', fontSize: '0.64rem', cursor: 'pointer', color: 'var(--accent-red)' }}>Revoke</button>
                <a href={qrUrl.replace('200x200', '400x400')} download="MedFusion_QR.png" target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '5px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.64rem', color: 'var(--text-secondary)', textDecoration: 'none', textAlign: 'center' }}>Download</a>
              </div>
            </>
          ) : (
            <button onClick={handleGenerate} disabled={loading} style={{ width: '100%', padding: '10px', background: 'var(--brand-orange)', color: 'var(--text-on-brand)', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating…' : 'Generate Emergency QR'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Navbar({ user, logout, toggleSidebar, isSidebarPage, openAuth, navbarHealthScore }) {
  const [isOpen, setIsOpen] = useState(false);
  const isDoctor = user && user.role === 'Doctor';
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="border-bottom border-white-10 bg-glass backdrop-blur w-100">
      <div className="container d-flex justify-content-between align-items-center" style={{ height: '56px' }}>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {isSidebarPage && (
            <button className="btn-icon d-md-none p-1" style={{ color: 'var(--text-primary)' }} onClick={toggleSidebar} aria-label="Toggle sidebar">
              <PanelLeft size={24} />
            </button>
          )}
          <Link to="/" className="text-decoration-none">
            <h1 className="m-0 fw-bolder text-nowrap" style={{ fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
              <span className="brand-logo-blue">MEDFUSION</span><span className="brand-logo-orange">AI</span>
            </h1>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="d-none d-md-flex align-items-center gap-3">
          <NavLink to="/" icon={<Home size={16} />} label="Home" />
          {user && user.role === 'Doctor' && (
            <>
              <NavLink to="/dashboard" icon={<Activity size={16} />} label="Patients" />
              <NavLink to="/upload" icon={<FileUp size={16} />} label="Scanner" />
              <NavLink to="/nearby" icon={<MapPin size={16} />} label="Nearby" />
            </>
          )}
          {user && user.role === 'Patient' && (
            <>
              <NavLink to="/dashboard" icon={<Activity size={16} />} label="Health Check" />
              <NavLink to="/upload" icon={<FileUp size={16} />} label="Scanner" />
              <NavLink to="/diet" icon={<Salad size={16} />} label="Diet" />
              <NavLink to="/digital-twin" icon={<Cpu size={16} />} label="Health Twin" />
              <NavLink to="/nearby" icon={<MapPin size={16} />} label="Nearby" />
            </>
          )}
          {!user && (
            <>
              <NavLink to="/dashboard" icon={<Activity size={16} />} label="Health Check" />
              <NavLink to="/upload" icon={<FileUp size={16} />} label="Scanner" />
              <NavLink to="/nearby" icon={<MapPin size={16} />} label="Nearby" />
            </>
          )}
          {user ? (
            <>
              <NavLink to="/profile" icon={<User size={16} />} label={isDoctor ? "Vault" : "Profile"} />
              {!isSidebarPage && (
                <button onClick={logout} className="btn-icon p-2 border-0 bg-transparent text-secondary" style={{ color: 'var(--text-secondary)' }} aria-label="Log out">
                  <LogOut size={18} />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => openAuth('patient')}
              className="btn-clinical primary px-3 py-1.5 text-decoration-none font-monospace text-uppercase cursor-pointer"
              style={{ width: 'auto', fontSize: '0.82rem', borderRadius: '6px' }}
            >
              Login
            </button>
          )}
          {user && user.role === 'Patient' && <EmergencyQRDropdown user={user} />}
          <button
            onClick={toggleTheme}
            className="btn-icon p-2 border-0 bg-transparent opacity-70 hover-opacity-100"
            style={{ color: 'var(--text-primary)' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button className="btn-icon d-md-none" style={{ color: 'var(--text-primary)' }} onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="d-md-none position-absolute w-100 border-bottom p-4 z-index-1000"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
             <div className="d-flex flex-column gap-3">
               <MobileNavLink to="/" label="Home" onClick={() => setIsOpen(false)} />
                {user && user.role === 'Doctor' && (
                  <>
                    <MobileNavLink to="/dashboard" label="Patient Registry" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label="Clinical Ingestion" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/nearby" label="Nearby Facilities" onClick={() => setIsOpen(false)} />
                  </>
                )}
                {user && user.role === 'Patient' && (
                  <>
                    <MobileNavLink to="/dashboard" label="AI Health Check" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label="AI Report Scanner" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/diet" label="Diet Planner" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/digital-twin" label="Personal Health Twin" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/nearby" label="Nearby Facilities" onClick={() => setIsOpen(false)} />
                  </>
                )}
                {!user && (
                  <>
                    <MobileNavLink to="/dashboard" label="AI Health Check" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/upload" label="AI Report Scanner" onClick={() => setIsOpen(false)} />
                    <MobileNavLink to="/nearby" label="Nearby" onClick={() => setIsOpen(false)} />
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
                      className="btn-clinical primary p-2 text-center rounded text-decoration-none font-monospace text-uppercase cursor-pointer"
                      style={{ width: '100%', fontSize: '0.88rem', borderRadius: '6px' }}
                    >
                      Login
                    </button>
                )}
                <button
                  onClick={toggleTheme}
                  className="btn-icon p-2 border-0 bg-transparent opacity-70 mt-2 d-flex align-items-center"
                  style={{ color: 'var(--text-primary)' }}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  <span className="ms-2" style={{ fontSize: '0.9rem' }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({ to, icon, label }) {
  return (
    <RouterNavLink
      to={to}
      className="text-decoration-none d-flex align-items-center gap-2 transition-all px-2 py-1 rounded"
      style={({ isActive }) => ({
        color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
        fontWeight: isActive ? 700 : 500,
        background: isActive ? 'var(--bg-upload)' : 'transparent',
      })}
    >
      {icon}
      <span>{label}</span>
    </RouterNavLink>
  );
}

function MobileNavLink({ to, label, onClick }) {
  return (
    <RouterNavLink
      to={to}
      className="text-decoration-none fs-5 py-2 border-bottom border-white-5 d-block"
      style={({ isActive }) => ({
        color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
        fontWeight: isActive ? 700 : 500,
      })}
      onClick={onClick}
    >
      {label}
    </RouterNavLink>
  );
}

export default App;





