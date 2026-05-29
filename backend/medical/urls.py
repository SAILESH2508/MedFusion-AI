from django.urls import path
from . import views

urlpatterns = [
    # Health check
    path('health/', views.health, name='health'),
    path('health', views.health, name='health_no_slash'),
    
    # Authentication routes
    path('auth/signup/', views.signup, name='signup'),
    path('auth/signup', views.signup, name='signup_no_slash'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/login', views.login_view, name='login_no_slash'),
    
    # Prescription routes
    path('prescriptions/upload/', views.upload_prescription, name='upload_prescription'),
    path('prescriptions/', views.list_prescriptions, name='list_prescriptions'),
    path('prescriptions', views.list_prescriptions, name='list_prescriptions_no_slash'),
    
    # Pathology routes
    path('pathology/analyze/', views.analyze_pathology, name='analyze_pathology'),
    path('pathology/', views.list_pathology_reports, name='list_pathology_reports'),
    path('pathology', views.list_pathology_reports, name='list_pathology_reports_no_slash'),
    
    # Emergency and profile routes
    path('telemetry/emergency', views.get_emergency_snapshot, name='emergency_snapshot'),
    path('telemetry/emergency/', views.get_emergency_snapshot, name='emergency_snapshot_slash'),
    path('telemetry/health', views.health_monitoring, name='health_monitoring'),
    path('telemetry/health/', views.health_monitoring, name='health_monitoring_slash'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/update', views.update_profile, name='update_profile_no_slash'),
    
    # Prediction routes
    path('predictions/predict/', views.run_prediction, name='run_prediction'),
    path('predictions/predict', views.run_prediction, name='run_prediction_no_slash'),
    path('predictions/history/', views.list_predictions, name='list_predictions_history'),
    path('predictions/history', views.list_predictions, name='list_predictions_history_no_slash'),
    path('predictions/', views.list_predictions, name='list_predictions'),
    path('predictions', views.list_predictions, name='list_predictions_no_slash'),
    path('predictions/<int:pk>/', views.get_prediction, name='get_prediction'),
    path('predictions/<int:pk>', views.get_prediction, name='get_prediction_no_slash'),
    
    # Doctor Patient Management Routes
    path('patients/', views.list_patients, name='list_patients'),
    path('patients', views.list_patients, name='list_patients_no_slash'),
    path('patients/<int:patient_id>/', views.get_patient_details, name='get_patient_details'),
    path('patients/<int:patient_id>', views.get_patient_details, name='get_patient_details_no_slash'),
    path('patients/<int:patient_id>/prescribe/', views.add_manual_prescription, name='add_manual_prescription'),
    path('patients/<int:patient_id>/prescribe', views.add_manual_prescription, name='add_manual_prescription_no_slash'),
]
