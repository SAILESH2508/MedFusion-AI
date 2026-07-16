from django.urls import path, re_path
from . import views

urlpatterns = [
    # Health check
    re_path(r'^health/?$', views.health, name='health'),
    
    # Authentication routes
    re_path(r'^auth/signup/?$', views.signup, name='signup'),
    re_path(r'^auth/login/?$', views.login_view, name='login'),
    
    # Prescription routes
    re_path(r'^prescriptions/upload/?$', views.upload_prescription, name='upload_prescription'),
    re_path(r'^prescriptions/?$', views.list_prescriptions, name='list_prescriptions'),
    
    # Pathology routes
    re_path(r'^pathology/analyze/?$', views.analyze_pathology, name='analyze_pathology'),
    re_path(r'^pathology/?$', views.list_pathology_reports, name='list_pathology_reports'),
    
    # Emergency and profile routes
    re_path(r'^telemetry/emergency/?$', views.get_emergency_snapshot, name='emergency_snapshot'),
    re_path(r'^telemetry/health/?$', views.health_monitoring, name='health_monitoring'),
    re_path(r'^profile/update/?$', views.update_profile, name='update_profile'),
    
    # Prediction routes
    re_path(r'^predictions/predict/?$', views.run_prediction, name='run_prediction'),
    re_path(r'^predictions/history/?$', views.list_predictions, name='list_predictions_history'),
    re_path(r'^predictions/?$', views.list_predictions, name='list_predictions'),
    re_path(r'^predictions/(?P<pk>\d+)/?$', views.get_prediction, name='get_prediction'),
    
    # Doctor Patient Management Routes
    re_path(r'^patients/?$', views.list_patients, name='list_patients'),
    re_path(r'^patients/(?P<patient_id>\d+)/?$', views.get_patient_details, name='get_patient_details'),
    re_path(r'^patients/(?P<patient_id>\d+)/prescribe/?$', views.add_manual_prescription, name='add_manual_prescription'),
    re_path(r'^telemetry/chat/?$', views.patient_chat, name='patient_chat'),
    re_path(r'^telemetry/drug-safety/?$', views.check_drug_safety, name='check_drug_safety'),
]
