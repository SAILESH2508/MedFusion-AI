import React from 'react';
import { User, Activity, Phone, Edit3, Save, X, ShieldAlert, Heart, Calendar, ShieldCheck, Info, CheckCircle2, Dna, Gift, HeartPulse, AlertCircle, Droplet, Scale, Ruler, Flame, Sparkles, Clock } from 'lucide-react';
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
  history = []
}) {

  return (
    <div className="reveal flex-grow-1 d-flex flex-column gap-4 text-start">
      
      {/* 2. Main Profile Content Grid */}
      <div className="row g-4 mt-1 align-items-stretch vault-tab-row">
        
        {/* Left Column - Holographic emergency ID smartcard & Health status Ledger */}
        <div className="col-lg-5 d-flex flex-column gap-4">
          <div className="smartcard-hologram p-4 text-start w-100 d-flex flex-column justify-content-between position-relative" style={{ minHeight: '420px' }}>
            
            {/* Holographic visuals */}
            <div className="smartcard-bio-grid"></div>
            <div className="smartcard-scanner-beam"></div>

            <div>
              <div className="d-flex justify-content-between align-items-center pb-3 mb-4 border-bottom border-white-10">
                <div className="d-flex align-items-center gap-2.5">
                  <h4 className="fw-bold text-white d-flex align-items-center gap-2 m-0 font-monospace" style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}>
                    <ShieldCheck className="text-success animate-pulse" size={18} />
                    EMERGENCY MEDICAL ID
                  </h4>
                </div>
                
                {/* Edit Toggle Controls */}
                <div>
                  {!isEditing ? (
                    <button 
                      className="px-3 py-1.5 border border-white-10 bg-transparent text-theme-accent rounded-3 d-flex align-items-center gap-2 hover-white font-monospace text-uppercase" 
                      onClick={() => {
                        setEditData({
                          first_name: profile.first_name || '',
                          last_name: profile.last_name || '',
                          blood_group: profile.blood_group || '',
                          emergency_contact: profile.emergency_contact || '',
                          allergies: profile.allergies?.join(', ') || '',
                          dob: profile.dob || '',
                          gender: profile.gender || '',
                          weight: profile.weight || '',
                          height: profile.height || ''
                        });
                        setIsEditing(true);
                      }}
                      style={{ width: 'auto', fontSize: '0.74rem' }}
                    >
                      <Edit3 size={11} /> Edit details
                    </button>
                  ) : (
                    <div className="d-flex gap-2">
                      <button 
                        className="px-2.5 py-1.5 border border-white-10 bg-transparent text-secondary rounded-3 font-monospace text-uppercase" 
                        onClick={() => setIsEditing(false)}
                        style={{ width: 'auto', fontSize: '0.74rem' }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="px-3 py-1.5 bg-theme-accent border-0 text-white rounded-3 d-flex align-items-center gap-2 hover-white font-monospace text-uppercase" 
                        onClick={handleSave}
                        disabled={saveLoading}
                        style={{ width: 'auto', fontSize: '0.74rem' }}
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
                  <div className="p-3 bg-white-5 rounded-4 border border-white-5 text-start mt-2">
                    <span className="text-secondary font-monospace d-block text-uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.06em' }}>PATIENT NAME</span>
                    <h2 className="text-white fw-bolder mt-1 text-uppercase text-truncate" style={{ fontSize: '1.6rem', letterSpacing: '0.02em', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
                      {profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}` : user?.full_name || 'Anonymous Patient'}
                    </h2>
                    <span className="text-secondary font-monospace small" style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                      PATIENT ID: <strong className="text-theme-accent">{profile.vault_id || 'MF-NODE-GUEST'}</strong>
                    </span>
                  </div>

                  {/* Emergency Contact */}
                  <div className="bg-white-5 p-3.5 rounded-4 border border-white-5 d-flex justify-content-between align-items-center hover-border-theme-accent-glow transition-all mt-1">
                    <div>
                      <span className="small text-secondary d-block text-uppercase mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.06em' }}>EMERGENCY CONTACT</span>
                      <strong className="text-white fs-5 font-monospace">{profile.emergency_contact || 'None registered'}</strong>
                    </div>
                    <div className="p-3 bg-theme-accent bg-opacity-10 rounded-circle text-theme-accent border border-theme-accent border-opacity-20 shadow-lg">
                      <Phone size={18} />
                    </div>
                  </div>

                  {/* Allergic Contraindications */}
                  <div className="p-3.5 rounded-4 text-start mt-1" style={{ borderTop: '1px solid rgba(255, 51, 102, 0.15)', borderRight: '1px solid rgba(255, 51, 102, 0.15)', borderBottom: '1px solid rgba(255, 51, 102, 0.15)', borderLeft: '4px solid #ff3366', background: 'rgba(255, 51, 102, 0.02)' }}>
                    <span className="small text-danger d-block text-uppercase mb-2.5 fw-bold font-monospace" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>DRUG & FOOD ALLERGIES</span>
                    <div className="d-flex flex-wrap gap-2">
                      {profile.allergies?.length > 0 ? (
                        profile.allergies.map((a, idx) => (
                          <span key={idx} className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 py-1.5 px-3 rounded-pill text-uppercase font-monospace fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.02em' }}>
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-secondary italic font-monospace" style={{ fontSize: '0.78rem' }}>No drug/food allergies logged.</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Form inputs in left column */
                <div className="d-flex flex-column gap-3.5 text-start mt-2" style={{ fontSize: '0.82rem' }}>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="text-secondary small d-block mb-1 font-monospace">FIRST NAME</label>
                      <input 
                        type="text" 
                        value={editData.first_name || ''} 
                        onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                        className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                      />
                    </div>
                    <div className="col-6">
                      <label className="text-secondary small d-block mb-1 font-monospace">LAST NAME</label>
                      <input 
                        type="text" 
                        value={editData.last_name || ''} 
                        onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                        className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-secondary small d-block mb-1 font-monospace">BLOOD GROUP</label>
                    <input 
                      type="text" 
                      value={editData.blood_group || ''} 
                      onChange={(e) => setEditData({...editData, blood_group: e.target.value})}
                      placeholder="e.g. O+, A-, AB+"
                      className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                    />
                  </div>
                  <div>
                    <label className="text-secondary small d-block mb-1 font-monospace">EMERGENCY CONTACT PHONE</label>
                    <input 
                      type="text" 
                      value={editData.emergency_contact || ''} 
                      onChange={(e) => setEditData({...editData, emergency_contact: e.target.value})}
                      placeholder="Phone number"
                      className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                    />
                  </div>
                  <div>
                    <label className="text-secondary small d-block mb-1 font-monospace">ALLERGIES (COMMA SEPARATED)</label>
                    <input 
                      type="text" 
                      value={editData.allergies || ''} 
                      onChange={(e) => setEditData({...editData, allergies: e.target.value})}
                      placeholder="Penicillin, Sulfa, Aspirin..."
                      className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-top border-white-10 pt-3 mt-4 d-flex justify-content-between align-items-center">
              <span className="text-secondary font-monospace" style={{ fontSize: '0.68rem', opacity: 0.6 }}>MedFusion ID Portal</span>
            </div>
          </div>
        </div>

        {/* Right Column - Biometrics Grid & Ledger */}
        <div className="col-lg-7 d-flex flex-column gap-4">
          <div className="d-flex flex-column gap-4">
            
            {/* A. Clinical Demographics Grid */}
            <div className="glass-card p-3.5 text-start w-100 border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '16px' }}>
              <h4 className="fw-bold text-white d-flex align-items-center gap-2 mb-3.5 font-monospace" style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}>
                <Activity className="text-theme-accent" size={18} />
                CLINICAL DEMOGRAPHICS
              </h4>

              {!isEditing ? (
                <div className="row g-3">
                  
                  {/* Age Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-age h-100">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <Calendar size={14} className="text-secondary" style={{ color: 'rgb(186, 104, 200)' }} />
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.58rem', letterSpacing: '0.04em' }}>AGE</span>
                      </div>
                      <strong className="text-white fs-5 font-monospace" style={{ textShadow: '0 0 10px rgba(186, 104, 200, 0.15)' }}>
                        {profile.dob ? `${getAge(profile.dob)} Yrs` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Biological Sex Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-sex h-100">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <Dna size={14} className="text-secondary" style={{ color: 'rgb(240, 98, 146)' }} />
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.58rem', letterSpacing: '0.04em' }}>GENDER</span>
                      </div>
                      <strong className="text-white fs-5 font-monospace" style={{ textShadow: '0 0 10px rgba(240, 98, 146, 0.15)' }}>
                        {profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* DOB Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-dob h-100">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <Gift size={14} className="text-secondary" style={{ color: 'rgb(79, 195, 247)' }} />
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.58rem', letterSpacing: '0.04em' }}>DATE OF BIRTH</span>
                      </div>
                      <strong className="text-white small font-monospace" style={{ fontSize: '0.88rem' }}>
                        {profile.dob || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Blood Group Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-blood h-100">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <Droplet size={14} className="text-secondary" style={{ color: 'rgb(255, 143, 0)' }} />
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.58rem', letterSpacing: '0.04em' }}>BLOOD GROUP</span>
                      </div>
                      <strong className="text-white fs-5 font-monospace" style={{ textShadow: '0 0 10px rgba(255, 143, 0, 0.15)' }}>
                        {profile.blood_group || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Height Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-height h-100">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <Ruler size={14} className="text-secondary" style={{ color: 'rgb(0, 245, 212)' }} />
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.58rem', letterSpacing: '0.04em' }}>HEIGHT</span>
                      </div>
                      <strong className="text-white fs-5 font-monospace" style={{ textShadow: '0 0 10px rgba(0, 245, 212, 0.15)' }}>
                        {profile.height ? `${profile.height} cm` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Weight Node */}
                  <div className="col-sm-4">
                    <div className="telemetry-node telemetry-node-weight h-100">
                      <div className="d-flex align-items-center gap-2 mb-1.5">
                        <Scale size={14} className="text-secondary" style={{ color: 'rgb(78, 205, 196)' }} />
                        <span className="text-secondary font-monospace" style={{ fontSize: '0.58rem', letterSpacing: '0.04em' }}>WEIGHT</span>
                      </div>
                      <strong className="text-white fs-5 font-monospace" style={{ textShadow: '0 0 10px rgba(78, 205, 196, 0.15)' }}>
                        {profile.weight ? `${profile.weight} kg` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                </div>
              ) : (
                /* Edit Form inputs in demographics card */
                <div className="row g-3 text-start" style={{ fontSize: '0.82rem' }}>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">BODY WEIGHT (KG)</label>
                    <input 
                      type="number" 
                      value={editData.weight || ''} 
                      onChange={(e) => setEditData({...editData, weight: e.target.value})}
                      placeholder="kg"
                      className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">STATURE HEIGHT (CM)</label>
                    <input 
                      type="number" 
                      value={editData.height || ''} 
                      onChange={(e) => setEditData({...editData, height: e.target.value})}
                      placeholder="cm"
                      className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">DATE OF BIRTH</label>
                    <input 
                      type="date" 
                      value={editData.dob || ''} 
                      onChange={(e) => setEditData({...editData, dob: e.target.value})}
                      className="w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="text-secondary small d-block mb-1 font-monospace">GENDER</label>
                    <select 
                      value={editData.gender || ''} 
                      onChange={(e) => setEditData({...editData, gender: e.target.value})}
                      className="w-100 bg-dark text-white border border-white-10 rounded p-2 font-monospace"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* B. Redesigned Daily Clinical Targets & Health Insights */}
            <div className="glass-card p-3.5 text-start w-100 border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '16px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-secondary small fw-bold font-monospace d-flex align-items-center gap-2" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  <Sparkles size={14} className="text-theme-accent animate-pulse" />
                  DAILY CLINICAL TARGETS & HEALTH INSIGHTS
                </span>
              </div>

              <div className="row g-3 font-monospace">
                {/* Target 1: Hydration */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-hydration p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>HYDRATION</span>
                      <Droplet size={14} className="text-info" style={{ color: 'var(--accent-teal)' }} />
                    </div>
                    <div>
                      <strong className="text-white fs-6 d-block mt-0.5">
                        {profile.weight ? (parseFloat(profile.weight) * 35 / 1000).toFixed(1) : '2.5'} L
                      </strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.55rem', opacity: 0.6 }}>35ml/kg baseline</span>
                    </div>
                  </div>
                </div>

                {/* Target 2: BMR */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-bmr p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>METABOLIC BMR</span>
                      <Flame size={14} style={{ color: 'var(--accent-orange)' }} />
                    </div>
                    <div>
                      <strong className="text-white fs-6 d-block mt-0.5">
                        {profile.weight && profile.height && profile.dob ? 
                          Math.round(10 * parseFloat(profile.weight) + 6.25 * parseFloat(profile.height) - 5 * getAge(profile.dob) + (profile.gender === 'M' ? 5 : -161))
                          : '1,800'} kcal
                      </strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.55rem', opacity: 0.6 }}>Mifflin BMR</span>
                    </div>
                  </div>
                </div>

                {/* Target 3: Sleep */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-sleep p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>OPTIMAL SLEEP</span>
                      <Clock size={14} style={{ color: '#df40ff' }} />
                    </div>
                    <div>
                      <strong className="text-white fs-6 d-block mt-0.5">7.5 - 8.5 Hrs</strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.55rem', opacity: 0.6 }}>Circadian cycle</span>
                    </div>
                  </div>
                </div>

                {/* Target 4: Cardio */}
                <div className="col-6 col-sm-3">
                  <div className="target-node target-node-cardio p-3 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '102px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="text-secondary d-block small" style={{ fontSize: '0.6rem', letterSpacing: '0.04em' }}>CARDIO TARGET</span>
                      <Activity size={14} style={{ color: 'var(--accent-red)' }} />
                    </div>
                    <div>
                      <strong className="text-white fs-6 d-block mt-0.5">150 Min / Wk</strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.55rem', opacity: 0.6 }}>AHA standard</span>
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
