import io
import json
from unittest.mock import patch
from PIL import Image, ImageDraw, ImageFilter
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model

from medical.models import Patient
from medical.services.document_validator import document_validator, ValidationResult
from medical.services.llm_provider import AIQuotaExceededError, AIServiceUnavailableError

User = get_user_model()


def make_sharp_prescription_image() -> bytes:
    img = Image.new('RGB', (600, 800), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), 'DR. JOHN SMITH, MD - CARDIOLOGY', fill=(0, 0, 100))
    draw.text((30, 60), 'Clinic Address: 100 Health Blvd, NY', fill=(50, 50, 50))
    draw.text((30, 90), 'Date: 01-Nov-2026 | Patient: Jane Doe (Age: 42)', fill=(0, 0, 0))
    draw.text((30, 140), 'Rx', fill=(0, 0, 150))
    draw.text((30, 180), '1. Tab. Atorvastatin 20mg - 1 tablet daily at bedtime x 30 days', fill=(0, 0, 0))
    draw.text((30, 220), '2. Tab. Metoprolol 25mg - 1 tablet twice daily after food', fill=(0, 0, 0))
    draw.text((30, 260), '3. Tab. Aspirin 75mg - 1 tablet once daily with food', fill=(0, 0, 0))
    draw.text((30, 320), 'Advise: Low sodium diet, check BP weekly.', fill=(0, 0, 0))
    draw.text((30, 380), 'Doctor Signature: Dr. J. Smith (Reg #12345)', fill=(0, 0, 100))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


def make_sharp_lab_report_image() -> bytes:
    img = Image.new('RGB', (600, 800), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), 'METROPOLIS DIAGNOSTIC CLINICAL LABORATORY', fill=(0, 50, 100))
    draw.text((30, 60), 'Patient: Jane Doe | Age: 42 | Gender: Female | Date: 01-Nov-2026', fill=(0, 0, 0))
    draw.text((30, 100), 'COMPREHENSIVE METABOLIC PANEL & LIPID PROFILE', fill=(0, 0, 0))
    draw.text((30, 140), 'TEST NAME               RESULT    UNIT       REFERENCE RANGE', fill=(0, 0, 0))
    draw.text((30, 170), 'Fasting Blood Glucose   98        mg/dL      70 - 100', fill=(0, 0, 0))
    draw.text((30, 200), 'Total Cholesterol       185       mg/dL      < 200', fill=(0, 0, 0))
    draw.text((30, 230), 'Triglycerides           140       mg/dL      < 150', fill=(0, 0, 0))
    draw.text((30, 260), 'HDL Cholesterol         52        mg/dL      > 40', fill=(0, 0, 0))
    draw.text((30, 290), 'LDL Cholesterol         105       mg/dL      < 100', fill=(0, 0, 0))
    draw.text((30, 320), 'Hemoglobin              13.5      g/dL       12.0 - 16.0', fill=(0, 0, 0))
    draw.text((30, 380), 'Verified by Pathologist: Dr. R. Adams, MD Path', fill=(0, 50, 100))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


