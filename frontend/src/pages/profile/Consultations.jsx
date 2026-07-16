import React from 'react';
import { Calendar, User, Phone, CheckSquare, Plus, Clock, X } from 'lucide-react';

function Consultations({
  upcomingAppointments,
  selectedDoctor,
  setSelectedDoctor,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  appointmentReason,
  setAppointmentReason,
  showBookingModal,
  setShowBookingModal,
  handleBookAppointment
}) {
  const virtualDoctorsList = [
    { id: 'dr-1', name: 'Dr. Alice Vance', specialty: 'Cardiology (Heart Care)', avatar: 'AV' },
    { id: 'dr-2', name: 'Dr. Robert Chen', specialty: 'Endocrinology (Diabetes)', avatar: 'RC' },
    { id: 'dr-3', name: 'Dr. Sarah Jenkins', specialty: 'General Medicine', avatar: 'SJ' },
    { id: 'dr-4', name: 'Dr. Marcus Brody', specialty: 'Neurology (Brain/Nerve)', avatar: 'MB' }
  ];

  return (
    <div className="glass-card p-4 text-start vault-glass-card h-100 d-flex flex-column animate-fadeIn theme-general">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center border-bottom border-white-10 pb-3 mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-2">
          <Calendar className="text-theme-accent" />
          <h3 className="fw-bold text-white m-0" style={{ fontSize: '1.35rem' }}>
            Consultations
          </h3>
        </div>
        <button 
          onClick={() => {
            if (!selectedDoctor && virtualDoctorsList.length > 0) {
              setSelectedDoctor(virtualDoctorsList[0]);
            }
            setShowBookingModal(true);
          }}
          className="px-3 py-1.5 bg-theme-accent text-white border-0 rounded font-monospace text-uppercase hover-white font-bold d-flex align-items-center gap-1.5 text-nowrap flex-shrink-0"
          style={{ fontSize: '0.75rem', width: 'auto' }}
        >
          <Plus size={12} /> Book Session
        </button>
      </div>

      {/* Main Content List Container (Scrollable) */}
      <div className="d-flex flex-column gap-3.5 vault-list-container flex-grow-1" style={{ overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Upcoming appointments list */}
        <div>
          <span className="text-white fw-bold d-block mb-3 text-uppercase font-monospace" style={{ fontSize: '0.85rem', letterSpacing: '0.02em' }}>
            Upcoming Sessions
          </span>
          {upcomingAppointments.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center text-center py-4 px-3 bg-white-5 rounded-4 border border-dashed border-white-10 font-monospace text-secondary" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <Clock size={20} className="text-theme-accent mb-2 opacity-60" />
              <strong className="text-white d-block mb-1" style={{ fontSize: '0.82rem' }}>NO SCHEDULED SESSIONS</strong>
              <p className="m-0" style={{ fontSize: '0.74rem', lineHeight: '1.4', opacity: 0.7, maxWidth: '280px' }}>
                Use the "Book Session" button or select a specialist from the directory below to arrange a consultation.
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-1">
              {upcomingAppointments.map((app) => (
                <div key={app.id} className="consultation-item-card font-monospace text-secondary">
                  <div className="d-flex align-items-baseline justify-content-between mb-2 pb-1 border-bottom border-white-5 flex-wrap gap-2">
                    <div className="d-flex align-items-baseline gap-2 flex-wrap">
                      <strong className="text-white" style={{ fontSize: '0.92rem' }}>{app.doctor.name}</strong>
                      <span className="text-theme-accent fw-bold" style={{ fontSize: '0.76rem' }}>&mdash; {app.doctor.specialty}</span>
                    </div>
                    <span className="badge bg-success bg-opacity-15 text-success border border-success border-opacity-20 py-0.5 px-2.5 text-uppercase" style={{ fontSize: '0.62rem' }}>
                      {app.status}
                    </span>
                  </div>
                  <div className="row g-2 text-white font-monospace mb-1.5" style={{ fontSize: '0.78rem' }}>
                    <div className="col-6">
                      <span className="text-secondary small d-block mb-0.5" style={{ fontSize: '0.65rem' }}>DATE</span>
                      <span>{app.date}</span>
                    </div>
                    <div className="col-6">
                      <span className="text-secondary small d-block mb-0.5" style={{ fontSize: '0.65rem' }}>TIME</span>
                      <span>{app.time}</span>
                    </div>
                  </div>
                  {app.reason && (
                    <div className="p-2.5 bg-white-5 rounded border border-white-5 text-secondary small italic mt-2.5" style={{ fontSize: '0.74rem', lineHeight: '1.4' }}>
                      Reason: {app.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Specialist Directory */}
        <div className="mt-2">
          <span className="text-white fw-bold d-block mb-3 text-uppercase font-monospace" style={{ fontSize: '0.85rem', letterSpacing: '0.02em' }}>
            Specialist Directory
          </span>
          <div className="d-flex flex-column gap-1">
            {virtualDoctorsList.map((doc) => {
              const isSelected = selectedDoctor?.id === doc.id;
              return (
                <div 
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setShowBookingModal(true);
                  }}
                  className={`doctor-tile cursor-pointer d-flex align-items-center justify-content-between ${isSelected ? 'selected' : ''}`}
                  style={{ fontSize: '0.85rem' }}
                >
                  <div className="d-flex align-items-center gap-3.5 min-width-0 flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="rounded-circle bg-theme-accent bg-opacity-10 border border-theme-accent border-opacity-35 d-flex align-items-center justify-content-center font-bold text-theme-accent flex-shrink-0" style={{ width: '40px', height: '40px', fontSize: '0.85rem', flexShrink: 0 }}>
                      {doc.avatar}
                    </div>
                    <div className="min-width-0 flex-grow-1 text-start d-flex align-items-baseline gap-2 flex-wrap" style={{ minWidth: 0 }}>
                      <strong className="text-white font-monospace text-truncate" style={{ fontSize: '0.92rem' }}>{doc.name}</strong>
                      <span className="text-secondary small font-monospace text-truncate" style={{ fontSize: '0.76rem' }} title={doc.specialty}>&mdash; {doc.specialty}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDoctor(doc);
                      setShowBookingModal(true);
                    }}
                    className="px-3 py-1.5 border border-white-10 bg-transparent text-secondary rounded hover-white font-monospace text-uppercase flex-shrink-0 ms-2"
                    style={{ fontSize: '0.76rem', width: 'auto', flexShrink: 0 }}
                  >
                    Book
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Form Modal Overlay */}
      {showBookingModal && selectedDoctor && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-container text-start font-monospace border-theme-accent border bg-white-5" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '30px' }}>
            <button className="modal-close-btn" onClick={() => setShowBookingModal(false)}>
              <X size={20} />
            </button>
            <h4 className="fw-bold text-white mb-2 text-uppercase font-monospace border-bottom border-white-10 pb-2.5">
              Book Consultation
            </h4>
            <span className="text-theme-accent fw-bold d-block mb-3" style={{ fontSize: '0.88rem' }}>
              Consulting: {selectedDoctor.name} ({selectedDoctor.specialty})
            </span>
            
            <form onSubmit={handleBookAppointment} className="d-flex flex-column gap-3" style={{ fontSize: '0.85rem' }}>
              <div>
                <label className="text-secondary small fw-semibold mb-1 d-block">Consultation Date</label>
                <input 
                  type="date" 
                  value={appointmentDate} 
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-100 bg-white-5 text-white border-white-10 rounded p-2.5" 
                  required
                />
              </div>

              <div>
                <label className="text-secondary small fw-semibold mb-1 d-block">Preferred Time Slot</label>
                <select 
                  value={appointmentTime} 
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-100 bg-white-5 text-white border-white-10 rounded p-2.5 bg-dark"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </div>

              <div>
                <label className="text-secondary small fw-semibold mb-1 d-block">Reason for Appointment</label>
                <textarea 
                  placeholder="Summarize your symptoms or queries for the doctor..."
                  value={appointmentReason} 
                  onChange={(e) => setAppointmentReason(e.target.value)}
                  rows={3}
                  className="w-100 bg-white-5 text-white border-white-10 rounded p-2.5" 
                  style={{ resize: 'none' }}
                  required
                />
              </div>

              <div className="d-flex gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2.5 border border-white-10 bg-transparent text-secondary rounded w-50 text-uppercase font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-clinical primary py-2.5 w-50 text-uppercase font-bold"
                  style={{ padding: '10px 24px' }}
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Consultations;
