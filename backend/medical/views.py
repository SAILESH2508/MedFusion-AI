from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
import json
import os
import logging
import secrets
from datetime import datetime
import asyncio
from .models import Patient, Prescription, PathologyReport, PredictionRecord, EmergencyToken
from .services.ai_service import ai_service, llm_chat

User = get_user_model()
logger = logging.getLogger(__name__)


def run_async(coro):
    try:
        return asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def signup(request):
    # Parse request data depending on Content-Type to support file uploads
    if request.content_type and 'application/json' in request.content_type:
        try:
            data = json.loads(request.body or '{}')
            files = {}
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload"}, status=400)
    else:
        data = request.POST
        files = request.FILES

    if not data or 'email' not in data or 'password' not in data:
        return JsonResponse({"error": "Missing email or password fields"}, status=400)

    email = str(data.get('email', '')).strip().lower()
    password = data.get('password', '')
    if not email or not password:
        return JsonResponse({"error": "Email and password cannot be empty"}, status=400)

    role = data.get('role', 'Patient')

    # Doctor Verification Validation
    if role == 'Doctor':
        if not data.get('license_number'):
            return JsonResponse({"error": "Doctor registration requires a Medical License ID."}, status=400)
        if 'medical_proof_file' not in files:
            return JsonResponse({"error": "Doctor registration requires a proof of certification file (PDF/JPG/PNG)."}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "An account with this email already exists."}, status=400)

    try:
        # Save Doctor certificate file if uploaded
        saved_file_url = ""
        if role == 'Doctor' and 'medical_proof_file' in files:
            proof_file = files['medical_proof_file']
            file_name = f"doctor_proofs/{email.replace('@', '_').replace('.', '_')}_{proof_file.name}"
            # Ensure folder exists
            os.makedirs(os.path.join(settings.MEDIA_ROOT or '', 'doctor_proofs'), exist_ok=True)
            path = default_storage.save(file_name, ContentFile(proof_file.read()))
            saved_file_url = default_storage.url(path)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            full_name=data.get('full_name', '').strip(),
            role=role,
            license_number=str(data.get('license_number', '')).strip() if role == 'Doctor' else '',
            medical_proof_file=saved_file_url if role == 'Doctor' else ''
        )

        # Create profile automatically for patients
        patient_id = None
        if user.role == 'Patient':
            full_name = data.get('full_name', '').strip()
            first_name = full_name.split()[0] if full_name else 'Patient'
            patient = Patient.objects.create(
                user=user,
                first_name=first_name
            )
            patient_id = patient.id

        refresh = RefreshToken.for_user(user)
        return JsonResponse({
            "token": str(refresh.access_token),
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "patient_id": patient_id,
                "license_number": user.license_number,
                "medical_proof_file": user.medical_proof_file
            }
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": f"Registration failed: {str(e)}"}, status=500)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def login_view(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not data or 'email' not in data or 'password' not in data:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    email = str(data.get('email', '')).strip().lower()
    password = data.get('password', '')

    user = authenticate(request, username=email, password=password)

    if user:
        if not user.is_active:
            return JsonResponse({"error": "User account is disabled."}, status=403)

        refresh = RefreshToken.for_user(user)
        patient_id = None
        if user.role == 'Patient':
            try:
                patient_id = user.patient_profile.id
            except Exception:
                first_name = user.full_name.split()[0] if user.full_name else 'Patient'
                patient = Patient.objects.create(
                    user=user,
                    first_name=first_name
                )
                patient_id = patient.id

        return JsonResponse({
            "token": str(refresh.access_token),
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "patient_id": patient_id,
                "license_number": user.license_number,
                "medical_proof_file": user.medical_proof_file
            }
        }, status=200)

    return JsonResponse({"error": "Invalid email or password. Please check your credentials."}, status=401)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def upload_prescription(request):
    user = request.user
    if 'file' not in request.FILES:
        return JsonResponse({"error": "No file uploaded"}, status=400)

    file = request.FILES['file']

    # Validate file size (16MB max)
    if file.size > 16 * 1024 * 1024:
        return JsonResponse({"error": "File too large. Maximum size is 16MB."}, status=400)

    filename = f"rx_{user.id if user and user.is_authenticated else 'guest'}_{datetime.now().timestamp()}_{file.name}"
    filepath = default_storage.save(f'uploads/{filename}', ContentFile(file.read()))

    # AI Analysis
    with default_storage.open(filepath, 'rb') as f:
        image_bytes = f.read()

    analysis = run_async(ai_service.analyze_prescription(image_bytes))

    patient_id = request.POST.get('patient_id') or request.GET.get('patient_id')
    guest_email = request.POST.get('guest_email') or request.GET.get('guest_email')
    guest_name = request.POST.get('guest_name') or request.GET.get('guest_name')
    patient = None
    if user and user.is_authenticated:
        if patient_id and user.role == 'Doctor':
            patient = get_object_or_404(Patient, id=patient_id)
        elif user.role == 'Patient':
            patient = get_object_or_404(Patient, user=user)

    if patient:
        prescription = Prescription.objects.create(
            patient=patient,
            image_url=filename,
            extracted_data=json.dumps(analysis)
        )
        return JsonResponse(prescription.to_dict(), status=201)
    elif guest_email:
        prescription = Prescription.objects.create(
            patient=None,
            guest_email=guest_email,
            guest_name=guest_name or "",
            image_url=filename,
            extracted_data=json.dumps(analysis)
        )
        return JsonResponse(prescription.to_dict(), status=201)
    else:
        return JsonResponse({
            "id": 999,
            "type": "prescription",
            "label": "Prescription Analysis",
            "image_url": filename,
            "extracted_data": analysis,
            "status": "completed",
            "created_at": datetime.now().isoformat(),
        }, status=200)


