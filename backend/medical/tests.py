import json
from django.test import TestCase, Client
from medical.models import User, Patient
from medical.services.ai_service import ai_service
from django.contrib.auth import get_user_model

User = get_user_model()

class ClinicalStagingTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            email="test_patient@medfusion.ai",
            username="test_patient@medfusion.ai",
            password="patient123",
            role="Patient"
        )
        self.patient = Patient.objects.create(
            user=self.user,
            first_name="Test",
            last_name="Patient",
            dob="1990-01-01",
            gender="M"
        )
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
        response = self.client.post(url, json.dumps(payload), content_type="application/json")
        self.assertIn(response.status_code, [200, 201])
        data = response.json()
        self.assertIn("remedies", data)
        remedies = data["remedies"]
        self.assertIn("stage", remedies)
        self.assertTrue(remedies["stage"].startswith("Stage"))
