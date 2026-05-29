import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../services/api';
import { ShieldCheck, Lock, Key, Cpu, RefreshCw, Upload } from 'lucide-react';

function Auth({ login }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Patient');
  const [license, setLicense] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const payload = { email, password };
        const res = await api.post('/auth/login', payload);
        setAuthToken(res.data.token);
        login(res.data);
        navigate('/dashboard');
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

        await api.post('/auth/signup', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setIsLogin(true);
        setError('Signup successful. Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Inference failed. Verify clinical backend server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center font-monospace theme-general" style={{ minHeight: '70vh' }}>
      <div className="glass-card reveal w-100 position-relative overflow-hidden" style={{ maxWidth: '420px', boxShadow: '0 30px 70px rgba(0,3,70,0.8), 0 0 30px rgba(0, 255, 255, 0.15)' }}>
        <div 
          className="position-absolute w-100" 
          style={{ 
            height: '1.5px', 
            background: 'rgba(0, 245, 212, 0.5)', 
            top: '10%', 
            left: 0, 
            animation: 'scanSweep 6s linear infinite' 
          }}
        ></div>
        
        {/* Terminal Header */}
        <div className="text-center mb-4">
          <div className="mx-auto mb-3 bg-white-10 rounded-circle border border-info border-dashed d-flex align-items-center justify-content-center animate-pulse" style={{ width: '70px', height: '70px' }}>
            <ShieldCheck size={32} className="text-info" />
          </div>
          <div className="small text-info mb-1" style={{ letterSpacing: '0.12em', fontSize: '0.7rem' }}>
            SECURE ACCESS: NODE ACTIVE
          </div>
          <h2 className="fw-bolder text-white text-uppercase" style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
            {isLogin ? 'Authenticate Clearance' : 'Initialize Identity'}
          </h2>
        </div>
        
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
          {!isLogin && (
            <div className="reveal">
              <label className="small text-secondary fw-bold mb-2">Full Name Index</label>
              <input 
                type="text" 
                placeholder="e.g. Dr. John Doe"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}
          
          <div>
            <label className="small text-secondary fw-bold mb-2">Neural Identifier (Email Address)</label>
            <input 
              type="email" 
              placeholder="e.g. registry@medfusion.ai" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label className="small text-secondary fw-bold mb-2">Secure Access Key (Password)</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          {!isLogin && (
            <div className="reveal">
              <label className="small text-secondary fw-bold mb-2">Protocol Access Role</label>
              <select value={role} onChange={(e) => {
                setRole(e.target.value);
                setLicense('');
                setProofFile(null);
              }}>
                <option value="Patient">Standard Patient Ingestion</option>
                <option value="Doctor">Certified Clinical Examiner</option>
              </select>
            </div>
          )}

          {/* Conditional Doctor Ingestion Fields */}
          {!isLogin && role === 'Doctor' && (
            <div className="reveal mt-3 border-top border-white-5 pt-3">
              <div>
                <label className="small text-secondary fw-bold mb-2">Medical License ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. LIC-99887766-US" 
                  value={license} 
                  onChange={(e) => setLicense(e.target.value)} 
                  required 
                />
              </div>
              <div className="mt-3">
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
                  <span className="small text-info font-monospace text-uppercase d-flex align-items-center justify-content-center gap-2">
                    <Upload size={14} />
                    {proofFile ? `Selected: ${proofFile.name.toUpperCase()}` : 'Upload License Proof'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn-clinical primary mt-4 py-3 d-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase" disabled={loading} style={{ letterSpacing: '0.08em' }}>
            {loading ? (
              <>
                <RefreshCw size={16} className="spinner-border border-0" style={{ animation: 'spin 1.5s linear infinite', width: '16px', height: '16px' }} />
                Authorizing clearance...
              </>
            ) : (
              <>
                <Key size={16} />
                {isLogin ? 'Request Authorization' : 'Register Clinical Profile'}
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 text-secondary small m-0" style={{ fontSize: '0.72rem' }}>
          {isLogin ? "> Unregistered Clinical Entity?" : "> Already Synchronized?"}{' '}
          <span className="text-info cursor-pointer text-decoration-underline hover-white" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Initialize Core Profile' : 'Return to Access Gate'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;
