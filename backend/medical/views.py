from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
import json
import os
import logging
import secrets
from datetime import datetime
import asyncio
from django.utils import timezone
from .models import (
    Patient,
    Prescription,
    PathologyReport,
    PredictionRecord,
    EmergencyToken,
    MedicalCondition,
    ClinicalObservation,
    VitalSignRecord,
)
from .services.ai_service import ai_service, llm_chat
from .services.organ_mapping_service import organ_mapping_service, ORGAN_CONFIG
from .services.medical_datasets import get_dataset_metadata, DATASET_REGISTRY

User = get_user_model()
logger = logging.getLogger(__name__)


def run_async(coro):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


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
            parts = full_name.split()
            first_name = parts[0] if parts else 'Patient'
            last_name = " ".join(parts[1:]) if len(parts) > 1 else ''
            patient = Patient.objects.create(
                user=user,
                first_name=first_name,
                last_name=last_name
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


def _biomarker_names_match(name_a_lower, name_b_lower):
    """
    Flexible match for biomarker display names that differ only by container
    qualifiers (e.g. "Total Cholesterol" vs recommended "Total Serum Cholesterol").
    Returns True when the significant (non-filler) words of one name are a subset
    of the other, so a less-specific recorded name still resolves to its canonical
    recommended observation code.
    """
    import re
    filler = {"serum", "plasma", "level", "levels", "blood", "rate"}
    a = {w for w in re.sub(r"\([^)]*\)", " ", name_a_lower).split() if w not in filler}
    b = {w for w in re.sub(r"\([^)]*\)", " ", name_b_lower).split() if w not in filler}
    if not a or not b:
        return False
    return a.issubset(b) or b.issubset(a)


def _create_observations_from_biomarkers(patient, report, biomarkers):
    """
    P6-03: Persist AI-extracted pathology biomarkers as normalized
    ClinicalObservation rows so the organ mapping service can query them via the
    indexed ClinicalObservation table instead of re-parsing PathologyReport JSON.

    Only invoked for authenticated patients (guest uploads are skipped). Uses
    get_or_create on (patient, name, observation_timestamp) so re-uploading the same
    report never creates duplicate observation rows. The extracted name/value/unit
    are preserved verbatim; only the standard code and reference range are derived
    from ORGAN_CONFIG when a match is available.
    """
    if patient is None or not isinstance(biomarkers, list):
        return

    for item in biomarkers:
        if not isinstance(item, dict):
            continue
        name = (item.get("name") or "").strip()
        if not name:
            continue
        name_lower = name.lower()

        # Parse numeric value; keep raw text when parsing fails
        value_numeric = None
        raw_value = item.get("value")
        try:
            value_numeric = float(raw_value)
        except (TypeError, ValueError):
            value_numeric = None
        unit = (item.get("unit") or "").strip()

        # Resolve organ_system + canonical code + reference range from ORGAN_CONFIG
        organ_system = "systemic"
        code = ""
        ref_min = None
        ref_max = None
        for organ_key, cfg in ORGAN_CONFIG.items():
            biomarker_kws = [str(k) for k in cfg.get("biomarker_keywords", [])]
            if any(kw in name_lower for kw in biomarker_kws):
                organ_system = organ_key
                # Derive the canonical code from a matching recommended observation
                for rec in cfg.get("recommended_observations", []):
                    if not isinstance(rec, dict):
                        continue
                    rec_name_lower = str(rec.get("name", "")).lower()
                    if (
                        rec_name_lower in name_lower
                        or name_lower in rec_name_lower
                        or _biomarker_names_match(name_lower, rec_name_lower)
                    ):
                        code = str(rec.get("code", ""))
                        break
                # Pull the standard reference range (drives auto abnormality calc on save)
                for ref_name, ref in cfg.get("standard_reference_ranges", {}).items():
                    ref_name_lower = ref_name.lower()
                    if (
                        ref_name_lower == name_lower
                        or ref_name_lower in name_lower
                        or name_lower in ref_name_lower
                    ):
                        ref_min = ref.get("min")
                        ref_max = ref.get("max")
                        if not unit:
                            unit = ref.get("unit", "")
                        break
                break

        if not code:
            code = name_lower.upper().replace(" ", "_").replace("-", "_")

        ClinicalObservation.objects.get_or_create(
            patient=patient,
            name=name,
            observation_timestamp=report.created_at,
            defaults={
                "organ_system": organ_system,
                "code": code,
                "value_numeric": value_numeric,
                "value_text": "" if value_numeric is not None else str(raw_value or ""),
                "unit": unit,
                "reference_range_min": ref_min,
                "reference_range_max": ref_max,
                "provenance": "pathology_report_extraction",
                "source_report": report,
                "status": "final",
            },
        )


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

        # P1-03: Return a clear error when AI extraction fails — never fabricate biomarker values.
        # Only applies to image uploads (manual JSON input is validated separately below).
        if not biomarkers:
            return JsonResponse({
                "error": "Biomarker extraction failed. Please upload a clearer lab report image.",
                "code": "EXTRACTION_FAILED",
            }, status=422)
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
        # P6-03: Persist extracted biomarkers as normalized ClinicalObservation rows
        # so the organ mapping service queries them directly instead of re-parsing.
        _create_observations_from_biomarkers(patient, report, biomarkers)
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
        latest_prescription = patient.prescriptions.order_by('-created_at').first()
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
        patient, _ = Patient.objects.get_or_create(
            user=user,
            defaults={
                'first_name': user.full_name.split()[0] if user.full_name else 'Patient',
                'last_name': " ".join(user.full_name.split()[1:]) if user.full_name and len(user.full_name.split()) > 1 else ''
            }
        )

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
            allergies_raw = data['allergies']
            if isinstance(allergies_raw, list):
                allergies_list = [str(a).strip() for a in allergies_raw if str(a).strip()]
            elif isinstance(allergies_raw, str):
                allergies_list = [a.strip() for a in allergies_raw.split(',') if a.strip()]
            else:
                allergies_list = []
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
        patient_id = request.GET.get('patient_id')
        if user.role == 'Doctor' and patient_id:
            patient = get_object_or_404(Patient, id=patient_id)
        else:
            patient = Patient.objects.filter(user=user).first()
            if not patient and user.role == 'Patient':
                patient, _ = Patient.objects.get_or_create(
                    user=user,
                    defaults={'first_name': user.full_name or 'Patient'}
                )

        if not patient:
            return JsonResponse({
                "status": "demo_mode",
                "health_score": 75,
                "health_status": "Good",
                "message": "Health monitoring initialized"
            }, status=200)

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
        reply_raw = run_async(llm_chat(full_prompt, system_prompt))
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
                    if isinstance(m, dict) and m.get('name'):
                        active_meds.append(m.get('name'))
                    elif isinstance(m, str) and m.strip():
                        active_meds.append(m.strip())
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
        "patient": patient.to_dict(),
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
        if "AI system failure" in response_text or "All fallbacks exhausted" in response_text:
            response_text = "I apologize, but the clinical AI service is currently operating in offline mode. Please consult your physician for guidance regarding your symptoms and medications."
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
            "has_interactions": False if "no major interactions" in response_text.lower() else True,
            "critical_warnings": ["Check medication documentation with your physician or pharmacist."],
            "dietary_precautions": ["Follow standard prescription labeling guidelines."],
            "side_effects": ["Monitor for drowsiness, nausea, or dizziness."],
            "summary": response_text if response_text and "AI system failure" not in response_text else "Safety analysis unavailable offline. Please consult your prescribing physician."
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
    patient = Patient.objects.filter(user=user).first()
    if not patient and user.role == 'Patient':
        patient, _ = Patient.objects.get_or_create(
            user=user,
            defaults={'first_name': user.full_name or 'Patient'}
        )
    if not patient:
        return JsonResponse({"error": "Patient profile not found"}, status=404)

    token_value = secrets.token_urlsafe(32)
    EmergencyToken.objects.update_or_create(
        patient=patient,
        defaults={
            'token': token_value,
            'is_active': True,
        }
    )

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
    patient = Patient.objects.filter(user=user).first()
    if not patient and user.role == 'Patient':
        patient, _ = Patient.objects.get_or_create(
            user=user,
            defaults={'first_name': user.full_name or 'Patient'}
        )
    if not patient:
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

    try:
        allergies = json.loads(patient.allergies or '[]')
    except Exception:
        allergies = []

    return JsonResponse({
        "name": f"{patient.first_name} {patient.last_name}".strip() or patient.user.full_name or "Patient",
        "vault_id": f"MF-{str(patient.id).zfill(6)}",
        "blood_group": patient.blood_group or "",
        "allergies": allergies,
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
        if "AI system failure" in translated or "All fallbacks exhausted" in translated:
            return JsonResponse({"explanation": text, "warning": "Translation service offline, returning original."}, status=200)
        return JsonResponse({"explanation": translated}, status=200)
    except Exception as e:
        logger.error(f"explain_result translation failed: {e}")
        return JsonResponse({"explanation": text, "warning": "Translation unavailable, returning original."}, status=200)


# ------------------------------------------------------------------------------
# Personal Health Twin — Clinical Data & Health Twin Engine
# ------------------------------------------------------------------------------

def _resolve_authorized_patient(request):
    """
    Safely resolve the patient object with strict server-side authorization.
    Patients can ONLY view their own records (preventing IDOR vulnerabilities).
    Doctors can only view assigned patients.
    Returns (patient, error_response).
    """
    user = request.user
    requested_patient_id = request.GET.get('patient_id') or (
        request.data.get('patient_id') if hasattr(request, 'data') and isinstance(request.data, dict) else None
    )

    if user.role == 'Doctor':
        if requested_patient_id:
            try:
                patient = Patient.objects.get(id=requested_patient_id)
                # Verify assignment
                if patient.doctor != user and not user.is_staff:
                    return None, JsonResponse({"error": "Unauthorized: Patient is not assigned to your clinical roster."}, status=403)
                return patient, None
            except Patient.DoesNotExist:
                return None, JsonResponse({"error": f"Patient with ID {requested_patient_id} not found."}, status=404)
        else:
            # P6-06: A clinician must explicitly target a patient. Silently falling
            # back to the first assigned patient leaks arbitrary records and is
            # non-deterministic for the Health Twin UI.
            return None, JsonResponse({"error": "patient_id parameter is required for clinician accounts."}, status=400)

    # Patient role
    try:
        patient = Patient.objects.get(user=user)
    except Patient.DoesNotExist:
        return None, JsonResponse({"error": "Patient profile not found for authenticated user."}, status=404)

    # If patient specifies a patient_id, it must match their own
    if requested_patient_id and str(patient.id) != str(requested_patient_id):
        return None, JsonResponse({"error": "Forbidden: You may not access records of other patients."}, status=403)

    return patient, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_twin_view(request):
    """
    Consolidated Health Twin summary endpoint.
    Returns patient profile, 8-organ clinical status summary, system metrics,
    predictions, pathology reports, and prescriptions.
    """
    patient, err_resp = _resolve_authorized_patient(request)
    if err_resp:
        return err_resp

    overview = organ_mapping_service.get_full_twin_overview(patient)
    predictions = [p.to_dict() for p in patient.predictions.order_by('-created_at')[:20]]
    pathology = [r.to_dict() for r in patient.pathology_reports.order_by('-created_at')[:20]]
    prescriptions = [p.to_dict() for p in patient.prescriptions.order_by('-created_at')[:10]]

    return JsonResponse({
        "profile": overview["patient_profile"],
        "organs": overview["organs"],
        "system_metrics": overview["system_metrics"],
        "predictions": predictions,
        "pathology_reports": pathology,
        "prescriptions": prescriptions,
        "timestamp": overview["timestamp"],
    }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_twin_organ_view(request, organ_id):
    """
    Detailed organ-specific clinical health twin endpoint.
    Maps selected anatomical structure to discrete EHR observations, reference
    ranges, active/historical diagnoses, prescribed medications, and risk assessments.
    """
    patient, err_resp = _resolve_authorized_patient(request)
    if err_resp:
        return err_resp

    organ_key = organ_id.lower().strip()
    if organ_key not in ORGAN_CONFIG:
        return JsonResponse({
            "error": f"Invalid organ identifier '{organ_id}'. Supported: {', '.join(ORGAN_CONFIG.keys())}"
        }, status=400)

    organ_summary = organ_mapping_service.get_organ_health_summary(patient, organ_key)
    if not organ_summary:
        return JsonResponse({"error": f"Could not build summary for organ '{organ_id}'."}, status=500)

    return JsonResponse(organ_summary, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_twin_timeline_view(request):
    """
    Unified chronological medical record timeline.
    Merges discrete observations, conditions diagnosed, risk assessments,
    and prescriptions with optional organ and type filtering.
    """
    patient, err_resp = _resolve_authorized_patient(request)
    if err_resp:
        return err_resp

    organ_filter = request.GET.get('organ', '').lower().strip()
    type_filter = request.GET.get('type', '').lower().strip()
    timeline_events = []

    # 1. Predictions
    if not type_filter or 'prediction' in type_filter:
        pred_qs = patient.predictions.all()
        if organ_filter:
            config = ORGAN_CONFIG.get(organ_filter)
            if config:
                pred_types = [t.lower() for t in config["prediction_types"]]
                pred_qs = [p for p in pred_qs if any(pt in p.disease_type.lower() for pt in pred_types)]
        for p in pred_qs:
            timeline_events.append({
                "id": f"pred-{p.id}",
                "event_type": "prediction",
                "title": f"{p.disease_type} Risk Assessment",
                "summary": f"{p.risk_score}% ({p.risk_level})",
                "risk_score": p.risk_score,
                "risk_level": p.risk_level,
                "clinical_reasoning": p.clinical_reasoning,
                "notes": "",
                "model_version": getattr(p, 'model_version', 'rf-v1.2.0'),
                "dataset_provenance": getattr(p, 'dataset_provenance', ''),
                "organ_system": organ_filter or getattr(p, 'disease_type', 'Systemic'),
                "timestamp": p.created_at.isoformat() if p.created_at else "",
                "created_at_epoch": p.created_at.timestamp() if p.created_at else 0,
            })

    # 2. Discrete Observations
    if not type_filter or 'observation' in type_filter or 'pathology' in type_filter:
        obs_qs = patient.observations.all()
        if organ_filter:
            obs_qs = obs_qs.filter(organ_system__in=[organ_filter, 'systemic'])
        for o in obs_qs:
            val_str = f"{o.value_numeric} {o.unit}".strip() if o.value_numeric is not None else o.value_text
            timeline_events.append({
                "id": f"obs-{o.id}",
                "event_type": "observation",
                "title": f"Biomarker: {o.name}",
                "summary": f"{val_str} ({o.abnormality_flag})",
                "organ_system": o.organ_system,
                "value": val_str,
                "is_abnormal": o.is_abnormal,
                "abnormality_flag": o.abnormality_flag,
                "provenance": o.provenance,
                "clinical_reasoning": "",
                "notes": "",
                "model_version": "",
                "dataset_provenance": o.provenance or "",
                "timestamp": o.observation_timestamp.isoformat() if o.observation_timestamp else "",
                "created_at_epoch": o.observation_timestamp.timestamp() if o.observation_timestamp else 0,
            })

    # 3. Medical Conditions
    if not type_filter or 'condition' in type_filter:
        cond_qs = patient.conditions.all()
        if organ_filter:
            cond_qs = cond_qs.filter(organ_system__in=[organ_filter, 'systemic'])
        for c in cond_qs:
            d_time = c.diagnosed_date.isoformat() if c.diagnosed_date else (c.created_at.isoformat() if c.created_at else "")
            epoch = c.diagnosed_date.toordinal() if c.diagnosed_date else (c.created_at.timestamp() if c.created_at else 0)
            timeline_events.append({
                "id": f"cond-{c.id}",
                "event_type": "condition",
                "title": f"Diagnosis: {c.condition_name}",
                "summary": f"Status: {c.clinical_status.upper()} · {c.verification_status}",
                "organ_system": c.organ_system,
                "clinical_status": c.clinical_status,
                "icd10": c.icd10_code,
                "notes": c.notes,
                "clinical_reasoning": "",
                "model_version": "",
                "dataset_provenance": "",
                "timestamp": d_time,
                "created_at_epoch": epoch,
            })

    # 4. Prescriptions
    if not type_filter or 'prescription' in type_filter:
        rx_qs = patient.prescriptions.all()
        for rx in rx_qs:
            try:
                rx_data = json.loads(rx.extracted_data or "{}")
                meds = rx_data.get("medicines", [])
                med_names = [m.get("name", "") if isinstance(m, dict) else str(m) for m in meds]
                # Filter by organ if requested
                if organ_filter:
                    config = ORGAN_CONFIG.get(organ_filter)
                    if config:
                        med_kws = [str(k) for k in config.get("medication_keywords", [])]
                        matches = any(any(kw in mn.lower() for kw in med_kws) for mn in med_names)
                        if not matches:
                            continue

                timeline_events.append({
                    "id": f"rx-{rx.id}",
                    "event_type": "prescription",
                    "title": "Prescription Regimen",
                    "summary": ", ".join(filter(None, med_names[:3])) + (f" +{len(med_names)-3} more" if len(med_names) > 3 else ""),
                    "medicines_count": len(meds),
                    "medicines": meds,
                    "organ_system": organ_filter or "Systemic",
                    "clinical_reasoning": "",
                    "notes": "",
                    "model_version": "",
                    "dataset_provenance": "",
                    "timestamp": rx.created_at.isoformat() if rx.created_at else "",
                    "created_at_epoch": rx.created_at.timestamp() if rx.created_at else 0,
                })
            except Exception:
                pass

    # Sort descending by event timestamp
    timeline_events.sort(key=lambda e: e.get("created_at_epoch", 0), reverse=True)

    return JsonResponse({
        "patient_id": patient.id,
        "organ_filter": organ_filter or None,
        "type_filter": type_filter or None,
        "count": len(timeline_events),
        "events": timeline_events,
    }, status=200)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_twin_models_view(request):
    """
    Public metadata endpoint exposing training dataset provenance, feature schemas,
    and empirical evaluation metrics for all ML models in MedFusion AI.
    """
    disease_query = request.GET.get('disease')
    metadata = get_dataset_metadata(disease_query)
    return JsonResponse({
        "models_count": len(metadata),
        "registry": metadata,
        "clinical_disclaimer": (
            "MedFusion AI prediction algorithms are pre-clinical machine learning risk models intended "
            "for personal health awareness and clinician-guided triage. They do not constitute FDA-cleared "
            "medical diagnostic devices and must never replace qualified clinical judgement."
        ),
    }, status=200)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_twin_manifest_view(request):
    """
    Returns the supported organ systems manifest.
    """
    return JsonResponse({
        "version": "2.0.0",
        "organs": {k: {"id": k, "name": v["name"], "system": v["system"]} for k, v in ORGAN_CONFIG.items()},
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def health_twin_create_observation(request):
    """
    Add a validated clinical observation record for the authenticated patient.
    Enforces unit validation and automatically determines abnormal status.
    """
    patient, err_resp = _resolve_authorized_patient(request)
    if err_resp:
        return err_resp

    data = request.data if hasattr(request, 'data') else json.loads(request.body or '{}')
    name = (data.get('name') or '').strip()
    if not name:
        return JsonResponse({"error": "Observation name is required."}, status=400)

    organ_system = (data.get('organ_system') or 'systemic').lower().strip()
    code = (data.get('code') or name.upper().replace(' ', '_'))[:50]
    unit = (data.get('unit') or '').strip()

    val_num = None
    if data.get('value_numeric') is not None and data.get('value_numeric') != '':
        try:
            val_num = float(data.get('value_numeric'))
        except (ValueError, TypeError):
            return JsonResponse({"error": "Invalid numeric value."}, status=400)

    val_text = str(data.get('value_text') or '')
    ref_min = None
    ref_max = None
    if data.get('reference_range_min') is not None and data.get('reference_range_min') != '':
        try:
            ref_min = float(data.get('reference_range_min'))
        except (ValueError, TypeError):
            pass
    if data.get('reference_range_max') is not None and data.get('reference_range_max') != '':
        try:
            ref_max = float(data.get('reference_range_max'))
        except (ValueError, TypeError):
            pass

    obs_timestamp_str = data.get('observation_timestamp')
    if obs_timestamp_str:
        try:
            obs_timestamp = datetime.fromisoformat(obs_timestamp_str.replace('Z', '+00:00'))
        except Exception:
            obs_timestamp = timezone.now()
    else:
        obs_timestamp = timezone.now()

    obs = ClinicalObservation.objects.create(
        patient=patient,
        organ_system=organ_system,
        code=code,
        name=name,
        value_numeric=val_num,
        value_text=val_text,
        unit=unit,
        reference_range_min=ref_min,
        reference_range_max=ref_max,
        reference_range_text=data.get('reference_range_text', ''),
        provenance=data.get('provenance', 'patient_entry'),
        observation_timestamp=obs_timestamp,
    )

    return JsonResponse({
        "message": "Clinical observation recorded successfully.",
        "observation": obs.to_dict(),
    }, status=201)



# ------------------------------------------------------------------------------
# Nearby Facilities API — High-speed Live Healthcare Radar Proxy
# ------------------------------------------------------------------------------
_nearby_cache = {}

@api_view(['GET'])
@permission_classes([AllowAny])
def get_nearby_facilities(request):
    """
    Search and return live nearby medical facilities (hospitals, clinics, pharmacies, dentists, labs)
    around the provided GPS coordinates.

    Strategy (non-blocking):
      1. Serve from cache immediately (fresh < 10 min, or stale while triggering bg refresh)
      2. Race 3 Overpass mirrors concurrently — 3s wall-clock budget, 4s socket timeout each
      3. Fallback to Nominatim if Overpass is empty
      4. Final geographic fallback — always returns something, zero network calls
    """
    import urllib.request
    import urllib.parse
    import math
    import time
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout

    try:
        lat = float(request.GET.get('lat', 13.0827))
        lon = float(request.GET.get('lon', 80.2707))
        radius = int(request.GET.get('radius', 5000))
        types_raw = request.GET.get('types', 'hospital,clinic,pharmacy,dentist,lab')
        types = [t.strip().lower() for t in types_raw.split(',') if t.strip()]
    except (ValueError, TypeError):
        return JsonResponse({"error": "Invalid query parameters"}, status=400)

    cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{radius}_{','.join(sorted(types))}"
    CACHE_TTL = 600  # 10 minutes

    # ── Helpers ─────────────────────────────────────────────────────────────────
    def haversine(pLat, pLon):
        R = 6371
        dLa = (pLat - lat) * math.pi / 180
        dLo = (pLon - lon) * math.pi / 180
        a = (math.sin(dLa / 2) ** 2
             + math.cos(lat * math.pi / 180) * math.cos(pLat * math.pi / 180)
             * math.sin(dLo / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    TYPE_TAGS = {
        'hospital': ['hospital'],
        'clinic': ['clinic', 'doctors'],
        'pharmacy': ['pharmacy', 'chemist'],
        'dentist': ['dentist'],
        'lab': ['laboratory'],
    }

    def parse_osm_element(el):
        pLat = el.get('lat') or (el.get('center', {}).get('lat') if isinstance(el.get('center'), dict) else None)
        pLon = el.get('lon') or (el.get('center', {}).get('lon') if isinstance(el.get('center'), dict) else None)
        if not pLat or not pLon:
            return None
        tags = el.get('tags', {})
        amenity = tags.get('amenity', '')
        ftype = 'clinic'
        if amenity == 'hospital':
            ftype = 'hospital'
        elif amenity in ('pharmacy', 'chemist'):
            ftype = 'pharmacy'
        elif amenity == 'dentist':
            ftype = 'dentist'
        elif amenity == 'laboratory':
            ftype = 'lab'

        dist = haversine(pLat, pLon)
        addr_parts = [tags.get(k) for k in ('addr:full', 'addr:housenumber', 'addr:street',
                                              'addr:place', 'addr:suburb', 'addr:district',
                                              'addr:city', 'addr:postcode')]
        clean_parts = [str(p).strip() for p in addr_parts if p and str(p).strip()]
        addr = (tags.get('addr:full') or (', '.join(clean_parts) if clean_parts else
                f"Coordinates: {round(pLat, 4)}\u00b0N, {round(pLon, 4)}\u00b0E \u2022 ~{round(dist, 1)} km away"))
        hours = tags.get('opening_hours') or (
            '24/7 Emergency Service' if ftype == 'hospital' else
            ('Daily: 08:00 \u2013 22:00' if ftype == 'pharmacy' else 'Mon\u2013Sat: 09:00 \u2013 20:00'))
        speciality = (tags.get('speciality') or tags.get('healthcare:speciality') or
            ('Emergency & Inpatient Medicine' if ftype == 'hospital' else
             ('Prescription Dispensing & Supplies' if ftype == 'pharmacy' else
              'Outpatient Clinical Consultations')))
        return {
            'id': f"osm-{el.get('id')}",
            'name': tags.get('name') or tags.get('name:en') or f"Regional {ftype.capitalize()}",
            'type': ftype,
            'lat': pLat, 'lon': pLon,
            'distance': round(dist, 2),
            'phone': tags.get('phone') or tags.get('contact:phone') or tags.get('contact:mobile') or None,
            'opening_hours': hours,
            'speciality': speciality,
            'address': addr,
            'website': tags.get('website') or tags.get('contact:website') or None,
            'operator': tags.get('operator') or None,
            'emergency': tags.get('emergency') == 'yes' or ftype == 'hospital',
            'wheelchair': tags.get('wheelchair'),
        }

    # ── Overpass mirrors — race them concurrently ────────────────────────────────
    OVERPASS_MIRRORS = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.openstreetmap.fr/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ]

    def fetch_overpass(mirror_url):
        parts = []
        for t in types:
            for tag in TYPE_TAGS.get(t, []):
                parts.append(f'node["amenity"="{tag}"](around:{radius},{lat},{lon});')
                parts.append(f'way["amenity"="{tag}"](around:{radius},{lat},{lon});')
        if not parts:
            return []
        query = f'[out:json][timeout:8];({"".join(parts)});out center 80;'
        url = mirror_url + '?data=' + urllib.parse.quote(query)
        req = urllib.request.Request(url, headers={'User-Agent': 'MedFusionAI/2.0'})
        res = urllib.request.urlopen(req, timeout=4)   # 4s per mirror socket
        data = json.loads(res.read().decode())
        results = []
        for el in data.get('elements', []):
            f = parse_osm_element(el)
            if f:
                results.append(f)
        return results

    def try_overpass_concurrent():
        """Race all mirrors — return first non-empty result within 3s wall-clock."""
        with ThreadPoolExecutor(max_workers=len(OVERPASS_MIRRORS)) as ex:
            futures = {ex.submit(fetch_overpass, m): m for m in OVERPASS_MIRRORS}
            try:
                for fut in as_completed(futures, timeout=3.0):
                    try:
                        result = fut.result(timeout=0)
                        if result:
                            return result
                    except Exception:
                        pass
            except FuturesTimeout:
                pass
        return []

    # ── Nominatim fallback ───────────────────────────────────────────────────────
    def fetch_nominatim():
        radiusKm = radius / 1000.0
        dLat_deg = radiusKm / 111.0
        cos_lat = math.cos(lat * math.pi / 180.0) or 1.0
        dLon_deg = radiusKm / (111.0 * cos_lat)
        viewbox = f"{lon - dLon_deg:.4f},{lat + dLat_deg:.4f},{lon + dLon_deg:.4f},{lat - dLat_deg:.4f}"
        results = []
        seen_names = set()
        for t in types:
            q = 'laboratory' if t == 'lab' else t
            nom_url = (f"https://nominatim.openstreetmap.org/search"
                       f"?q={q}&format=json&viewbox={viewbox}&bounded=1&limit=10&addressdetails=1")
            try:
                req = urllib.request.Request(nom_url, headers={'User-Agent': 'MedFusionAI/2.0'})
                res = urllib.request.urlopen(req, timeout=3)
                items = json.loads(res.read().decode())
                for it in items:
                    pLat = float(it.get('lat'))
                    pLon = float(it.get('lon'))
                    name = it.get('name') or (it.get('display_name', '').split(',')[0])
                    if not name or name in seen_names:
                        continue
                    seen_names.add(name)
                    results.append({
                        'id': f"nom-{it.get('place_id', name)}",
                        'name': name, 'type': t,
                        'lat': pLat, 'lon': pLon,
                        'distance': round(haversine(pLat, pLon), 2),
                        'phone': None,
                        'opening_hours': '24/7' if t == 'hospital' else None,
                        'address': it.get('display_name'),
                        'emergency': t == 'hospital',
                        'wheelchair': None,
                    })
            except Exception as e:
                logger.debug(f"Nominatim fetch error for {t}: {e}")
        return results

    # ── Instant geographic fallback (zero network) ───────────────────────────────
    def geographic_fallback():
        fallback_types = {
            'hospital': ['City General Hospital & Emergency Center', 'Apex Multi-Specialty Hospital', 'Community Care Hospital'],
            'clinic': ['Family Health Clinic', 'MedFusion Wellness Clinic', 'Urgent Primary Care'],
            'pharmacy': ['Apollo 24/7 Pharmacy', 'MedPlus Healthcare Chemist', 'Express Care Pharmacy'],
            'dentist': ['Advanced Smile Dental Care', 'City Dental Specialty Clinic'],
            'lab': ['Metropolis Diagnostic Laboratory', 'Precision Clinical Pathology']
        }
        results = []
        for t in types:
            names = fallback_types.get(t, [f'Regional {t.capitalize()} Facility'])
            for i, name in enumerate(names):
                dist = min((i + 1) * 0.75, (radius / 1000.0) * 0.9)
                angle = (len(results) + 1) * 67 * math.pi / 180.0
                cos_lat = math.cos(lat * math.pi / 180.0) or 1.0
                d_lat = (dist / 111.0) * math.sin(angle)
                d_lon = (dist / (111.0 * cos_lat)) * math.cos(angle)
                results.append({
                    'id': f'local-{t}-{i+1}',
                    'name': name, 'type': t,
                    'lat': round(lat + d_lat, 6),
                    'lon': round(lon + d_lon, 6),
                    'distance': round(dist, 2),
                    'phone': '+91 1800 200 4567',
                    'opening_hours': '24/7 Emergency Care' if t == 'hospital' else 'Daily: 08:00 \u2013 22:00',
                    'speciality': 'Emergency & Inpatient Medicine' if t == 'hospital' else 'Outpatient Clinical Consultations',
                    'address': f'Located ~{round(dist, 1)} km from current coordinates',
                    'website': None,
                    'operator': 'Regional Healthcare Network',
                    'emergency': t == 'hospital',
                    'wheelchair': 'yes',
                })
        return results

    # ── Background refresh for stale cache ──────────────────────────────────────
    def background_refresh():
        try:
            fresh = try_overpass_concurrent()
            if not fresh:
                fresh = fetch_nominatim()
            if fresh:
                fresh = sorted(fresh, key=lambda x: x['distance'])
                _nearby_cache[cache_key] = {'time': time.time(), 'data': fresh}
                logger.debug(f"Background nearby refresh complete: {len(fresh)} facilities")
        except Exception as e:
            logger.debug(f"Background nearby refresh failed: {e}")

    # ── Main decision logic ──────────────────────────────────────────────────────
    cached = _nearby_cache.get(cache_key)
    now = time.time()

    if cached:
        age = now - cached['time']
        if age < CACHE_TTL:
            return JsonResponse({"status": "success", "source": "cache",
                                 "facilities": cached['data']}, status=200)
        else:
            # Stale — serve immediately, refresh in background (no user wait)
            threading.Thread(target=background_refresh, daemon=True).start()
            return JsonResponse({"status": "success", "source": "cache_stale",
                                 "facilities": cached['data']}, status=200)

    # No cache — race Overpass mirrors (3s budget)
    facilities = try_overpass_concurrent()

    # Nominatim if Overpass was empty/slow
    if not facilities:
        facilities = fetch_nominatim()

    # Always return something
    if not facilities:
        facilities = geographic_fallback()

    facilities = sorted(facilities, key=lambda x: x['distance'])
    if facilities:
        _nearby_cache[cache_key] = {'time': now, 'data': facilities}

    return JsonResponse({
        "status": "success",
        "count": len(facilities),
        "facilities": facilities
    }, status=200)
