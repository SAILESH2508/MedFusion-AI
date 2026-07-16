import React from 'react';
import DoctorDashboard from './dashboard/DoctorDashboard';
import PatientDashboard from './dashboard/PatientDashboard';

function Dashboard({ user }) {
  if (user && user.role === 'Doctor') {
    return <DoctorDashboard user={user} />;
  }
  
  return <PatientDashboard user={user} />;
}

export default Dashboard;
