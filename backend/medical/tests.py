import json
from unittest.mock import patch
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from medical.models import (
    Patient,
    Prescription,
    PathologyReport,
    PredictionRecord,
    EmergencyToken,
    HealthActivity,
    MedicalCondition,
    ClinicalObservation,
    VitalSignRecord,
)
from medical.services.ai_service import ai_service
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class ClinicalStagingTest(TestCase):
    def setUp(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.client = Client()
        self.user = User.objects.create_user(
            email="test_patient@medfusion.ai",
            username="test_patient@medfusion.ai",
            password="patient123",
            role="Patient",
            full_name="Test Patient"
        )
        self.patient = Patient.objects.create(
            user=self.user,
            first_name="Test",
            last_name="Patient",
            dob="1990-01-01",
            gender="M"
        )
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
        self.client.force_login(self.user)

    def test_fallback_staging_logic(self):
        # Test stage calculation based on risk score by mocking _predict_using_ml
        original_predict = ai_service._predict_using_ml
        try:
            # Stage 0: risk <= 30
            ai_service._predict_using_ml = lambda dt, params: 25.0
            res_0 = ai_service._get_fallback_prediction("Heart Attack", {"age": 40}, "test error")
            self.assertEqual(res_0["remedies"]["stage"], "Stage 0 (Normal / Low Risk)")

            # Stage I: risk <= 55
            ai_service._predict_using_ml = lambda dt, params: 45.0
            res_i = ai_service._get_fallback_prediction("Heart Attack", {"age": 40}, "test error")
            self.assertEqual(res_i["remedies"]["stage"], "Stage I (Moderate Risk / Monitoring Recommended)")

            # Stage II: risk <= 80
            ai_service._predict_using_ml = lambda dt, params: 70.0
            res_ii = ai_service._get_fallback_prediction("Heart Attack", {"age": 40}, "test error")
            self.assertEqual(res_ii["remedies"]["stage"], "Stage II (High Risk / Intervention Needed)")

            # Stage III: risk > 80
            ai_service._predict_using_ml = lambda dt, params: 90.0
            res_iii = ai_service._get_fallback_prediction("Heart Attack", {"age": 40}, "test error")
            self.assertEqual(res_iii["remedies"]["stage"], "Stage III (Severe / Critical Risk)")
        finally:
            ai_service._predict_using_ml = original_predict

    def test_predict_endpoint_success(self):
        url = "/api/predictions/predict/"
        payload = {
            "disease_type": "Heart Attack",
            "parameters": {
                "age": 45,
                "gender": "M",
                "systolic_bp": 140,
                "diastolic_bp": 90,
                "cholesterol": 240,
                "max_heart_rate": 160,
                "chest_pain": "typical",
                "exercise_angina": "yes",
                "fasting_sugar": "yes",
                "symptoms": ["shortness_of_breath"]
            }
        }
        async def mock_gen(*args, **kwargs):
            return json.dumps({
                "risk_score": 68.5,
                "risk_level": "HIGH",
                "clinical_reasoning": "Elevated cholesterol and blood pressure indicate heightened cardiovascular risk.",
                "remedies": {
                    "stage": "Stage II (High Risk / Intervention Needed)",
                    "dietary_guidelines": ["Follow low sodium diet"],
                    "lifestyle_modifications": ["30 mins daily walking"],
                    "clinical_recommendations": ["Lipid panel test"],
                    "urgent_warning_signs": ["Severe chest pain"]
                }
            })

        with patch('medical.services.llm_provider.llm_provider.generate_response', side_effect=mock_gen):
            response = self.client.post(url, json.dumps(payload), content_type="application/json", **self.auth_headers)
            self.assertIn(response.status_code, [200, 201])
            data = response.json()
            self.assertIn("remedies", data)
            remedies = data["remedies"]
            self.assertIn("stage", remedies)
            self.assertTrue(remedies["stage"].startswith("Stage"))
            self.assertIn("factors", data)

    def test_predict_endpoint_fallback(self):
        url = "/api/predictions/predict/"
        payload = {
            "disease_type": "Diabetes",
            "parameters": {
                "age": 55,
                "gender": "F",
                "glucose": 180,
                "hba1c": 7.8,
                "bmi": 28.5,
                "hypertension": "yes",
                "family_history": "yes",
                "symptoms": ["excessive_thirst", "frequent_urination"]
            }
        }
        async def mock_fail(*args, **kwargs):
            return "AI system failure. All fallbacks exhausted."

        with patch('medical.services.llm_provider.llm_provider.generate_response', side_effect=mock_fail):
            response = self.client.post(url, json.dumps(payload), content_type="application/json", **self.auth_headers)
            self.assertIn(response.status_code, [200, 201])
            data = response.json()
            self.assertIn("remedies", data)
            self.assertTrue(data["remedies"]["stage"].startswith("Stage"))
            self.assertGreater(data["risk_score"], 0)

    def test_signup_and_login_flow(self):
        # 1. Test signup
        signup_payload = {
            "email": "new_user@medfusion.ai",
            "password": "securepassword123",
            "full_name": "Jane Doe",
            "role": "Patient"
        }
        res_signup = self.client.post("/api/auth/signup/", json.dumps(signup_payload), content_type="application/json")
        self.assertEqual(res_signup.status_code, 201)
        data_signup = res_signup.json()
        self.assertIn("token", data_signup)
        self.assertEqual(data_signup["user"]["email"], "new_user@medfusion.ai")

        # 2. Test login
        login_payload = {
            "email": "new_user@medfusion.ai",
            "password": "securepassword123"
        }
        res_login = self.client.post("/api/auth/login/", json.dumps(login_payload), content_type="application/json")
        self.assertEqual(res_login.status_code, 200)
        data_login = res_login.json()
        self.assertIn("token", data_login)

    def test_emergency_token_lifecycle(self):
        # 1. Generate token
        res_gen = self.client.post("/api/emergency/generate/", **self.auth_headers)
        self.assertEqual(res_gen.status_code, 201)
        token = res_gen.json().get("token")
        self.assertTrue(token)

        # 2. Public card access via token
        res_card = self.client.get(f"/api/emergency/{token}/")
        self.assertEqual(res_card.status_code, 200)
        card_data = res_card.json()
        self.assertEqual(card_data["name"], "Test Patient")

        # 3. Regenerate token (must succeed and replace previous row without unique constraint error)
        res_regen = self.client.post("/api/emergency/generate/", **self.auth_headers)
        self.assertEqual(res_regen.status_code, 201)
        token2 = res_regen.json().get("token")
        self.assertTrue(token2)
        self.assertNotEqual(token, token2)

        # 4. Revoke token
        res_revoke = self.client.delete("/api/emergency/revoke/", **self.auth_headers)
        self.assertEqual(res_revoke.status_code, 204)

        # 5. Confirm card is now 404 (inactive)
        res_card_after = self.client.get(f"/api/emergency/{token2}/")
        self.assertEqual(res_card_after.status_code, 404)

    def test_simulate_prediction(self):
        payload = {
            "disease_type": "Heart Attack",
            "parameters": {
                "age": 60,
                "gender": "M",
                "systolic_bp": 150,
                "diastolic_bp": 95,
                "cholesterol": 260
            }
        }
        response = self.client.post("/api/predictions/simulate/", json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("simulated_score", data)
        self.assertIn("simulated_level", data)

    def test_health_twin_view(self):
        response = self.client.get("/api/health-twin/", **self.auth_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("profile", data)
        self.assertIn("organs", data)
        self.assertIn("system_metrics", data)
        self.assertIn("predictions", data)
        self.assertIn("pathology_reports", data)
        self.assertIn("prescriptions", data)
        self.assertEqual(len(data["organs"]), 8)

    def test_health_twin_organ_view(self):
        # Create an observation and condition for the heart
        ClinicalObservation.objects.create(
            patient=self.patient,
            organ_system='heart',
            code='CHOL_TOTAL',
            name='Total Cholesterol',
            value_numeric=240.0,
            unit='mg/dL',
            reference_range_max=200.0,
            observation_timestamp='2026-10-15T10:00:00Z',
        )
        MedicalCondition.objects.create(
            patient=self.patient,
            condition_name='Essential Hypertension',
            icd10_code='I10',
            organ_system='heart',
            clinical_status='active',
            verification_status='confirmed',
        )

        res = self.client.get("/api/health-twin/organ/heart/", **self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["organ_id"], "heart")
        self.assertEqual(data["clinical_status"], "ALERT")  # Active condition elevates status
        self.assertGreater(len(data["active_conditions"]), 0)
        self.assertGreater(len(data["observations"]), 0)
        self.assertTrue(data["observations"][0]["is_abnormal"])
        self.assertEqual(data["observations"][0]["abnormality_flag"], "HIGH")
        self.assertIn("clinical_guidance", data)
        self.assertIn("missing_data", data)

        # Invalid organ returns 400
        res_bad = self.client.get("/api/health-twin/organ/spleen_xyz/", **self.auth_headers)
        self.assertEqual(res_bad.status_code, 400)

    def test_health_twin_authorization_isolation(self):
        # Create another patient
        other_user = User.objects.create_user(
            email="victim@medfusion.ai",
            username="victim@medfusion.ai",
            password="password123",
            role="Patient"
        )
        other_patient = Patient.objects.create(
            user=other_user,
            first_name="Victim",
            last_name="Patient"
        )

        # Attempt IDOR attack: self.user requests other_patient's data
        res = self.client.get(f"/api/health-twin/?patient_id={other_patient.id}", **self.auth_headers)
        self.assertEqual(res.status_code, 403)

    def test_health_twin_timeline_and_filters(self):
        # Create observations and predictions
        ClinicalObservation.objects.create(
            patient=self.patient,
            organ_system='kidneys',
            code='CREATININE',
            name='Serum Creatinine',
            value_numeric=1.1,
            unit='mg/dL',
            observation_timestamp='2026-10-14T08:30:00Z',
        )
        PredictionRecord.objects.create(
            patient=self.patient,
            disease_type='Heart Attack',
            risk_score=45.0,
            risk_level='MODERATE',
            clinical_reasoning='Borderline blood pressure.',
        )

        # Full timeline
        res_all = self.client.get("/api/health-twin/timeline/", **self.auth_headers)
        self.assertEqual(res_all.status_code, 200)
        data_all = res_all.json()
        self.assertGreaterEqual(data_all["count"], 2)

        # Organ filtered timeline
        res_kidneys = self.client.get("/api/health-twin/timeline/?organ=kidneys", **self.auth_headers)
        self.assertEqual(res_kidneys.status_code, 200)
        data_kidneys = res_kidneys.json()
        self.assertTrue(all(e.get("organ_system") in ['kidneys', 'systemic'] for e in data_kidneys["events"]))

    def test_health_twin_models_and_manifest(self):
        # Public ML Models metadata endpoint
        res_models = self.client.get("/api/health-twin/models/")
        self.assertEqual(res_models.status_code, 200)
        data_models = res_models.json()
        self.assertGreaterEqual(data_models["models_count"], 3)
        self.assertIn("clinical_disclaimer", data_models)

        # 3D Asset Manifest endpoint
        res_manifest = self.client.get("/api/health-twin/manifest/")
        self.assertEqual(res_manifest.status_code, 200)
        data_manifest = res_manifest.json()
        self.assertIn("organs", data_manifest)
        self.assertIn("heart", data_manifest["organs"])

    def test_health_twin_create_observation(self):
        payload = {
            "name": "Fasting Plasma Glucose",
            "organ_system": "pancreas",
            "code": "GLUCOSE_FASTING",
            "value_numeric": 145.0,
            "unit": "mg/dL",
            "reference_range_min": 70.0,
            "reference_range_max": 99.0,
            "reference_range_text": "70 - 99 mg/dL",
            "provenance": "clinical_lab_portal"
        }
        res = self.client.post("/api/health-twin/observations/", json.dumps(payload), content_type="application/json", **self.auth_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()["observation"]
        self.assertEqual(data["name"], "Fasting Plasma Glucose")
        self.assertEqual(data["value_numeric"], 145.0)
        self.assertTrue(data["is_abnormal"])
        self.assertEqual(data["abnormality_flag"], "HIGH")


class TestHealthTwinEndpoints(TestCase):
    """
    FEAT-001: Coverage for the Health Twin clinical endpoints — authorization,
    data isolation (IDOR), the fixed missing-data checklist, the doctor patient_id
    requirement, and the unified timeline response schema.
    """

    def setUp(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.client = Client()
        self.user = User.objects.create_user(
            email="ht_patient@medfusion.ai",
            username="ht_patient@medfusion.ai",
            password="patient123",
            role="Patient",
            full_name="HT Patient",
        )
        self.patient = Patient.objects.create(
            user=self.user,
            first_name="HT",
            last_name="Patient",
            dob="1988-05-20",
            gender="M",
        )
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}
        self.client.force_login(self.user)

    def test_health_twin_unauthenticated(self):
        # A request with no credentials must be rejected (401), not return data.
        res = Client().get("/api/health-twin/")
        self.assertEqual(res.status_code, 401)

    def test_health_twin_empty_patient(self):
        res = self.client.get("/api/health-twin/", **self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data["organs"]), 8)
        # With no clinical data recorded, every organ reports INSUFFICIENT_DATA.
        for organ_id, summary in data["organs"].items():
            self.assertEqual(
                summary["clinical_status"], "INSUFFICIENT_DATA",
                f"{organ_id} should be INSUFFICIENT_DATA when no data is recorded",
            )

    def test_health_twin_with_observation(self):
        # A recorded observation must surface in the organ response and must NOT be
        # re-listed under missing_data (P6-04 fixed checklist logic).
        ClinicalObservation.objects.create(
            patient=self.patient,
            organ_system="heart",
            code="CHOL_TOTAL",
            name="Total Cholesterol",
            value_numeric=185.0,
            unit="mg/dL",
            reference_range_min=120.0,
            reference_range_max=200.0,
            observation_timestamp="2026-10-15T10:00:00Z",
        )
        res = self.client.get("/api/health-twin/organ/heart/", **self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(len(data["observations"]), 0)
        self.assertEqual(data["observations"][0]["code"], "CHOL_TOTAL")
        missing_codes = [m["code"] for m in data["missing_data"]]
        self.assertNotIn("CHOL_TOTAL", missing_codes)

    def test_health_twin_idor_protection(self):
        # Patient A's token must not read patient B's data via the patient_id param.
        other_user = User.objects.create_user(
            email="ht_victim@medfusion.ai",
            username="ht_victim@medfusion.ai",
            password="password123",
            role="Patient",
            full_name="HT Victim",
        )
        other_patient = Patient.objects.create(
            user=other_user, first_name="Victim", last_name="Patient"
        )
        # Attach a private observation to the victim so any leakage would be detectable.
        ClinicalObservation.objects.create(
            patient=other_patient,
            organ_system="heart",
            code="CHOL_TOTAL",
            name="Total Cholesterol",
            value_numeric=999.0,
            unit="mg/dL",
            observation_timestamp="2026-10-15T10:00:00Z",
        )
        res = self.client.get(
            f"/api/health-twin/?patient_id={other_patient.id}", **self.auth_headers
        )
        self.assertEqual(res.status_code, 403)

    def test_health_twin_doctor_without_patient_id(self):
        # A clinician calling the overview without an explicit patient_id must get a
        # 400 (P6-06), not a silently-selected arbitrary patient.
        doctor = User.objects.create_user(
            email="ht_doctor@medfusion.ai",
            username="ht_doctor@medfusion.ai",
            password="doctor123",
            role="Doctor",
            full_name="Dr House",
        )
        # Assign a patient to this doctor so the old .first() fallback would have
        # returned 200; the fix must still return 400.
        doc_patient_user = User.objects.create_user(
            email="ht_docpatient@medfusion.ai",
            username="ht_docpatient@medfusion.ai",
            password="patient123",
            role="Patient",
            full_name="Doc Patient",
        )
        Patient.objects.create(
            user=doc_patient_user, first_name="Doc", last_name="Patient", doctor=doctor
        )
        refresh = RefreshToken.for_user(doctor)
        doctor_token = str(refresh.access_token)
        res = Client().get(
            "/api/health-twin/", HTTP_AUTHORIZATION=f"Bearer {doctor_token}"
        )
        self.assertEqual(res.status_code, 400)

    def test_timeline_returns_correct_schema(self):
        # Every timeline event must expose the fields HealthTimeline.jsx renders.
        ClinicalObservation.objects.create(
            patient=self.patient,
            organ_system="kidneys",
            code="CREATININE",
            name="Serum Creatinine",
            value_numeric=1.1,
            unit="mg/dL",
            observation_timestamp="2026-10-14T08:30:00Z",
        )
        PredictionRecord.objects.create(
            patient=self.patient,
            disease_type="Heart Attack",
            risk_score=45.0,
            risk_level="MODERATE",
            clinical_reasoning="Borderline blood pressure.",
        )
        res = self.client.get("/api/health-twin/timeline/", **self.auth_headers)
        self.assertEqual(res.status_code, 200)
        events = res.json()["events"]
        self.assertGreater(len(events), 0)
        required = {
            "id", "event_type", "timestamp", "title", "summary",
            "organ_system", "clinical_reasoning", "notes",
            "model_version", "dataset_provenance",
        }
        for ev in events:
            missing = required - set(ev.keys())
            self.assertFalse(
                missing,
                f"Timeline event {ev.get('id')} missing fields: {missing}",
            )

    def test_garden_status_and_activity(self):
        # 1. Check initial garden status
        res_status = self.client.get("/api/garden/status/", **self.auth_headers)
        self.assertEqual(res_status.status_code, 200)
        data = res_status.json()
        self.assertIn("total_points", data)
        self.assertIn("current_streak", data)
        self.assertIn("best_streak", data)
        self.assertIn("stage", data)
        self.assertIn("today_activities", data)

        # 2. Log medication_taken (+10)
        payload = {"activity_type": "medication_taken", "note": "Morning Aspirin"}
        res_act = self.client.post("/api/garden/activity/", json.dumps(payload), content_type="application/json", **self.auth_headers)
        self.assertEqual(res_act.status_code, 200)
        data_act = res_act.json()
        self.assertEqual(data_act["points_awarded"], 10)
        self.assertGreaterEqual(data_act["total_points"], 10)
        self.assertGreaterEqual(data_act["current_streak"], 1)
        self.assertEqual(data_act["today_activity_count"], 1)

        # 3. Log meal_completed (+5)
        payload2 = {"activity_type": "meal_completed", "note": "Balanced lunch"}
        res_act2 = self.client.post("/api/garden/activity/", json.dumps(payload2), content_type="application/json", **self.auth_headers)
        self.assertEqual(res_act2.status_code, 200)
        self.assertEqual(res_act2.json()["points_awarded"], 5)
        self.assertEqual(res_act2.json()["today_activity_count"], 2)


