import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAuthToken } from '../services/api';
import { Lock, Key, Cpu, RefreshCw, Upload, User, Heart, Sparkles } from 'lucide-react';

function Auth({ login, initialPortal: propInitialPortal = 'patient', onClose, message }) {
  const [searchParams] = useSearchParams();
  
  const getInitialPortal = () => {
    const p = searchParams.get('portal');
    if (p === 'doctor' || p === 'patient') {
      return p;
    }
    return propInitialPortal;
  };
  
  const [portal, setPortal] = useState(getInitialPortal); // 'patient' | 'doctor'
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Sync portal with query param updates and propInitialPortal updates
  useEffect(() => {
    const p = searchParams.get('portal');
    if (p === 'doctor' || p === 'patient') {
      setPortal(p);
    } else if (propInitialPortal === 'doctor' || propInitialPortal === 'patient') {
      setPortal(propInitialPortal);
    }
  }, [searchParams, propInitialPortal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const role = portal === 'doctor' ? 'Doctor' : 'Patient';

    try {
      if (isLogin) {
        const payload = { email, password };
        const res = await api.post('/auth/login/', payload);
        
        // Save token and parse login state
        setAuthToken(res.data.token);
        login(res.data);
        const loggedInUser = res.data.user || res.data;
        if (onClose) {
          onClose();
        }
        if (loggedInUser.role === 'Doctor') {
          navigate('/dashboard');
        } else {
          navigate('/profile');
        }
      } else {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('full_name', name);
        formData.append('role', role);

        if (role === 'Doctor') {
          if (!license) {
            setError('Medical License ID is required for Doctor registration.');
            setLoading(false);
            return;
          }
          if (!proofFile) {
            setError('Please upload a proof of certification file.');
            setLoading(false);
            return;
          }
          formData.append('license_number', license);
          formData.append('medical_proof_file', proofFile);
        }

        await api.post('/auth/signup/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setIsLogin(true);
        setError('Signup successful. Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Authentication failed. Verify backend server status.');
    } finally {
      setLoading(false);
    }
  };

  const currentTheme = portal === 'doctor' ? 'theme-cancer' : 'theme-general';

  return (
    <div className={`d-flex justify-content-center align-items-center font-monospace ${currentTheme}`} style={typeof onClose === 'function' ? { width: '100%' } : { minHeight: '70vh' }}>
      <div className="glass-card reveal w-100 position-relative overflow-hidden" style={{ 
        maxWidth: '520px', 
        boxShadow: portal === 'doctor' 
          ? '0 30px 70px rgba(70,0,30,0.8), 0 0 30px rgba(255, 140, 0, 0.15)' 
          : '0 30px 70px rgba(0,3,70,0.8), 0 0 30px rgba(0, 255, 255, 0.15)'
      }}>
        
        {/* Terminal Header */}
        <div className="text-center mb-4 mt-2">
          <h2 className="fw-bolder text-white text-uppercase" style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
            {isLogin ? `${portal} Login` : `Register ${portal}`}
          </h2>
        </div>

        {/* Switcher Tab */}
        <div className="d-flex bg-white-10 p-1 border border-white-10 rounded mb-4">
          <button 
            type="button"
            onClick={() => {
              setPortal('patient');
              setError('');
            }}
            className={`flex-fill px-3 py-2 text-uppercase text-xs font-bold font-monospace d-flex align-items-center justify-content-center gap-2 ${portal === 'patient' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
            style={{ borderRadius: '4px', width: 'auto', fontSize: '0.82rem' }}
          >
            <User size={14} />
            Patient Portal
          </button>
          <button 
            type="button"
            onClick={() => {
              setPortal('doctor');
              setError('');
            }}
            className={`flex-fill px-3 py-2 text-uppercase text-xs font-bold font-monospace d-flex align-items-center justify-content-center gap-2 ${portal === 'doctor' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
            style={{ borderRadius: '4px', width: 'auto', fontSize: '0.82rem' }}
          >
            <Heart size={14} />
            Doctor Portal
          </button>
        </div>

        {message && (
          <div className="d-flex align-items-start gap-3 p-3.5 rounded border border-white-5 bg-white-5 mb-4 small text-secondary" style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
            <Sparkles size={16} className="text-theme-accent flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-grow-1">
              <span className="text-theme-accent fw-bold d-block mb-1 text-uppercase font-monospace" style={{ letterSpacing: '0.06em', fontSize: '0.72rem' }}>SYSTEM NOTICE GATEWAY INFO</span>
              <span className="font-monospace" style={{ opacity: 0.88 }}>{message}</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className={`p-3 rounded border font-monospace mb-4 small ${
            error.includes('successful') 
              ? 'border-success bg-success bg-opacity-10 text-success' 
              : 'border-danger bg-danger bg-opacity-10 text-danger'
          }`} style={{ fontSize: '0.72rem' }}>
            {error.includes('successful') ? '✓' : '⚠️'} {error.toUpperCase()}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            {isLogin ? (
              <>
                <div className="col-12">
                  <label className="small text-secondary fw-bold mb-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="e.g. john.doe@medfusion.ai" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    style={{ marginBottom: 0 }}
                  />
                </div>
                
                <div className="col-12">
                  <label className="small text-secondary fw-bold mb-2">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="col-12">
                  <label className="small text-secondary fw-bold mb-2">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    style={{ marginBottom: 0 }}
                  />
                </div>
                
                <div className="col-12">
                  <label className="small text-secondary fw-bold mb-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="e.g. john.doe@medfusion.ai" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    style={{ marginBottom: 0 }}
                  />
                </div>
                
                <div className="col-12">
                  <label className="small text-secondary fw-bold mb-2">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    style={{ marginBottom: 0 }}
                  />
                </div>

                {portal === 'doctor' && (
                  <div className="col-12">
                    <label className="small text-secondary fw-bold mb-2">Medical License ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. LIC-99887766-US" 
                      value={license} 
                      onChange={(e) => setLicense(e.target.value)} 
                      required 
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                )}

                {portal === 'doctor' && (
                  <div className="col-12 mt-2 border-top border-white-5 pt-3 animate-fadeIn">
                    <label className="small text-secondary fw-bold mb-2">Certification Proof (PDF/JPG/PNG)</label>
                    <div 
                      className="p-3 border border-dashed border-white-10 rounded text-center cursor-pointer position-relative hover-border-info-glow" 
                      onClick={() => document.getElementById('proofFileInput').click()} 
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <input 
                        id="proofFileInput"
                        type="file" 
                        className="d-none" 
                        accept="image/*,application/pdf"
                        onChange={(e) => setProofFile(e.target.files[0])}
                        required
                      />
                      <span className="small text-theme-accent font-monospace text-uppercase d-flex align-items-center justify-content-center gap-2">
                        <Upload size={14} />
                        {proofFile ? `Selected: ${proofFile.name.toUpperCase()}` : 'Upload License Proof'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <button type="submit" className="btn-clinical primary mt-4 py-3 d-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase w-100" disabled={loading} style={{ letterSpacing: '0.08em' }}>
            {loading ? (
              <>
                <RefreshCw size={16} className="spinner-border border-0" style={{ animation: 'spin 1.5s linear infinite', width: '16px', height: '16px' }} />
                Processing...
              </>
            ) : (
              <>
                <Key size={16} />
                {isLogin ? 'Login to Vault' : 'Register Account'}
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 text-secondary small m-0" style={{ fontSize: '0.72rem' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <span className="text-theme-accent cursor-pointer text-decoration-underline hover-white" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;