def make_aadhaar_card_image() -> bytes:
    img = Image.new('RGB', (600, 380), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), 'GOVERNMENT OF INDIA - UNIQUE IDENTIFICATION AUTHORITY', fill=(150, 0, 0))
    draw.text((30, 70), 'AADHAAR - MERA AADHAAR MERI PEHCHAN', fill=(0, 0, 0))
    draw.text((30, 120), 'Name: Rahul Verma', fill=(0, 0, 0))
    draw.text((30, 150), 'DOB: 12/04/1988 | Male', fill=(0, 0, 0))
    draw.text((30, 190), 'Aadhaar No: 5432 1098 7654', fill=(0, 0, 0))
    draw.text((30, 230), 'Address: 12 Ring Road, Bengaluru, Karnataka', fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


def make_random_photo_image() -> bytes:
    img = Image.new('RGB', (500, 500), color=(30, 120, 200))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 450, 450], fill=(200, 150, 50))
    draw.text((100, 200), 'VACATION BEACH PHOTO 2026', fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


def make_resume_image() -> bytes:
    img = Image.new('RGB', (600, 800), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), 'JOHN DOE - SENIOR SOFTWARE ENGINEER', fill=(0, 0, 100))
    draw.text((30, 60), 'Email: john.doe@techcorp.com | GitHub: github.com/johndoe', fill=(50, 50, 50))
    draw.text((30, 100), 'PROFESSIONAL SUMMARY', fill=(0, 0, 0))
    draw.text((30, 130), 'Experienced backend developer with 8+ years building distributed Python systems.', fill=(0, 0, 0))
    draw.text((30, 170), 'TECHNICAL SKILLS: Python, Django, React, AWS, Docker, Kubernetes', fill=(0, 0, 0))
    draw.text((30, 210), 'EDUCATION: B.S. in Computer Science, Stanford University', fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


def make_blurry_image() -> bytes:
    raw = make_sharp_prescription_image()
    img = Image.open(io.BytesIO(raw))
    blurry = img.filter(ImageFilter.GaussianBlur(radius=10))
    buf = io.BytesIO()
    blurry.save(buf, format='JPEG')
    return buf.getvalue()


class DocumentValidationWorkflowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            email="patient_valid@medfusion.ai",
            username="patient_valid@medfusion.ai",
            password="securePassword123",
            role="Patient",
            full_name="Valid Test Patient"
        )
        self.patient = Patient.objects.create(
            user=self.user,
            first_name="Valid",
            last_name="Patient",
            dob="1995-05-15",
            gender="F"
        )
        self.client.force_login(self.user)

    # ── Test 1: Valid medical prescription ──────────────────────────────
    def test_01_valid_medical_prescription(self):
        img_bytes = make_sharp_prescription_image()
        upload = SimpleUploadedFile("rx_sample.jpg", img_bytes, content_type="image/jpeg")
        
        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            # 1st call: classifier -> valid prescription
            # 2nd call: ai_service.analyze_prescription -> structured medicines
            mock_llm.side_effect = [
                json.dumps({
                    "is_valid": True,
                    "document_type": "prescription",
                    "detected_category": "Medical Prescription",
                    "confidence": 0.98,
                    "reason": "Legitimate prescription with medications, dosage, and doctor header.",
                    "issues": []
                }),
                json.dumps({
                    "medicines": [
                        {
                            "name": "Atorvastatin",
                            "dosage": "20mg",
                            "frequency": "Once daily",
                            "frequency_number": 1,
                            "timing": "After food",
                            "times_of_day": ["night"],
                            "type": "Statin",
                            "description": "Lipid lowering"
                        }
                    ],
                    "recommendations": ["Follow low sodium diet"],
                    "urgency": "Low",
                    "physician": "Dr. John Smith",
                    "clinical_intent": "Cardiovascular risk reduction"
                })
            ]

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertIn("extracted_data", data)
            extracted = data["extracted_data"] if isinstance(data["extracted_data"], dict) else json.loads(data["extracted_data"])
            self.assertEqual(len(extracted["medicines"]), 1)
            self.assertEqual(extracted["medicines"][0]["name"], "Atorvastatin")

    # ── Test 2: Valid laboratory report ─────────────────────────────────
    def test_02_valid_laboratory_report(self):
        img_bytes = make_sharp_lab_report_image()
        upload = SimpleUploadedFile("lab_sample.jpg", img_bytes, content_type="image/jpeg")

        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.side_effect = [
                json.dumps({
                    "is_valid": True,
                    "document_type": "laboratory_report",
                    "detected_category": "Laboratory Reports",
                    "confidence": 0.97,
                    "reason": "Authentic clinical diagnostic lab report with quantitative biomarkers.",
                    "issues": []
                }),
                # Biomarker extraction
                json.dumps([
                    {"name": "Glucose", "value": 98, "unit": "mg/dL"},
                    {"name": "Cholesterol", "value": 185, "unit": "mg/dL"}
                ]),
                # Pathology analysis
                json.dumps({
                    "risk_index": 12,
                    "normalcy_index": 88,
                    "normalcy_level": "OPTIMAL",
                    "insights": ["Fasting blood glucose optimal", "Lipid panel normal"],
                    "summary": "Metabolic panel within normal limits"
                })
            ]

            response = self.client.post(
                "/api/pathology/analyze/",
                {"file": upload, "document_type": "laboratory_report"}
            )
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertIn("report_data", data)
            biomarkers = data["report_data"] if isinstance(data["report_data"], list) else json.loads(data["report_data"])
            self.assertEqual(len(biomarkers), 2)
            self.assertEqual(biomarkers[0]["name"], "Glucose")

    # ── Test 3: Aadhaar card uploaded as prescription ──────────────────
    def test_03_aadhaar_card_uploaded_as_prescription(self):
        img_bytes = make_aadhaar_card_image()
        upload = SimpleUploadedFile("aadhaar_card.jpg", img_bytes, content_type="image/jpeg")

        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.return_value = json.dumps({
                "is_valid": False,
                "document_type": "identity_document",
                "detected_category": "Identity Card",
                "confidence": 0.99,
                "reason": "The uploaded image is an Aadhaar identity card, not a medical prescription.",
                "issues": ["Document category mismatch", "Non-medical document"]
            })

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 400)
            data = response.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error_code"], "DOCUMENT_TYPE_MISMATCH")
            self.assertIn("The uploaded file does not appear to be a valid medical prescription", data["message"])
            self.assertEqual(data["document_type"], "identity_document")

    # ── Test 4: Random photograph uploaded as prescription ──────────────
    def test_04_random_photograph_uploaded_as_prescription(self):
        img_bytes = make_random_photo_image()
        upload = SimpleUploadedFile("vacation.jpg", img_bytes, content_type="image/jpeg")

        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.return_value = json.dumps({
                "is_valid": False,
                "document_type": "non_medical_photo",
                "detected_category": "Random Photograph",
                "confidence": 0.96,
                "reason": "Uploaded image is a personal beach photograph.",
                "issues": ["Document category mismatch", "Non-medical photo"]
            })

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 400)
            data = response.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error_code"], "DOCUMENT_TYPE_MISMATCH")

    # ── Test 5: Resume uploaded as a medical document ───────────────────
    def test_05_resume_uploaded_as_medical_document(self):
        img_bytes = make_resume_image()
        upload = SimpleUploadedFile("resume.jpg", img_bytes, content_type="image/jpeg")

        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.return_value = json.dumps({
                "is_valid": False,
                "document_type": "resume",
                "detected_category": "Curriculum Vitae",
                "confidence": 0.99,
                "reason": "Uploaded document is a professional curriculum vitae / resume.",
                "issues": ["Document category mismatch", "Non-medical document"]
            })

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 400)
            data = response.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error_code"], "DOCUMENT_TYPE_MISMATCH")

    # ── Test 6: Blurry prescription ────────────────────────────────────
    def test_06_blurry_prescription(self):
        img_bytes = make_blurry_image()
        upload = SimpleUploadedFile("blurry_rx.jpg", img_bytes, content_type="image/jpeg")

        # Blur check happens locally before any AI call
        response = self.client.post(
            "/api/prescriptions/upload/",
            {"file": upload, "document_type": "prescription"}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error_code"], "IMAGE_TOO_BLURRY")
        self.assertEqual(data["message"], "Image is too blurry to process.")

    # ── Test 7: Corrupted image ────────────────────────────────────────
    def test_07_corrupted_image(self):
        corrupted_bytes = b"CORRUPTED_RAW_RANDOM_BYTES_NOT_AN_IMAGE_778899"
        upload = SimpleUploadedFile("corrupted.jpg", corrupted_bytes, content_type="image/jpeg")

        response = self.client.post(
            "/api/prescriptions/upload/",
            {"file": upload, "document_type": "prescription"}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error_code"], "IMAGE_CORRUPTED")
        self.assertEqual(data["message"], "Unable to read this image. Upload it again.")

    # ── Test 8: Empty file ─────────────────────────────────────────────
    def test_08_empty_file(self):
        upload = SimpleUploadedFile("empty.jpg", b"", content_type="image/jpeg")

        response = self.client.post(
            "/api/prescriptions/upload/",
            {"file": upload, "document_type": "prescription"}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error_code"], "EMPTY_FILE")
        self.assertEqual(data["message"], "The uploaded file is empty.")

    # ── Test 9: Unsupported file format ────────────────────────────────
    def test_09_unsupported_file_format(self):
        exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00DOS_EXECUTABLE_SAMPLE"
        upload = SimpleUploadedFile("malware.exe", exe_bytes, content_type="application/octet-stream")

        response = self.client.post(
            "/api/prescriptions/upload/",
            {"file": upload, "document_type": "prescription"}
        )
        self.assertEqual(response.status_code, 415)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error_code"], "UNSUPPORTED_FORMAT")
        self.assertEqual(data["message"], "Unsupported file format.")

    # ── Test 10: Gemini API failure handling ────────────────────────────
    def test_10_gemini_api_failure_handled(self):
        img_bytes = make_sharp_prescription_image()
        upload = SimpleUploadedFile("rx_test.jpg", img_bytes, content_type="image/jpeg")

        # Simulate Gemini failure that triggers fallback
        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.side_effect = AIServiceUnavailableError("Google Gemini API connection timeout")

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 503)
            data = response.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error_code"], "AI_VALIDATION_FAILED")
            self.assertEqual(data["message"], "Unable to validate the document. Please retry.")

    # ── Test 11: OpenAI quota exhaustion ───────────────────────────────
    def test_11_openai_quota_exhaustion_handled(self):
        img_bytes = make_sharp_prescription_image()
        upload = SimpleUploadedFile("rx_test.jpg", img_bytes, content_type="image/jpeg")

        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.side_effect = AIQuotaExceededError("OpenAI 429: You have no credits remaining.")

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 503)
            data = response.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error_code"], "AI_VALIDATION_FAILED")
            self.assertEqual(data["message"], "Unable to validate the document. Please retry.")

    # ── Test 12: Both AI providers unavailable ─────────────────────────
    def test_12_both_ai_providers_unavailable(self):
        img_bytes = make_sharp_prescription_image()
        upload = SimpleUploadedFile("rx_test.jpg", img_bytes, content_type="image/jpeg")

        with patch("medical.services.llm_provider.llm_provider.generate_response") as mock_llm:
            mock_llm.side_effect = AIServiceUnavailableError("All AI model fallbacks exhausted. Providers unreachable.")

            response = self.client.post(
                "/api/prescriptions/upload/",
                {"file": upload, "document_type": "prescription"}
            )
            self.assertEqual(response.status_code, 503)
            data = response.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error_code"], "AI_VALIDATION_FAILED")
            self.assertEqual(data["message"], "Unable to validate the document. Please retry.")
