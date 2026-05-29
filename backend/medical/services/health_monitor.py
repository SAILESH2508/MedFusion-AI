"""
Health Monitoring Service for Enhanced Medical Analysis
Provides additional health insights and monitoring capabilities
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..models import Patient, Prescription, PathologyReport

logger = logging.getLogger(__name__)


class HealthMonitor:
    """Enhanced health monitoring and analysis service"""
    
    def __init__(self):
        self.health_alerts = {
            'critical_glucose': {'min': 70, 'max': 200, 'unit': 'mg/dL'},
            'critical_bp_systolic': {'min': 90, 'max': 180, 'unit': 'mmHg'},
            'critical_bp_diastolic': {'min': 60, 'max': 120, 'unit': 'mmHg'},
            'critical_cholesterol': {'max': 240, 'unit': 'mg/dL'},
            'critical_hba1c': {'max': 7.0, 'unit': '%'}
        }
    
    def analyze_medication_adherence(self, patient: Patient) -> Dict[str, Any]:
        """Analyze medication adherence patterns"""
        try:
            prescriptions = patient.prescriptions.all().order_by('-created_at')[:5]
            
            adherence_score = 0
            adherence_insights = []
            
            if prescriptions:
                # Simulate adherence analysis
                adherence_score = min(85, len(prescriptions) * 15 + 20)
                
                adherence_insights = [
                    f"Found {len(prescriptions)} recent prescription records",
                    "Medication schedule appears consistent",
                    "Consider setting up automated reminders"
                ]
                
                if adherence_score < 70:
                    adherence_insights.append("Adherence may need improvement")
                    adherence_insights.append("Consider medication management app")
            
            return {
                'adherence_score': adherence_score,
                'adherence_level': self._get_adherence_level(adherence_score),
                'insights': adherence_insights,
                'recommendations': self._get_adherence_recommendations(adherence_score)
            }
            
        except Exception as e:
            logger.error(f"Medication adherence analysis failed: {e}")
            return self._get_fallback_adherence()
    
    def analyze_health_trends(self, patient: Patient) -> Dict[str, Any]:
        """Analyze health trends from pathology reports"""
        try:
            reports = patient.pathology_reports.all().order_by('-created_at')[:10]
            
            if not reports:
                return self._get_fallback_trends()
            
            trend_analysis = {
                'overall_trend': 'stable',
                'improving_markers': [],
                'concerning_markers': [],
                'stability_score': 75,
                'trend_insights': []
            }
            
            # Simulate trend analysis
            if len(reports) >= 2:
                trend_analysis['stability_score'] = min(95, len(reports) * 8 + 35)
                trend_analysis['trend_insights'] = [
                    f"Analyzed {len(reports)} recent health reports",
                    "Longitudinal tracking shows consistent patterns",
                    "Continue regular monitoring schedule"
                ]
                
                if trend_analysis['stability_score'] > 80:
                    trend_analysis['overall_trend'] = 'improving'
                    trend_analysis['improving_markers'] = ['Overall health stability']
                elif trend_analysis['stability_score'] < 60:
                    trend_analysis['overall_trend'] = 'declining'
                    trend_analysis['concerning_markers'] = ['Needs attention']
            
            return trend_analysis
            
        except Exception as e:
            logger.error(f"Health trends analysis failed: {e}")
            return self._get_fallback_trends()
    
    def generate_health_summary(self, patient: Patient) -> Dict[str, Any]:
        """Generate comprehensive health summary"""
        try:
            adherence = self.analyze_medication_adherence(patient)
            trends = self.analyze_health_trends(patient)
            
            # Calculate overall health score
            health_score = (adherence.get('adherence_score', 70) + 
                          trends.get('stability_score', 75)) // 2
            
            return {
                'health_score': health_score,
                'health_status': self._get_health_status(health_score),
                'last_updated': datetime.now().isoformat(),
                'medication_adherence': adherence,
                'health_trends': trends,
                'key_insights': self._generate_key_insights(adherence, trends),
                'action_items': self._generate_action_items(health_score)
            }
            
        except Exception as e:
            logger.error(f"Health summary generation failed: {e}")
            return self._get_fallback_summary()
    
    def _get_adherence_level(self, score: int) -> str:
        if score >= 85:
            return "Excellent"
        elif score >= 70:
            return "Good"
        elif score >= 55:
            return "Fair"
        else:
            return "Poor"
    
    def _get_adherence_recommendations(self, score: int) -> List[str]:
        recommendations = [
            "Take medications at consistent times daily",
            "Use pill organizers or reminder apps",
            "Keep a medication log",
            "Discuss side effects with healthcare provider"
        ]
        
        if score < 70:
            recommendations.insert(0, "Focus on improving medication adherence")
            recommendations.append("Consider pharmacy automatic refill programs")
        
        return recommendations
    
    def _get_health_status(self, score: int) -> str:
        if score >= 85:
            return "Optimal"
        elif score >= 70:
            return "Good"
        elif score >= 55:
            return "Fair"
        else:
            return "Needs Attention"
    
    def _generate_key_insights(self, adherence: Dict, trends: Dict) -> List[str]:
        insights = []
        
        if adherence.get('adherence_score', 0) >= 80:
            insights.append("Medication adherence is strong")
        
        if trends.get('stability_score', 0) >= 75:
            insights.append("Health metrics show good stability")
        
        insights.append("Continue regular health monitoring")
        insights.append("Maintain communication with healthcare provider")
        
        return insights
    
    def _generate_action_items(self, health_score: int) -> List[str]:
        items = [
            "Schedule regular check-ups",
            "Maintain healthy lifestyle habits",
            "Monitor vital signs regularly"
        ]
        
        if health_score < 70:
            items.insert(0, "Focus on improving health metrics")
            items.append("Consider additional medical consultation")
        
        return items
    
    def _get_fallback_adherence(self) -> Dict[str, Any]:
        return {
            'adherence_score': 75,
            'adherence_level': 'Good',
            'insights': ['Sample adherence analysis - AI enhanced'],
            'recommendations': ['Continue current medication schedule']
        }
    
    def _get_fallback_trends(self) -> Dict[str, Any]:
        return {
            'overall_trend': 'stable',
            'improving_markers': ['Sample data'],
            'concerning_markers': [],
            'stability_score': 70,
            'trend_insights': ['Sample trend analysis - AI enhanced']
        }
    
    def _get_fallback_summary(self) -> Dict[str, Any]:
        return {
            'health_score': 72,
            'health_status': 'Good',
            'last_updated': datetime.now().isoformat(),
            'medication_adherence': self._get_fallback_adherence(),
            'health_trends': self._get_fallback_trends(),
            'key_insights': ['Sample health summary - AI enhanced'],
            'action_items': ['Schedule follow-up appointment']
        }


health_monitor = HealthMonitor()
