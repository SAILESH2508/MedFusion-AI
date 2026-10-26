import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAuthToken } from '../services/api';
import { 
  Lock, 
  Key, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Upload, 
  RefreshCw, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  HeartPulse, 
  Stethoscope, 
  X, 
  ArrowRight, 
  UserPlus 
} from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
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

        const res = await api.post('/auth/signup/', formData);
        
        // Auto-login user on successful signup
        if (res.data && res.data.token) {
          setAuthToken(res.data.token);
          login(res.data);
          const newUser = res.data.user || res.data;
          if (onClose) {
            onClose();
          }
          if (newUser.role === 'Doctor') {
            navigate('/dashboard');
          } else {
            navigate('/profile');
          }
        } else {
          setIsLogin(true);
          setError('Signup successful. Please login with your credentials.');
        }
      }
    } catch (err) {
      const respData = err.response?.data;
      let errorMsg = 'Authentication failed. Please verify your credentials and try again.';
      if (typeof respData === 'string') {
        errorMsg = respData;
      } else if (respData?.error) {
        errorMsg = respData.error;
      } else if (respData?.detail) {
        errorMsg = respData.detail;
      } else if (respData && typeof respData === 'object') {
        const firstKey = Object.keys(respData)[0];
        if (firstKey) {
          const val = respData[firstKey];
          errorMsg = Array.isArray(val) ? `${firstKey}: ${val.join(', ')}` : `${firstKey}: ${val}`;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isDoctor = portal === 'doctor';
  const accentColor = isDoctor ? 'var(--brand-blue, #2563EB)' : 'var(--brand-orange, #E07B39)';
  const accentGradient = isDoctor 
    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' 
    : 'linear-gradient(135deg, #F4954A 0%, #E07B39 100%)';
  const accentGlow = '0 2px 6px rgba(0, 0, 0, 0.12)';

  return (
    <div 
      className="d-flex justify-content-center align-items-center w-100" 
      style={typeof onClose === 'function' ? { padding: 0 } : { minHeight: '75vh', padding: '32px 16px' }}
    >
      <div 
        className="w-100 position-relative" 
        style={{ 
          maxWidth: '480px',
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-card, var(--border))',
          borderRadius: '20px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Top Accent Gradient Bar */}
        <div 
          style={{ 
            height: '4px', 
            width: '100%', 
            background: accentGradient,
            transition: 'background 0.3s ease'
          }} 
        />

        <div style={{ padding: '28px 32px' }}>
          {/* Card Header with Icon Badge and Close Button */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="d-flex align-items-center justify-content-center rounded-3" 
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  background: isDoctor ? 'rgba(37, 99, 235, 0.12)' : 'rgba(244, 149, 74, 0.14)',
                  color: accentColor,
                  border: `1px solid ${isDoctor ? 'rgba(37, 99, 235, 0.25)' : 'rgba(244, 149, 74, 0.25)'}`,
                  transition: 'all 0.3s ease'
                }}
              >
                {isDoctor ? <Stethoscope size={22} /> : <HeartPulse size={22} />}
              </div>
              <div>
                <h2 
                  className="m-0 fw-bold" 
                  style={{ 
                    fontSize: '1.28rem', 
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-main, Outfit, sans-serif)',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {isLogin 
                    ? (isDoctor ? 'Doctor Portal Login' : 'Patient Vault Login') 
                    : (isDoctor ? 'Doctor Registration' : 'Create Patient Account')}
                </h2>
                <p 
                  className="m-0 text-secondary small" 
                  style={{ 
                    fontSize: '0.8rem', 
                    fontFamily: 'var(--font-main, Outfit, sans-serif)',
                    opacity: 0.85
                  }}
                >
                  {isLogin 
                    ? (isDoctor ? 'Access clinical tools & patient records' : 'Access your health twin & medical telemetry') 
                    : (isDoctor ? 'Register with verified medical credentials' : 'Start your personalized AI health companion')}
                </p>
              </div>
            </div>

            {typeof onClose === 'function' && (
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-icon d-flex align-items-center justify-content-center p-2 rounded-circle border-0 text-secondary transition-all"
                aria-label="Close authentication modal"
                style={{ 
                  background: 'var(--bg-input, rgba(0, 0, 0, 0.05))',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Portal Switcher Segmented Control */}
          <div 
            className="d-flex p-1 rounded-3 mb-4" 
            style={{ 
              background: 'var(--bg-input, #F7F5F1)',
              border: '1px solid var(--border)',
              gap: '4px'
            }}
          >
            <button 
              type="button"
              onClick={() => {
                setPortal('patient');
                setError('');
              }}
              className="flex-fill py-2 px-3 d-flex align-items-center justify-content-center gap-2 fw-semibold transition-all border-0"
              style={{ 
                borderRadius: '8px', 
                fontSize: '0.84rem',
                fontFamily: 'var(--font-main, Outfit, sans-serif)',
                background: !isDoctor ? accentGradient : 'transparent',
                color: !isDoctor ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: !isDoctor ? '0 2px 8px rgba(224, 123, 57, 0.28)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <User size={14} />
              <span>Patient Portal</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                setPortal('doctor');
                setError('');
              }}
              className="flex-fill py-2 px-3 d-flex align-items-center justify-content-center gap-2 fw-semibold transition-all border-0"
              style={{ 
                borderRadius: '8px', 
                fontSize: '0.84rem',
                fontFamily: 'var(--font-main, Outfit, sans-serif)',
                background: isDoctor ? accentGradient : 'transparent',
                color: isDoctor ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: isDoctor ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Stethoscope size={14} />
              <span>Doctor Portal</span>
            </button>
          </div>

          {/* Notice Alert */}
          {message && (
            <div 
              className="d-flex align-items-start gap-2.5 p-3 rounded-3 mb-3.5" 
              style={{ 
                fontSize: '0.82rem', 
                lineHeight: '1.45',
                background: isDoctor ? 'rgba(37, 99, 235, 0.08)' : 'rgba(244, 149, 74, 0.09)',
                border: `1px solid ${isDoctor ? 'rgba(37, 99, 235, 0.2)' : 'rgba(244, 149, 74, 0.22)'}`,
                color: 'var(--text-primary)'
              }} 
              aria-live="polite"
            >
              <Info size={16} style={{ color: accentColor, marginTop: '2px', flexShrink: 0 }} />
              <div>
                <span className="fw-bold d-block mb-0.5" style={{ color: accentColor, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Verification Notice
                </span>
                <span className="text-secondary" style={{ opacity: 0.9 }}>{message}</span>
              </div>
            </div>
          )}
          
          {/* Error Alert */}
          {error && (
            <div 
              className={`p-3 rounded-3 mb-3.5 d-flex align-items-center gap-2 text-start ${
                error.includes('successful') 
                  ? 'border-success bg-success bg-opacity-10 text-success' 
                  : 'border-danger bg-danger bg-opacity-10 text-danger'
              }`} 
              style={{ 
                fontSize: '0.8rem',
                border: '1px solid',
                fontFamily: 'var(--font-main, Outfit, sans-serif)'
              }} 
              aria-live="polite"
            >
              {error.includes('successful') ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertTriangle size={16} className="flex-shrink-0" />} 
              <span>{error}</span>
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="d-flex flex-column gap-3">
              {!isLogin && (
                <div>
                  <label 
                    className="d-block mb-1.5 fw-semibold" 
                    style={{ 
                      fontSize: '0.82rem', 
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-main, Outfit, sans-serif)'
                    }}
                  >
                    Full Name
                  </label>
                  <div className="position-relative">
                    <User 
                      size={16} 
                      className="position-absolute text-secondary" 
                      style={{ top: '50%', transform: 'translateY(-50%)', left: '14px', pointerEvents: 'none', zIndex: 2 }} 
                    />
                    <input 
                      type="text" 
                      placeholder="e.g. Dr. Jane Smith" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      className="w-100 auth-input-field"
                      style={{ 
                        background: 'var(--bg-input, #F7F5F1)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = accentColor}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label 
                  className="d-block mb-1.5 fw-semibold" 
                  style={{ 
                    fontSize: '0.82rem', 
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-main, Outfit, sans-serif)'
                  }}
                >
                  Email Address
                </label>
                <div className="position-relative">
                  <Mail 
                    size={16} 
                    className="position-absolute text-secondary" 
                    style={{ top: '50%', transform: 'translateY(-50%)', left: '14px', pointerEvents: 'none', zIndex: 2 }} 
                  />
                  <input 
                    type="email" 
                    placeholder="e.g. name@medfusion.ai" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="w-100 auth-input-field"
                    style={{ 
                      background: 'var(--bg-input, #F7F5F1)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = accentColor}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
              
              <div>
                <label 
                  className="d-block mb-1.5 fw-semibold" 
                  style={{ 
                    fontSize: '0.82rem', 
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-main, Outfit, sans-serif)'
                  }}
                >
                  Password
                </label>
                <div className="position-relative">
                  <Lock 
                    size={16} 
                    className="position-absolute text-secondary" 
                    style={{ top: '50%', transform: 'translateY(-50%)', left: '14px', pointerEvents: 'none', zIndex: 2 }} 
                  />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="w-100 auth-input-field auth-input-password"
                    style={{ 
                      background: 'var(--bg-input, #F7F5F1)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = accentColor}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="position-absolute d-flex align-items-center justify-content-center p-0 border-0 bg-transparent text-secondary cursor-pointer"
                    style={{ top: '50%', transform: 'translateY(-50%)', right: '14px', zIndex: 2 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Doctor Specific Registration Fields */}
              {!isLogin && isDoctor && (
                <>
                  <div>
                    <label 
                      className="d-block mb-1.5 fw-semibold" 
                      style={{ 
                        fontSize: '0.82rem', 
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-main, Outfit, sans-serif)'
                      }}
                    >
                      Medical License ID
                    </label>
                    <div className="position-relative">
                      <ShieldCheck 
                        size={16} 
                        className="position-absolute text-secondary" 
                        style={{ top: '50%', transform: 'translateY(-50%)', left: '14px', pointerEvents: 'none', zIndex: 2 }} 
                      />
                      <input 
                        type="text" 
                        placeholder="e.g. MD-LIC-98441-US" 
                        value={license} 
                        onChange={(e) => setLicense(e.target.value)} 
                        required 
                        className="w-100 font-monospace auth-input-field"
                        style={{ 
                          background: 'var(--bg-input, #F7F5F1)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          borderRadius: '10px',
                          fontSize: '0.88rem',
                          outline: 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = accentColor}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                  </div>

                  <div>
                    <label 
                      className="d-block mb-1.5 fw-semibold" 
                      style={{ 
                        fontSize: '0.82rem', 
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-main, Outfit, sans-serif)'
                      }}
                    >
                      Certification Proof (PDF / Image)
                    </label>
                    <div 
                      className="p-3 border border-dashed rounded-3 text-center cursor-pointer transition-all" 
                      onClick={() => document.getElementById('proofFileInput').click()} 
                      style={{ 
                        background: 'var(--bg-input, #F7F5F1)',
                        borderColor: proofFile ? accentColor : 'var(--border)',
                        borderRadius: '10px'
                      }}
                    >
                      <input 
                        id="proofFileInput"
                        type="file" 
                        className="d-none" 
                        accept="image/*,application/pdf"
                        onChange={(e) => setProofFile(e.target.files[0])}
                        required
                      />
                      <span className="small d-flex align-items-center justify-content-center gap-2 fw-semibold" style={{ color: accentColor, fontSize: '0.82rem' }}>
                        <Upload size={15} />
                        {proofFile ? `Selected: ${proofFile.name}` : 'Click to Upload Credential Proof'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Submit Button */}
            <button 
              type="submit" 
              className="mt-4 py-3 d-flex align-items-center justify-content-center gap-2 fw-bold text-white w-100 border-0 transition-all cursor-pointer" 
              disabled={loading} 
              style={{ 
                background: accentGradient,
                boxShadow: accentGlow,
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-main, Outfit, sans-serif)',
                letterSpacing: '0.02em',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                opacity: loading ? 0.75 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.16)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = accentGlow;
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={17} className="spinner-border border-0" style={{ animation: 'spin 1.2s linear infinite', width: '17px', height: '17px' }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  {isLogin ? <Key size={17} /> : <UserPlus size={17} />}
                  <span>
                    {isLogin 
                      ? (isDoctor ? 'Access Clinical Portal' : 'Login to Health Vault') 
                      : (isDoctor ? 'Register Doctor Credentials' : 'Create Patient Account')}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Registration */}
          <div className="text-center mt-4 pt-2 border-top" style={{ borderColor: 'var(--border, rgba(0, 0, 0, 0.08))' }}>
            <p className="m-0 text-secondary" style={{ fontSize: '0.84rem', fontFamily: 'var(--font-main, Outfit, sans-serif)' }}>
              {isLogin ? "Don't have an account yet?" : "Already registered?"}{' '}
              <button 
                type="button"
                className="p-0 border-0 bg-transparent fw-bold cursor-pointer transition-all" 
                style={{ 
                  color: accentColor, 
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-main, Outfit, sans-serif)',
                  fontSize: '0.84rem'
                }}
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
              >
                {isLogin ? 'Create Account' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