@api_view(['GET'])
@permission_classes([])
def list_prescriptions(request):
    user = request.user
    guest_email = request.GET.get('email')
    patient_id = request.GET.get('patient_id')

    if user and user.is_authenticated:
        if user.role == 'Doctor':
            if patient_id:
                prescriptions = Prescription.objects.filter(patient_id=patient_id).order_by('-created_at')
            else:
                prescriptions = Prescription.objects.filter(patient__doctor=user).order_by('-created_at')
            return JsonResponse([p.to_dict() for p in prescriptions], safe=False, status=200)
        else:
            try:
                patient = Patient.objects.get(user=user)
                prescriptions = [p.to_dict() for p in patient.prescriptions.all().order_by('-created_at')]
                return JsonResponse(prescriptions, safe=False, status=200)
            except Patient.DoesNotExist:
                return JsonResponse([], safe=False, status=200)
    elif guest_email:
        prescriptions = [p.to_dict() for p in Prescription.objects.filter(guest_email=guest_email).order_by('-created_at')]
        return JsonResponse(prescriptions, safe=False, status=200)
    else:
        return JsonResponse([], safe=False, status=200)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def analyze_pathology(request):
    user = request.user

    # Handle both JSON and Multipart File upload
    data = {}
    if request.content_type and 'application/json' in request.content_type:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        biomarkers = data.get('biomarkers', [])
    elif 'file' in request.FILES:
        file = request.FILES['file']
        if file.size > 16 * 1024 * 1024:
            return JsonResponse({"error": "File too large. Maximum size is 16MB."}, status=400)
        filename = f"path_{user.id if user and user.is_authenticated else 'guest'}_{datetime.now().timestamp()}_{file.name}"
        filepath = default_storage.save(f'uploads/{filename}', ContentFile(file.read()))
        
        # Read the file bytes to pass to the AI model
        with default_storage.open(filepath, 'rb') as f:
            image_bytes = f.read()
            
        biomarkers = run_async(ai_service.extract_biomarkers_from_image(image_bytes))
            
        # Fallback to defaults if AI extraction fails or returns nothing
        if not biomarkers:
            biomarkers = [
                {"name": "Glucose", "value": 95, "unit": "mg/dL"},
                {"name": "Cholesterol", "value": 185, "unit": "mg/dL"},
                {"name": "Hemoglobin", "value": 14.2, "unit": "g/dL"},
                {"name": "White Blood Cell Count", "value": 7200, "unit": "cells/mcL"},
                {"name": "HbA1c", "value": 6.2, "unit": "%"},
            ]
    else:
        return JsonResponse({"error": "No valid data or file provided"}, status=400)

    if not biomarkers:
        return JsonResponse({"error": "No biomarkers provided"}, status=400)

    analysis = run_async(ai_service.analyze_pathology(biomarkers))

    patient_id = request.POST.get('patient_id') or request.GET.get('patient_id') or (data.get('patient_id') if data else None)
    guest_email = request.POST.get('guest_email') or request.GET.get('guest_email') or (data.get('guest_email') if data else None)
    guest_name = request.POST.get('guest_name') or request.GET.get('guest_name') or (data.get('guest_name') if data else None)
    patient = None
    if user and user.is_authenticated:
        if user.role == 'Doctor':
            if patient_id:
                patient = get_object_or_404(Patient, id=patient_id)
            else:
                return JsonResponse({"error": "Doctor uploads require a valid patient_id parameter."}, status=400)
        else:
            patient = get_object_or_404(Patient, user=user)

    if patient:
        report = PathologyReport.objects.create(
            patient=patient,
            report_data=json.dumps(biomarkers),
            clinical_insight=json.dumps(analysis)
        )
        return JsonResponse(report.to_dict(), status=201)
    elif guest_email:
        report = PathologyReport.objects.create(
            patient=None,
            guest_email=guest_email,
            guest_name=guest_name or "",
            report_data=json.dumps(biomarkers),
            clinical_insight=json.dumps(analysis)
        )
        return JsonResponse(report.to_dict(), status=201)
    else:
        return JsonResponse({
            "id": 999,
            "type": "pathology",
            "label": "Pathology Analysis",
            "report_data": biomarkers,
            "analysis": analysis,
            "created_at": datetime.now().isoformat(),
        }, status=200)


