import os
import django
import json
from datetime import datetime

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medfusion_backend.settings')
django.setup()

from medical.models import User, Patient, Prescription, PathologyReport
from django.contrib.auth import get_user_model

User = get_user_model()

def seed_data():
    print("Seeding Django Database...")
    
    # 1. Ensure Demo Doctor
    doctor, created = User.objects.get_or_create(
        email="dr.smith@medfusion.ai",
        defaults={
            "username": "dr.smith@medfusion.ai",
            "full_name": "Dr. James Smith",
            "role": "Doctor"
        }
    )
    if created:
        doctor.set_password("doctor123")
        doctor.save()
        print("Created Demo Doctor")

    # 2. Ensure User 'sailu' (sailesh25008@gmail.com)
    user, created = User.objects.get_or_create(
        email="sailesh25008@gmail.com",
        defaults={
            "username": "sailesh25008@gmail.com",
            "full_name": "SAILU",
            "role": "Patient"
        }
    )
    if created:
        user.set_password("patient123")
        user.save()
        print("Created User Sailu")

    # 3. Ensure Patient Profile
    patient, created = Patient.objects.get_or_create(
        user=user,
        defaults={
            "first_name": "Sailesh",
            "last_name": "Kumar",
            "blood_group": "O+",
            "emergency_contact": "+91 9876543210",
            "allergies": json.dumps(["Dust", "Pollen"])
        }
    )
    if created:
        print("Created Patient Profile for Sailu")

    # 4. Add Sample Prescription if none exist
    if not patient.prescriptions.exists():
        Prescription.objects.create(
            patient=patient,
            image_url="sample_rx_django.jpg",
            extracted_data=json.dumps({
                "physician": "Dr. James Smith",
                "medicines": [
                    {"name": "Voglibose", "dosage": "0.3mg"},
                    {"name": "Glimepiride", "dosage": "2mg"}
                ],
                "recommendations": ["Take before meals", "Avoid sugary drinks"]
            }),
            status="completed"
        )
        print("Added Sample Prescription")

    # 5. Add Sample Pathology if none exist
    if not patient.pathology_reports.exists():
        PathologyReport.objects.create(
            patient=patient,
            report_data=json.dumps([
                {"name": "FBS", "value": 110, "unit": "mg/dL"},
                {"name": "PPBS", "value": 160, "unit": "mg/dL"}
            ]),
            clinical_insight=json.dumps({
                "normalcy_level": "PRE-DIABETIC",
                "summary": "Glucose levels are slightly elevated above normal range.",
                "insights": ["Maintain low carb diet", "Light exercise daily"]
            })
        )
        print("Added Sample Pathology Report")

    print("Django Database seeded successfully!")

if __name__ == "__main__":
    seed_data()
