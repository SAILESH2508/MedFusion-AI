import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy standalone Diet Planner page.
 * Consolidated into the unified Digital Twin experience (/digital-twin?tab=diet).
 */
export default function DietPlanner() {
  return <Navigate to="/digital-twin?tab=diet" replace />;
}