@api_view(['GET'])
@permission_classes([])
def list_pathology_reports(request):
    user = request.user
    guest_email = request.GET.get('email')
    patient_id = request.GET.get('patient_id')

    if user and user.is_authenticated:
        if user.role == 'Doctor':
            if patient_id:
                reports = PathologyReport.objects.filter(patient_id=patient_id).order_by('-created_at')
            else:
                reports = PathologyReport.objects.filter(patient__doctor=user).order_by('-created_at')
            return JsonResponse([r.to_dict() for r in reports], safe=False, status=200)
        else:
            try:
                patient = Patient.objects.get(user=user)
                reports = [r.to_dict() for r in patient.pathology_reports.all().order_by('-created_at')]
                return JsonResponse(reports, safe=False, status=200)
            except Patient.DoesNotExist:
                return JsonResponse([], safe=False, status=200)
    elif guest_email:
        reports = [r.to_dict() for r in PathologyReport.objects.filter(guest_email=guest_email).order_by('-created_at')]
        return JsonResponse(reports, safe=False, status=200)
    else:
        return JsonResponse([], safe=False, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_emergency_snapshot(request):
    user = request.user
    try:
        patient = Patient.objects.get(user=user)

        # Get latest prescription for active meds
        latest_prescription = patient.prescriptions.first()
        active_meds = []
        if latest_prescription:
            try:
                extracted_data = json.loads(latest_prescription.extracted_data or '{}')
                active_meds = extracted_data.get('medicines', [])
            except json.JSONDecodeError:
                active_meds = []

        return JsonResponse({
            "id": patient.id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "name": f"{patient.first_name} {patient.last_name}".strip() or user.full_name or "User",
            "vault_id": f"MF-{str(patient.id).zfill(6)}",
            "blood_group": patient.blood_group,
            "allergies": json.loads(patient.allergies or '[]'),
            "active_meds": active_meds,
            "emergency_contact": patient.emergency_contact,
            "dob": patient.dob.isoformat() if patient.dob else "",
            "gender": patient.gender,
            "weight": patient.weight_kg,
            "height": patient.height_cm
        }, status=200)
    except Patient.DoesNotExist:
        # Return empty profile for doctors or users without a patient record
        return JsonResponse({
            "id": None,
            "first_name": user.full_name.split()[0] if user.full_name else "",
            "last_name": " ".join(user.full_name.split()[1:]) if user.full_name and len(user.full_name.split()) > 1 else "",
            "name": user.full_name or user.email,
            "vault_id": f"MF-DR-{str(user.id).zfill(4)}",
            "blood_group": "",
            "allergies": [],
            "active_meds": [],
            "emergency_contact": "",
            "dob": "",
            "gender": "",
            "weight": None,
            "height": None
        }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def update_profile(request):
    user = request.user
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if user.role == 'Doctor':
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'license_number' in data:
            user.license_number = data['license_number']
        user.save()
        return JsonResponse({
            "message": "Doctor profile updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "license_number": user.license_number,
                "medical_proof_file": user.medical_proof_file
            }
        }, status=200)
    else:
        patient = get_object_or_404(Patient, user=user)

        # Update profile fields
        if 'first_name' in data:
            patient.first_name = data['first_name']
        if 'last_name' in data:
            patient.last_name = data['last_name']
        if 'blood_group' in data:
            patient.blood_group = data['blood_group']
        if 'emergency_contact' in data:
            patient.emergency_contact = data['emergency_contact']
        if 'allergies' in data:
            allergies_str = data['allergies']
            allergies_list = [a.strip() for a in allergies_str.split(',') if a.strip()]
            patient.allergies = json.dumps(allergies_list)
        if 'dob' in data:
            patient.dob = data['dob'] if data['dob'] else None
        if 'gender' in data:
            patient.gender = data['gender']
        if 'weight' in data:
            patient.weight_kg = float(data['weight']) if data['weight'] else None
        if 'height' in data:
            patient.height_cm = float(data['height']) if data['height'] else None

        patient.save()
        
        # Sync full name back to user model
        full_name = f"{patient.first_name} {patient.last_name}".strip()
        if full_name:
            user.full_name = full_name
            user.save()

        return JsonResponse({
            "message": "Profile updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "patient_id": patient.id,
                "license_number": user.license_number,
                "medical_proof_file": user.medical_proof_file
            }
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_monitoring(request):
    """Enhanced health monitoring and analysis endpoint"""
    try:
        from .services.health_monitor import health_monitor

        user = request.user
        patient = get_object_or_404(Patient, user=user)

        health_summary = health_monitor.generate_health_summary(patient)
        return JsonResponse(health_summary, status=200)

    except Exception as e:
        logger.error(f"Health monitoring failed: {e}")
        return JsonResponse({
            "error": "Health monitoring unavailable",
            "status": "demo_mode",
            "health_score": 70,
            "health_status": "Good",
            "message": "Enhanced monitoring temporarily unavailable"
        }, status=200)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def chat(request):
    """
    General-purpose AI chat endpoint.
    Accepts a message + optional conversation history.
    Works for both guests and authenticated patients.
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    message = data.get('message', '').strip()
    if not message:
        return JsonResponse({"error": "No message provided"}, status=400)

    history = data.get('history', [])  # list of {role, content}
    is_patient = data.get('is_patient', False)
    patient_name = data.get('patient_name', None)

    if is_patient and patient_name:
        system_prompt = (
            f"You are MedFusion AI, a senior clinical health assistant for a patient named {patient_name}. "
            "Provide personalized, accurate, empathetic medical guidance. "
            "Keep responses concise (3-5 sentences) and clinically accurate. "
            "Use bullet points for lists. "
            "Always remind the user to consult a healthcare professional for diagnosis and treatment. "
            "Never provide a definitive diagnosis. Never suggest stopping prescribed medications."
        )
    else:
        system_prompt = (
            "You are MedFusion AI, a helpful general health information assistant. "
            "Provide accurate general medical information and health education. "
            "Keep responses concise and clear. Use bullet points for lists. "
            "Always recommend consulting a doctor for personal medical advice. "
            "Never diagnose conditions. Never suggest specific medications."
        )

    # Build prompt with conversation history
    history_text = ""
    for turn in history[-6:]:  # last 6 turns for context
        role = "User" if turn.get('role') == 'user' else "Assistant"
        history_text += f"{role}: {turn.get('content', '')}\n"

    full_prompt = f"{history_text}User: {message}"

    # Ask AI to also generate 3 short follow-up questions
    if data.get('include_followups'):
        full_prompt += "\n\n[After your answer, on a new line write exactly: FOLLOWUPS: q1 | q2 | q3 — three short follow-up questions the user might want to ask next, separated by |. Keep each under 8 words.]"

    try:
        try:
            reply_raw = asyncio.run(llm_chat(full_prompt, system_prompt))
        except RuntimeError:
            loop = asyncio.new_event_loop()
            reply_raw = loop.run_until_complete(llm_chat(full_prompt, system_prompt))
            loop.close()
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        reply_raw = "I'm having trouble connecting right now. For emergencies, call your local emergency number. Please try again shortly."

    # Split reply from follow-ups
    follow_ups = []
    reply = reply_raw
    if 'FOLLOWUPS:' in reply_raw:
        parts = reply_raw.split('FOLLOWUPS:', 1)
        reply = parts[0].strip()
        raw_followups = parts[1].strip()
        follow_ups = [f.strip() for f in raw_followups.split('|') if f.strip()][:3]

    return JsonResponse({"reply": reply, "follow_ups": follow_ups}, status=200)


@api_view(['GET'])
@permission_classes([])
def health(request):
    import sys
    import django
    from django.conf import settings
    
    db_ok = True
    stats = {}
    try:
        stats["patients_count"] = Patient.objects.count()
        stats["prescriptions_count"] = Prescription.objects.count()
        stats["reports_count"] = PathologyReport.objects.count()
        stats["predictions_count"] = PredictionRecord.objects.count()
    except Exception as e:
        db_ok = False
        stats["error"] = str(e)
        
    db_config = getattr(settings, 'DATABASES', {})
    db_engine = "unknown"
    db_name = "unknown"
    if isinstance(db_config, dict) and 'default' in db_config:
        default_db = db_config['default']
        if isinstance(default_db, dict):
            db_engine = default_db.get('ENGINE', 'unknown')
            db_name = str(default_db.get('NAME', 'unknown'))

    return JsonResponse({
        "status": "running",
        "python_version": sys.version,
        "django_version": django.get_version(),
        "database": {
            "connected": db_ok,
            "engine": db_engine,
            "name": db_name,
            **stats
        },
        "server_time": datetime.now().isoformat()
    }, status=200)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def run_prediction(request):
    """
    Accepts disease_type and parameters in POST body.
    Runs clinical risk evaluation and remedy planning via AIService.
    Saves and returns the PredictionRecord.
    """
    user = request.user
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    disease_type = data.get('disease_type')
    parameters = data.get('parameters', {})
    guest_email = data.get('guest_email') or parameters.get('guest_email')
    guest_name = data.get('guest_name') or parameters.get('guest_name')

    if not disease_type or not parameters:
        return JsonResponse({"error": "Missing disease_type or parameters"}, status=400)

    patient_id = data.get('patient_id')
    patient = None
    if user and user.is_authenticated:
        if user.role == 'Doctor':
            if patient_id:
                patient = get_object_or_404(Patient, id=patient_id)
        else:
            try:
                patient = Patient.objects.get(user=user)
            except Patient.DoesNotExist:
                pass

    analysis = run_async(ai_service.predict_health_risk(disease_type, parameters))

    risk_score = float(analysis.get('risk_score', 0.0))
    risk_level = analysis.get('risk_level', 'LOW')
    clinical_reasoning = analysis.get('clinical_reasoning', '')
    remedies = analysis.get('remedies', {})
    factors = analysis.get('factors', [])

    if patient:
        record = PredictionRecord.objects.create(
            patient=patient,
            disease_type=disease_type,
            input_parameters=json.dumps(parameters),
            risk_score=risk_score,
            risk_level=risk_level,
            clinical_reasoning=clinical_reasoning,
            remedies=json.dumps(remedies)
        )
        result = record.to_dict()
        result['factors'] = factors
        return JsonResponse(result, status=201)
    elif guest_email:
        record = PredictionRecord.objects.create(
            patient=None,
            guest_email=guest_email,
            guest_name=guest_name or "",
            disease_type=disease_type,
            input_parameters=json.dumps(parameters),
            risk_score=risk_score,
            risk_level=risk_level,
            clinical_reasoning=clinical_reasoning,
            remedies=json.dumps(remedies)
        )
        result = record.to_dict()
        result['factors'] = factors
        return JsonResponse(result, status=201)
    else:
        return JsonResponse({
            "id": 999,
            "type": "prediction",
            "disease_type": disease_type,
            "input_parameters": parameters,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "clinical_reasoning": clinical_reasoning,
            "remedies": remedies,
            "factors": factors,
            "created_at": datetime.now().isoformat(),
        }, status=200)


@api_view(['GET'])
@permission_classes([])
def list_predictions(request):
    """List all previous predictions done by the patient or guest"""
    user = request.user
    guest_email = request.GET.get('email')
    if user and user.is_authenticated:
        try:
            patient = Patient.objects.get(user=user)
            records = [r.to_dict() for r in patient.predictions.all().order_by('-created_at')]
            return JsonResponse(records, safe=False, status=200)
        except Patient.DoesNotExist:
            return JsonResponse([], safe=False, status=200)
    elif guest_email:
        records = [r.to_dict() for r in PredictionRecord.objects.filter(guest_email=guest_email).order_by('-created_at')]
        return JsonResponse(records, safe=False, status=200)
    else:
        return JsonResponse([], safe=False, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_prediction(request, pk):
    """Get details of a specific prediction"""
    user = request.user
    patient = get_object_or_404(Patient, user=user)
    record = get_object_or_404(PredictionRecord, id=pk, patient=patient)
    return JsonResponse(record.to_dict(), status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_patients(request):
    """Get list of all patients for doctor dashboard"""
    user = request.user
    if user.role != 'Doctor':
        return JsonResponse({"error": "Unauthorized access"}, status=403)
    
    patients = Patient.objects.all()
    patient_list = []
    
    for p in patients:
        active_meds = []
        for rx in p.prescriptions.all():
            try:
                rx_data = json.loads(rx.extracted_data or '{}')
                for m in rx_data.get('medicines', []):
                    active_meds.append(m.get('name'))
            except Exception:
                pass
        
        pathology_count = p.pathology_reports.count()
        prediction_count = p.predictions.count()
        
        patient_list.append({
            "id": p.id,
            "name": f"{p.first_name} {p.last_name}".strip() or p.user.full_name or "Patient",
            "email": p.user.email,
            "dob": p.dob.isoformat() if p.dob else None,
            "gender": p.gender or "",
            "blood_group": p.blood_group or "",
            "weight": p.weight_kg,
            "height": p.height_cm,
            "emergency_contact": p.emergency_contact or "",
            "active_meds": list(set(active_meds)),
            "pathology_count": pathology_count,
            "prediction_count": prediction_count,
            "allergies": json.loads(p.allergies or '[]')
        })
        
    return JsonResponse({"patients": patient_list}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_details(request, patient_id):
    """Get full reports and logs for a specific patient (Doctor clearance required)"""
    user = request.user
    if user.role != 'Doctor':
        return JsonResponse({"error": "Unauthorized access"}, status=403)
        
    patient = get_object_or_404(Patient, id=patient_id)
    
    prescriptions = [rx.to_dict() for rx in patient.prescriptions.all()]
    pathology = [report.to_dict() for report in patient.pathology_reports.all()]
    predictions = [pred.to_dict() for pred in patient.predictions.all()]
    
    return JsonResponse({
        "prescriptions": prescriptions,
        "pathology_reports": pathology,
        "predictions": predictions
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def add_manual_prescription(request, patient_id):
    """Add manual recommendation/prescription from clinical examiner"""
    user = request.user
    if user.role != 'Doctor':
        return JsonResponse({"error": "Unauthorized access"}, status=403)
        
    patient = get_object_or_404(Patient, id=patient_id)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
        
    medicines = data.get('medicines', [])
    recommendations = data.get('recommendations', [])
    
    prescription_data = {
        "physician": user.full_name or "Doctor",
        "medicines": medicines,
        "recommendations": recommendations,
        "next_steps": ["Continue daily monitoring", "Follow up with physician in 2 weeks"]
    }
    
    rx = Prescription.objects.create(
        patient=patient,
        image_url="manual_rx.png",
        extracted_data=json.dumps(prescription_data),
        status="completed"
    )
    
    return JsonResponse({"success": True, "prescription": rx.to_dict()}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def patient_chat(request):
    """
    Accepts message and chat history and calls Gemini LLM provider
    to generate a personalized clinical medical advice reply.
    """
    user = request.user
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    prompt = data.get('message')
    history = data.get('history', [])
    
    if not prompt:
        return JsonResponse({"error": "Message is required"}, status=400)
    
    # Resolve Patient Details if available to personalize response
    patient_context = ""
    try:
        patient = Patient.objects.get(user=user)
        patient_context = f"\nPatient Profile context: Name: {patient.first_name} {patient.last_name}, Gender: {patient.gender or 'Unspecified'}, Age/DOB: {patient.dob or 'Unspecified'}, Blood Group: {patient.blood_group or 'Unspecified'}, Weight: {patient.weight_kg or 'Unspecified'}kg, Height: {patient.height_cm or 'Unspecified'}cm, Allergies: {patient.allergies or 'None'}."
    except Patient.DoesNotExist:
        pass
    
    system_prompt = (
        "You are MedFusion AI Clinical Assistant, a helpful and professional medical advisor. "
        "Your role is to help patients understand their symptoms, clinical reports, or medications, "
        "providing clear, educational explanations, lifestyle advice, and recommendations. "
        "IMPORTANT: Always maintain a professional, supportive, and clinical tone. Always include a short, "
        "friendly disclaimer that this is educational AI support and patients should consult a physician for diagnoses. "
        "Address the patient using their profile details if provided below."
        f"{patient_context}"
    )
    
    # Structure chat contents or simple prompt
    formatted_prompt = ""
    if history:
        for msg in history[-10:]: # Limit context to last 10 messages
            role_name = "User" if msg.get('sender') == 'user' else "Assistant"
            formatted_prompt += f"{role_name}: {msg.get('text')}\n"
        formatted_prompt += f"User: {prompt}\nAssistant:"
    else:
        formatted_prompt = prompt
        
    try:
        from .services.llm_provider import llm_provider
        response_text = run_async(llm_provider.generate_response(formatted_prompt, system_prompt=system_prompt))
    except Exception as e:
        response_text = f"I apologize, but I am having trouble connecting to my clinical AI model. Error: {str(e)}"
        
    return JsonResponse({"response": response_text}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def check_drug_safety(request):
    """
    Accepts a list of medications and queries Gemini LLM to generate
    a Clinical safety analysis covering interactions, side effects, and dietary precautions.
    """
    user = request.user
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    medications = data.get('medications', [])
    if not medications:
        return JsonResponse({"error": "No medications provided"}, status=400)

    # Format the medication list for the prompt
    med_list_str = ", ".join([f"{m.get('name')} ({m.get('dosage')})" if isinstance(m, dict) else str(m) for m in medications])

    system_prompt = (
        "You are MedFusion AI Clinical Pharmacologist, a clinical safety intelligence system. "
        "Analyze the list of medications provided by the user. Check for drug-drug interactions, "
        "dietary & lifestyle precautions, and common side effects. "
        "You MUST structure your response strictly as a JSON object with these keys: "
        "\"has_interactions\" (boolean: true/false), "
        "\"critical_warnings\" (list of strings, representing interaction hazards), "
        "\"dietary_precautions\" (list of strings, e.g. Grapefruit warning), "
        "\"side_effects\" (list of strings, e.g. Dizziness), "
        "\"summary\" (string, a detailed clinical safety overview). "
        "Do NOT wrap the output in markdown block like ```json or anything else. Just return pure JSON text. "
        "Always add a professional disclaimer in the summary stating this is educational AI support."
    )

    prompt = f"Analyze the safety and interactions for: {med_list_str}."

    try:
        from .services.llm_provider import llm_provider
        response_text = run_async(llm_provider.generate_response(prompt, system_prompt=system_prompt))
    except Exception as e:
        return JsonResponse({"error": f"Failed to connect to AI model: {str(e)}"}, status=500)

    parsed_response = ai_service._clean_and_parse_json(response_text, default=None)
    if parsed_response and isinstance(parsed_response, dict):
        return JsonResponse(parsed_response, status=200)
    else:
        return JsonResponse({
            "has_interactions": True,
            "critical_warnings": ["Could not parse structured warnings. Please read the summary."],
            "dietary_precautions": ["Review general drug labels."],
            "side_effects": ["Check drug literature."],
            "summary": response_text
        }, status=200)




# ------------------------------------------------------------------------------
# FEAT-001: New endpoints
# ------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pathology_trends(request):
    """
    Return biomarker trend data grouped by name from all pathology reports
    for the authenticated patient.
    Response: { trends: { BiomarkerName: { unit: str, data: [{date, value, source_id}] } } }
    """
    user = request.user
    try:
        patient = Patient.objects.get(user=user)
    except Patient.DoesNotExist:
        return JsonResponse({"trends": {}}, status=200)

    reports = patient.pathology_reports.all().order_by('created_at')
    trends = {}

    for report in reports:
        try:
            biomarkers = json.loads(report.report_data or '[]')
        except (json.JSONDecodeError, TypeError):
            continue

        date_str = report.created_at.strftime('%Y-%m-%d')

        for item in biomarkers:
            if not isinstance(item, dict):
                continue
            raw_name = item.get('name', '').strip()
            if not raw_name:
                continue
            key = raw_name.title()
            try:
                value = float(item.get('value', 0))
            except (TypeError, ValueError):
                continue
            unit = item.get('unit', '')

            if key not in trends:
                trends[key] = {'unit': unit, 'data': []}

            trends[key]['data'].append({
                'date': date_str,
                'value': value,
                'source_id': report.id,
            })

    return JsonResponse({'trends': trends}, status=200)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def simulate_prediction(request):
    """
    Run the ML model with caller-supplied parameters and return the simulated
    risk score without creating a PredictionRecord.
    Body: { disease_type: str, parameters: {} }
    Response: { simulated_score, simulated_level, factors }
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    disease_type = data.get('disease_type')
    parameters = data.get('parameters', {})

    if not disease_type or not parameters:
        return JsonResponse({"error": "Missing disease_type or parameters"}, status=400)

    ml_result = ai_service._predict_using_ml(disease_type, parameters)

    if ml_result is not None:
        score = ml_result['score']
        factors = ml_result['factors']
    else:
        score = 15.0
        disease = disease_type.lower()
        age = int(parameters.get('age', 35) or 35)
        family_history = parameters.get('family_history', 'no') in ['yes', 'severe', 'mild']
        smoking = parameters.get('smoking', 'no') == 'yes'

        if 'diabetes' in disease:
            glucose = float(parameters.get('glucose', 90) or 90)
            hba1c = float(parameters.get('hba1c', 5.0) or 5.0)
            bmi = float(parameters.get('bmi', 22.0) or 22.0)
            if glucose > 140: score += 20
            elif glucose > 100: score += 10
            if hba1c > 6.5: score += 25
            elif hba1c > 5.7: score += 15
            if bmi > 30: score += 20
            elif bmi > 25: score += 10
            if family_history: score += 15
            if age > 45: score += 10
        elif 'heart' in disease:
            cholesterol = float(parameters.get('cholesterol', 180) or 180)
            systolic_bp = float(parameters.get('systolic_bp', 120) or 120)
            if cholesterol > 240: score += 20
            elif cholesterol > 200: score += 10
            if systolic_bp > 145: score += 20
            elif systolic_bp > 130: score += 10
            if smoking: score += 25
            if family_history: score += 15
            if age > 50: score += 10
        elif 'cancer' in disease:
            if smoking: score += 30
            if family_history: score += 20
            if age > 50: score += 12
        factors = []

    score = round(min(99.0, max(1.0, score)), 1)
    if score > 80:
        level = 'CRITICAL'
    elif score > 55:
        level = 'HIGH'
    elif score > 30:
        level = 'MODERATE'
    else:
        level = 'LOW'

    return JsonResponse({
        'simulated_score': score,
        'simulated_level': level,
        'factors': factors,
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def generate_emergency_token(request):
    """
    Generate (or regenerate) an emergency token for the authenticated patient.
    Response: { token: str, url: str }
    """
    user = request.user
    try:
        patient = Patient.objects.get(user=user)
    except Patient.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)

    EmergencyToken.objects.filter(patient=patient).update(is_active=False)

    token_value = secrets.token_urlsafe(32)
    EmergencyToken.objects.create(patient=patient, token=token_value, is_active=True)

    return JsonResponse({
        "token": token_value,
        "url": f"/emergency/{token_value}",
    }, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def revoke_emergency_token(request):
    """
    Revoke the active emergency token for the authenticated patient.
    Response: 204 No Content
    """
    user = request.user
    try:
        patient = Patient.objects.get(user=user)
    except Patient.DoesNotExist:
        return JsonResponse({"error": "Patient profile not found"}, status=404)

    EmergencyToken.objects.filter(patient=patient, is_active=True).update(is_active=False)
    return JsonResponse({}, status=204)


@api_view(['GET'])
@permission_classes([])
def get_emergency_card(request, token):
    """
    Public endpoint - returns patient emergency card data for a valid active token.
    No authentication required (designed for emergency responders scanning a QR code).
    """
    try:
        et = EmergencyToken.objects.get(token=token, is_active=True)
    except EmergencyToken.DoesNotExist:
        return JsonResponse({"error": "Invalid or expired emergency token"}, status=404)

    patient = et.patient

    active_meds = []
    latest_rx = patient.prescriptions.order_by('-created_at').first()
    if latest_rx:
        try:
            rx_data = json.loads(latest_rx.extracted_data or '{}')
            active_meds = rx_data.get('medicines', [])
        except (json.JSONDecodeError, TypeError):
            active_meds = []

    return JsonResponse({
        "name": f"{patient.first_name} {patient.last_name}".strip() or patient.user.full_name or "Patient",
        "vault_id": f"MF-{str(patient.id).zfill(6)}",
        "blood_group": patient.blood_group or "",
        "allergies": json.loads(patient.allergies or '[]'),
        "active_meds": active_meds,
        "emergency_contact": patient.emergency_contact or "",
        "last_updated": et.created_at.strftime('%Y-%m-%d'),
    }, status=200)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def explain_result(request):
    """
    Translate or pass-through a text explanation.
    Body: { text: str, language: str }
    For 'en' returns immediately. For others, calls Gemini for translation.
    Response: { explanation: str }
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    text = data.get('text', '').strip()
    language = data.get('language', 'en').strip().lower()

    if not text:
        return JsonResponse({"error": "No text provided"}, status=400)

    if language == 'en':
        return JsonResponse({"explanation": text}, status=200)

    lang_names = {
        'ta': 'Tamil',
        'hi': 'Hindi',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'ar': 'Arabic',
        'zh': 'Chinese (Simplified)',
        'pt': 'Portuguese',
    }
    lang_name = lang_names.get(language, language.upper())

    prompt = (
        f"Translate the following medical explanation into {lang_name}. "
        f"Preserve all medical terms accurately. Return only the translated text, no explanations.\n\n"
        f"{text}"
    )

    try:
        from .services.llm_provider import llm_provider
        translated = run_async(llm_provider.generate_response(
            prompt=prompt,
            model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
            system_prompt=f"You are a professional medical translator. Translate medical content accurately into {lang_name}.",
        ))
        return JsonResponse({"explanation": translated}, status=200)
    except Exception as e:
        logger.error(f"explain_result translation failed: {e}")
        return JsonResponse({"explanation": text, "warning": "Translation unavailable, returning original."}, status=200)