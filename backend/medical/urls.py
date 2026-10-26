from django.urls import path, re_path
from . import views
from . import diet_views
from . import garden_views

urlpatterns = [
    # Chat endpoint
    path('chat/', views.chat, name='chat'),
    path('chat', views.chat, name='chat_no_slash'),

    # Health check
    re_path(r'^health/?$', views.health, name='health'),
    
    # Authentication routes
    re_path(r'^auth/signup/?$', views.signup, name='signup'),
    re_path(r'^auth/login/?$', views.login_view, name='login'),
    
    # Prescription routes
    re_path(r'^prescriptions/upload/?$', views.upload_prescription, name='upload_prescription'),
    re_path(r'^prescriptions/?$', views.list_prescriptions, name='list_prescriptions'),
    
    # Pathology routes
    re_path(r'^pathology/trends/?$', views.get_pathology_trends, name='pathology_trends'),
    re_path(r'^pathology/analyze/?$', views.analyze_pathology, name='analyze_pathology'),
    re_path(r'^pathology/?$', views.list_pathology_reports, name='list_pathology_reports'),
    
    # Emergency and profile routes
    re_path(r'^telemetry/emergency/?$', views.get_emergency_snapshot, name='emergency_snapshot'),
    re_path(r'^telemetry/health/?$', views.health_monitoring, name='health_monitoring'),
    re_path(r'^profile/update/?$', views.update_profile, name='update_profile'),
    
    # Prediction routes
    re_path(r'^predictions/simulate/?$', views.simulate_prediction, name='simulate_prediction'),
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

    # Emergency QR token routes
    re_path(r'^emergency/generate/?$', views.generate_emergency_token, name='generate_emergency_token'),
    re_path(r'^emergency/revoke/?$', views.revoke_emergency_token, name='revoke_emergency_token'),
    re_path(r'^emergency/(?P<token>[A-Za-z0-9_-]+)/?$', views.get_emergency_card, name='get_emergency_card'),

    # AI explain/translate route
    re_path(r'^ai/explain/?$', views.explain_result, name='explain_result'),

    # Personal Health Twin Endpoints
    re_path(r'^health-twin/organ/(?P<organ_id>[A-Za-z0-9_-]+)/?$', views.health_twin_organ_view, name='health_twin_organ'),
    re_path(r'^health-twin/timeline/?$', views.health_twin_timeline_view, name='health_twin_timeline'),
    re_path(r'^health-twin/models/?$', views.health_twin_models_view, name='health_twin_models'),
    re_path(r'^health-twin/manifest/?$', views.health_twin_manifest_view, name='health_twin_manifest'),
    re_path(r'^health-twin/observations/?$', views.health_twin_create_observation, name='health_twin_observations'),
    re_path(r'^health-twin/?$', views.health_twin_view, name='health_twin'),

    # Live nearby facilities & geocoding routes
    re_path(r'^nearby/?$', views.get_nearby_facilities, name='nearby_facilities'),
    re_path(r'^geocode/?$', views.geocode_address, name='geocode_address'),
    re_path(r'^reverse-geocode/?$', views.reverse_geocode, name='reverse_geocode'),

    # ── Diet Planner ──────────────────────────────────────────────────────
    re_path(r'^diet/preferences/?$', diet_views.diet_preferences, name='diet_preferences'),
    re_path(r'^diet/generate/?$', diet_views.generate_meal_plan, name='diet_generate'),
    re_path(r'^diet/plan/?$', diet_views.get_meal_plan, name='diet_plan'),
    re_path(r'^diet/swap/?$', diet_views.swap_meal, name='diet_swap'),
    re_path(r'^diet/meal-complete/?$', diet_views.meal_complete, name='diet_meal_complete'),
    re_path(r'^diet/favorites(?:/(?P<fav_id>\d+))?/?$', diet_views.favorites, name='diet_favorites'),
    re_path(r'^diet/shopping-list/(?P<item_id>\d+)/?$', diet_views.shopping_list_item, name='diet_shopping_item'),
    re_path(r'^diet/shopping-list/?$', diet_views.shopping_list, name='diet_shopping_list'),

    # ── Health Garden ──────────────────────────────────────────────────────
    re_path(r'^garden/activity/?$', garden_views.log_garden_activity, name='garden_activity'),
    re_path(r'^garden/status/?$', garden_views.garden_status, name='garden_status'),
    re_path(r'^garden/history/?$', garden_views.garden_history, name='garden_history'),
    re_path(r'^garden/achievements/?$', garden_views.garden_achievements, name='garden_achievements'),
    re_path(r'^garden/?$', garden_views.garden_status, name='garden_status_root'),
]

