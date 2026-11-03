import React, { useState } from 'react';
import {
  User, Activity, Phone, Edit3, Save, X, ShieldAlert, Heart, Calendar,
  ShieldCheck, Info, CheckCircle2, Dna, Gift, HeartPulse, AlertCircle,
  Droplet, Scale, Ruler, Flame, Sparkles, Clock, QrCode, Copy, ExternalLink
} from 'lucide-react';
import { getAge } from '../../services/utils';

function ProfileIdentity({
  profile,
  user,
  isEditing,
  setIsEditing,
  editData,
  setEditData,
  saveLoading,
  handleSave,
  bmi,
  bmiCat,
  healthScore,
  history = [],
  emergencyToken = null,
  onGenerateToken,
  onRevokeToken
}) {
  const p = profile || {};
  const [copiedToken, setCopiedToken] = useState(false);

  const weightNum = parseFloat(p.weight) || 0;
  const heightNum = parseFloat(p.height) || 0;
  const ageNum = p.dob ? getAge(p.dob) : 0;

  return (
    <div className="reveal flex-grow-1 d-flex flex-column gap-4 text-start" style={{ paddingBottom: '40px' }}>

      {/* Main Profile Content Grid */}
      <div className="row g-4 mt-1 align-items-stretch">

        {/* Left Column - Holographic emergency ID smartcard & Health status Ledger */}
        <div className="col-lg-5 d-flex flex-column gap-4">
          <div className="smartcard-hologram p-4 text-start w-100 d-flex flex-column justify-content-between position-relative" style={{ borderRadius: '16px' }}>

            <div>
              <div className="d-flex justify-content-between align-items-center pb-3 mb-4 border-bottom" style={{ borderColor: 'var(--border)' }}>
                <div className="d-flex align-items-center gap-2.5">
                  <h4 className="fw-bold d-flex align-items-center gap-2 m-0 font-monospace" style={{ fontSize: '1.05rem', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    <ShieldCheck className="text-success" size={20} />
                    <span>EMERGENCY MEDICAL ID</span>
                  </h4>
                </div>

                {/* Edit Toggle Controls */}
                <div>
                  {!isEditing ? (
                    <button
                      className="px-3 py-1.5 border bg-transparent text-theme-accent rounded-3 d-flex align-items-center gap-2 font-monospace text-uppercase cursor-pointer"
                      onClick={() => {
                        setEditData({
                          first_name: p.first_name || '',
                          last_name: p.last_name || '',
                          blood_group: p.blood_group || '',
                          emergency_contact: p.emergency_contact || '',
                          allergies: Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || ''),
                          dob: p.dob || '',
                          gender: p.gender || '',
                          weight: p.weight || '',
                          height: p.height || ''
                        });
                        setIsEditing(true);
                      }}
                      style={{ width: 'auto', fontSize: '0.78rem', borderColor: 'var(--border)' }}
                    >
                      <Edit3 size={13} /> Edit details
                    </button>
                  ) : (
                    <div className="d-flex gap-2">
                      <button
                        className="px-2.5 py-1.5 border bg-transparent text-secondary rounded-3 font-monospace text-uppercase cursor-pointer"
                        onClick={() => setIsEditing(false)}
                        style={{ width: 'auto', fontSize: '0.78rem', borderColor: 'var(--border)' }}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-3 py-1.5 bg-theme-accent border-0 text-white rounded-3 d-flex align-items-center gap-2 font-monospace text-uppercase cursor-pointer"
                        onClick={handleSave}
                        disabled={saveLoading}
                        style={{ width: 'auto', fontSize: '0.78rem' }}
                      >
                        {saveLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Smartcard View / Edit Display */}
              {!isEditing ? (
                <div className="d-flex flex-column gap-3.5">

                  {/* Patient Name Visual representation */}
                  <div className="p-3.5 rounded-3 border text-start mt-1" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <span className="text-secondary font-monospace d-block text-uppercase" style={{ fontSize: '0.66rem', letterSpacing: '0.06em' }}>PATIENT NAME</span>
                    <h2 className="fw-bolder mt-1 text-uppercase text-truncate m-0" style={{ fontSize: '1.5rem', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                      {p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : user?.full_name || 'Anonymous Patient'}
                    </h2>
                    <span className="text-secondary font-monospace small d-block mt-1" style={{ fontSize: '0.76rem' }}>
                      PATIENT ID: <strong className="text-theme-accent">{p.vault_id || 'MF-NODE-GUEST'}</strong>
                    </span>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-3.5 rounded-3 border d-flex justify-content-between align-items-center transition-all mt-1" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <span className="small text-secondary d-block text-uppercase mb-1" style={{ fontSize: '0.66rem', letterSpacing: '0.06em' }}>EMERGENCY CONTACT</span>
                      <strong className="fs-5 font-monospace" style={{ color: 'var(--text-primary)' }}>{p.emergency_contact || 'None registered'}</strong>
                    </div>
                    {p.emergency_contact ? (
                      <a
                        href={`tel:${p.emergency_contact}`}
                        title={`Call ${p.emergency_contact}`}
                        className="rounded-circle d-flex align-items-center justify-content-center text-decoration-none shadow-sm transition-all"
                        style={{
                          width: '46px',
                          height: '46px',
                          background: 'linear-gradient(135deg, var(--brand-orange) 0%, #d85a12 100%)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Phone size={20} color="#FFFFFF" strokeWidth={2.4} />
                      </a>
                    ) : (
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                        style={{
                          width: '46px',
                          height: '46px',
                          background: 'rgba(230, 115, 38, 0.15)',
                          color: 'var(--brand-orange)',
                          border: '1px solid rgba(230, 115, 38, 0.35)',
                          flexShrink: 0
                        }}
                      >
                        <Phone size={20} color="var(--brand-orange)" strokeWidth={2.4} />
                      </div>
                    )}
                  </div>

                  {/* Allergic Contraindications */}
                  <div className="p-3.5 rounded-3 text-start mt-1" style={{ border: '1px solid var(--border)', borderLeft: '4px solid var(--accent-red)', background: 'rgba(185, 28, 28, 0.05)' }}>
                    <span className="small text-danger d-block text-uppercase mb-2 fw-bold font-monospace" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>DRUG & FOOD ALLERGIES</span>
                    <div className="d-flex flex-wrap gap-2">
                      {p.allergies && (Array.isArray(p.allergies) ? p.allergies.length > 0 : String(p.allergies).trim().length > 0) ? (
                        (Array.isArray(p.allergies) ? p.allergies : String(p.allergies).split(',')).map((a, idx) => (
                          <span key={idx} className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 py-1.5 px-3 rounded-pill text-uppercase font-monospace fw-bold" style={{ fontSize: '0.72rem', letterSpacing: '0.02em' }}>
                            {String(a).trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.8rem' }}>No drug/food allergies logged.</span>
                      )}
                    </div>
                  </div>

                  {/* Emergency Responder Token Link */}
                  {emergencyToken ? (
                    <div className="p-3 rounded-3 mt-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="font-monospace fw-bold d-flex align-items-center gap-1.5" style={{ fontSize: '0.72rem', color: 'var(--status-success)' }}>
                          <CheckCircle2 size={14} /> EMERGENCY RESPONDER ACCESS ACTIVE
                        </span>
                        {onRevokeToken && (
                          <button
                            onClick={onRevokeToken}
                            className="btn-clinical secondary px-2.5 py-1 font-monospace text-uppercase"
                            style={{ fontSize: '0.66rem' }}
                            title="Revoke active token"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/emergency/${emergencyToken}`}
                          className="form-control form-control-sm font-monospace"
                          style={{ fontSize: '0.74rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/emergency/${emergencyToken}`);
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 2000);
                          }}
                          className="btn-clinical primary px-3 py-1 font-monospace text-uppercase flex-shrink-0"
                          style={{ fontSize: '0.72rem' }}
                        >
                          <Copy size={12} className="me-1" />
                          {copiedToken ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : onGenerateToken ? (
                    <div className="mt-1">
                      <button
                        onClick={onGenerateToken}
                        className="btn-clinical secondary px-3 py-2 w-100 font-monospace text-uppercase d-flex align-items-center justify-content-center gap-2"
                        style={{ fontSize: '0.74rem', border: '1px dashed var(--border)', borderRadius: '8px' }}
                      >
                        <QrCode size={14} />
                        <span>Generate Emergency Responder Link</span>
                      </button>
                    </div>
                  ) : null}

                </div>
              ) : (
                /* Edit Form inputs in left column */
                <div className="d-flex flex-column gap-3 text-start mt-2" style={{ fontSize: '0.84rem' }}>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="text-secondary small d-block mb-1 font-monospace">FIRST NAME</label>
                      <input
                        type="text"
                        value={editData.first_name || ''}
                        onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                        className="w-100 p-2.5 rounded-2 font-monospace"
                        style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="text-secondary small d-block mb-1 font-monospace">LAST NAME</label>
                      <input
                        type="text"
                        value={editData.last_name || ''}
                        onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                        className="w-100 p-2.5 rounded-2 font-monospace"
                        style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-secondary small d-block mb-1 font-monospace">BLOOD GROUP</label>
                    <select
                      value={editData.blood_group || ''}
                      onChange={(e) => setEditData({...editData, blood_group: e.target.value})}
                      className="w-100 rounded-2 p-2.5 font-monospace"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    >
                      <option value="">Select Blood Group</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-secondary small d-block mb-1 font-monospace">EMERGENCY CONTACT PHONE</label>
                    <input
                      type="text"
                      value={editData.emergency_contact || ''}
                      onChange={(e) => setEditData({...editData, emergency_contact: e.target.value})}
                      placeholder="Phone number"
                      className="w-100 p-2.5 rounded-2 font-monospace"
                      style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label className="text-secondary small d-block mb-1 font-monospace">ALLERGIES (COMMA SEPARATED)</label>
                    <input
                      type="text"
                      value={editData.allergies || ''}
                      onChange={(e) => setEditData({...editData, allergies: e.target.value})}
                      placeholder="Penicillin, Sulfa, Aspirin..."
                      className="w-100 p-2.5 rounded-2 font-monospace"
                      style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

            </div>

            <div className="border-top pt-3 mt-4 d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border)' }}>
              <span className="text-secondary font-monospace" style={{ fontSize: '0.72rem', opacity: 0.7 }}>MedFusion Emergency Health Protocol</span>
              <span className="text-theme-accent font-monospace" style={{ fontSize: '0.72rem' }}>HIPAA Level 3</span>
            </div>
          </div>
        </div>

        {/* Right Column - Biometrics Grid & Ledger */}
        <div className="col-lg-7 d-flex flex-column gap-4">
          <div className="d-flex flex-column gap-4">

            {/* A. Clinical Demographics Grid */}
            <div className="glass-card p-4 text-start w-100" style={{ borderRadius: '16px' }}>
              <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom" style={{ borderColor: 'var(--border)' }}>
                <h4 className="fw-bold d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.05rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                  <Activity className="text-theme-accent" size={20} />
                  <span>CLINICAL DEMOGRAPHICS</span>
                </h4>
                <span className="badge rounded-pill px-2.5 py-1" style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  VERIFIED EHR
                </span>
              </div>

              {!isEditing ? (
                <div className="row g-3">

                  {/* Age Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-age h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Calendar size={15} style={{ color: '#8B5CF6' }} />
                        <span className="text-secondary fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>AGE</span>
                      </div>
                      <strong className="fs-5 fw-bold" style={{ color: '#8B5CF6', fontFamily: 'var(--font-mono)' }}>
                        {p.dob ? `${getAge(p.dob)} Yrs` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Biological Sex Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-sex h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Dna size={15} style={{ color: '#F08080' }} />
                        <span className="text-secondary fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>GENDER</span>
                      </div>
                      <strong className="fs-5 fw-bold" style={{ color: '#F08080', fontFamily: 'var(--font-mono)' }}>
                        {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* DOB Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-dob h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Gift size={15} style={{ color: '#22C5E0' }} />
                        <span className="text-secondary fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>DATE OF BIRTH</span>
                      </div>
                      <strong className="fw-bold" style={{ color: '#22C5E0', fontSize: '0.98rem', fontFamily: 'var(--font-mono)' }}>
                        {p.dob || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Blood Group Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-blood h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Droplet size={15} style={{ color: 'var(--brand-orange)' }} />
                        <span className="text-secondary fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>BLOOD GROUP</span>
                      </div>
                      <strong className="fs-5 fw-bold" style={{ color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)' }}>
                        {p.blood_group || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Height Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-height h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Ruler size={15} style={{ color: '#2DB8B0' }} />
                        <span className="text-secondary fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>HEIGHT</span>
                      </div>
                      <strong className="fs-5 fw-bold" style={{ color: '#2DB8B0', fontFamily: 'var(--font-mono)' }}>
                        {p.height ? `${p.height} cm` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Weight Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-weight h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Scale size={15} style={{ color: '#34C97A' }} />
                        <span className="text-secondary fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>WEIGHT</span>
                      </div>
                      <strong className="fs-5 fw-bold" style={{ color: '#34C97A', fontFamily: 'var(--font-mono)' }}>
                        {p.weight ? `${p.weight} kg` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                </div>
              ) : (
                /* Edit Form inputs in demographics card */
                <div className="row g-3 text-start" style={{ fontSize: '0.84rem' }}>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">BODY WEIGHT (KG)</label>
                    <input
                      type="number"
                      value={editData.weight || ''}
                      onChange={(e) => setEditData({...editData, weight: e.target.value})}
                      placeholder="kg"
                      className="w-100 p-2.5 rounded-2 font-monospace"
                      style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">STATURE HEIGHT (CM)</label>
                    <input
                      type="number"
                      value={editData.height || ''}
                      onChange={(e) => setEditData({...editData, height: e.target.value})}
                      placeholder="cm"
                      className="w-100 p-2.5 rounded-2 font-monospace"
                      style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">DATE OF BIRTH</label>
                    <input
                      type="date"
                      value={editData.dob || ''}
                      onChange={(e) => setEditData({...editData, dob: e.target.value})}
                      className="w-100 p-2.5 rounded-2 font-monospace"
                      style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">GENDER</label>
                    <select
                      value={editData.gender || ''}
                      onChange={(e) => setEditData({...editData, gender: e.target.value})}
                      className="w-100 rounded-2 p-2.5 font-monospace"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* B. Daily Clinical Targets & Health Insights */}
            <div className="glass-card p-3.5 text-start w-100 border-theme-accent border-opacity-15" style={{ borderRadius: '16px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-secondary small fw-bold font-monospace d-flex align-items-center gap-2" style={{ fontSize: '0.76rem', letterSpacing: '0.04em' }}>
                  <Sparkles size={14} className="text-theme-accent" />
                  DAILY CLINICAL TARGETS & HEALTH INSIGHTS
                </span>
              </div>

              <div className="row g-3 font-monospace">
                {/* Target 1: Hydration */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-hydration p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.64rem', letterSpacing: '0.04em' }}>HYDRATION</span>
                      <Droplet size={14} style={{ color: '#5B9FE0' }} />
                    </div>
                    <div>
                      <strong className="fs-6 d-block mt-0.5" style={{ color: '#5B9FE0' }}>
                        {weightNum > 0 ? (weightNum * 35 / 1000).toFixed(1) : '2.5'} L
                      </strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.62rem', opacity: 0.7 }}>35ml/kg baseline</span>
                    </div>
                  </div>
                </div>

                {/* Target 2: BMR */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-bmr p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.64rem', letterSpacing: '0.04em' }}>METABOLIC BMR</span>
                      <Flame size={14} style={{ color: 'var(--brand-orange)' }} />
                    </div>
                    <div>
                      <strong className="fs-6 d-block mt-0.5" style={{ color: 'var(--brand-orange)' }}>
                        {weightNum > 0 && heightNum > 0 && ageNum > 0 ?
                          Math.round(10 * weightNum + 6.25 * heightNum - 5 * ageNum + (p.gender === 'M' ? 5 : -161))
                          : '1,800'} kcal
                      </strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.62rem', opacity: 0.7 }}>Mifflin BMR</span>
                    </div>
                  </div>
                </div>

                {/* Target 3: Sleep */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-sleep p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.64rem', letterSpacing: '0.04em' }}>OPTIMAL SLEEP</span>
                      <Clock size={14} style={{ color: '#2DB8B0' }} />
                    </div>
                    <div>
                      <strong className="fs-6 d-block mt-0.5" style={{ color: '#2DB8B0' }}>7.5 - 8.5 Hrs</strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.62rem', opacity: 0.7 }}>Circadian cycle</span>
                    </div>
                  </div>
                </div>

                {/* Target 4: Cardio */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-cardio p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.64rem', letterSpacing: '0.04em' }}>CARDIO TARGET</span>
                      <Activity size={14} style={{ color: '#F56565' }} />
                    </div>
                    <div>
                      <strong className="fs-6 d-block mt-0.5" style={{ color: '#F56565' }}>150 Min / Wk</strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.62rem', opacity: 0.7 }}>AHA standard</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileIdentity;
