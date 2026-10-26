import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy standalone Garden page.
 * Consolidated into the unified Digital Twin experience (/digital-twin?tab=garden).
 */
export default function Garden() {
  return <Navigate to="/digital-twin?tab=garden" replace />;
}
