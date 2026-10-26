"""
seed_clinical_twin_data.py — Clinical Data Baseline Seeder
Populates structured, unit-verified clinical observations, conditions, and vitals
for registered patients in the local database.
"""

import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medfusion_backend.settings')
django.setup()

from django.utils import timezone
from medical.models import (
    Patient,
    MedicalCondition,
    ClinicalObservation,
    VitalSignRecord,
    PredictionRecord,
)

def seed_patient_clinical_data(patient: Patient):
    now = timezone.now()

    # 1. Medical Conditions
    if not MedicalCondition.objects.filter(patient=patient).exists():
        MedicalCondition.objects.create(
            patient=patient,
            condition_name="Hyperlipidemia (Mild Borderline)",
            icd10_code="E78.5",
            organ_system="heart",
            clinical_status="active",
            verification_status="confirmed",
            diagnosed_date=(now - timedelta(days=120)).date(),
            notes="Elevated LDL and total cholesterol on annual physical. Recommended dietary intervention.",
        )
        MedicalCondition.objects.create(
            patient=patient,
            condition_name="Seasonal Allergic Rhinitis",
            icd10_code="J30.2",
            organ_system="lungs",
            clinical_status="remission",
            verification_status="confirmed",
            diagnosed_date=(now - timedelta(days=400)).date(),
            notes="Mild spring pollen exacerbation.",
        )

    # 2. Discrete Unit-Aware Clinical Observations
    observations_to_create = [
        # Cardiovascular / Heart
        {"organ_system": "heart", "code": "CHOL_TOTAL", "name": "Total Cholesterol", "value_numeric": 218.0, "unit": "mg/dL", "ref_min": 125.0, "ref_max": 200.0, "ref_text": "< 200 mg/dL", "days_ago": 14},
        {"organ_system": "heart", "code": "CHOL_LDL", "name": "LDL Cholesterol", "value_numeric": 138.0, "unit": "mg/dL", "ref_min": 50.0, "ref_max": 100.0, "ref_text": "< 100 mg/dL", "days_ago": 14},
        {"organ_system": "heart", "code": "CHOL_HDL", "name": "HDL Cholesterol", "value_numeric": 48.0, "unit": "mg/dL", "ref_min": 40.0, "ref_max": 60.0, "ref_text": "> 40 mg/dL", "days_ago": 14},
        {"organ_system": "heart", "code": "TRIG", "name": "Triglycerides", "value_numeric": 160.0, "unit": "mg/dL", "ref_min": 50.0, "ref_max": 150.0, "ref_text": "< 150 mg/dL", "days_ago": 14},
        # Respiratory / Lungs
        {"organ_system": "lungs", "code": "SPO2", "name": "Oxygen Saturation (SpO2)", "value_numeric": 98.0, "unit": "%", "ref_min": 95.0, "ref_max": 100.0, "ref_text": "95 - 100 %", "days_ago": 7},
        {"organ_system": "lungs", "code": "RESP_RATE", "name": "Respiratory Rate", "value_numeric": 16.0, "unit": "breaths/min", "ref_min": 12.0, "ref_max": 20.0, "ref_text": "12 - 20 breaths/min", "days_ago": 7},
        {"organ_system": "lungs", "code": "PEFR", "name": "Peak Expiratory Flow Rate", "value_numeric": 490.0, "unit": "L/min", "ref_min": 400.0, "ref_max": 650.0, "ref_text": "400 - 650 L/min", "days_ago": 30},
        # Hepatic / Liver
        {"organ_system": "liver", "code": "ALT", "name": "Alanine Aminotransferase (ALT)", "value_numeric": 32.0, "unit": "U/L", "ref_min": 7.0, "ref_max": 56.0, "ref_text": "7 - 56 U/L", "days_ago": 45},
        {"organ_system": "liver", "code": "AST", "name": "Aspartate Aminotransferase (AST)", "value_numeric": 28.0, "unit": "U/L", "ref_min": 10.0, "ref_max": 40.0, "ref_text": "10 - 40 U/L", "days_ago": 45},
        {"organ_system": "liver", "code": "BIL_TOTAL", "name": "Total Bilirubin", "value_numeric": 0.8, "unit": "mg/dL", "ref_min": 0.2, "ref_max": 1.2, "ref_text": "0.2 - 1.2 mg/dL", "days_ago": 45},
        {"organ_system": "liver", "code": "ALBUMIN", "name": "Serum Albumin", "value_numeric": 4.5, "unit": "g/dL", "ref_min": 3.5, "ref_max": 5.5, "ref_text": "3.5 - 5.5 g/dL", "days_ago": 45},
        # Gastric / Stomach
        {"organ_system": "stomach", "code": "HEMOGLOBIN", "name": "Hemoglobin (CBC)", "value_numeric": 15.2, "unit": "g/dL", "ref_min": 13.5, "ref_max": 17.5, "ref_text": "13.5 - 17.5 g/dL", "days_ago": 60},
        {"organ_system": "stomach", "code": "FERRITIN", "name": "Serum Ferritin", "value_numeric": 125.0, "unit": "ng/mL", "ref_min": 30.0, "ref_max": 300.0, "ref_text": "30 - 300 ng/mL", "days_ago": 60},
        {"organ_system": "stomach", "code": "VIT_B12", "name": "Vitamin B12 Level", "value_numeric": 480.0, "unit": "pg/mL", "ref_min": 200.0, "ref_max": 900.0, "ref_text": "200 - 900 pg/mL", "days_ago": 60},
        # Metabolic / Pancreas
        {"organ_system": "pancreas", "code": "GLUCOSE_FASTING", "name": "Fasting Plasma Glucose", "value_numeric": 94.0, "unit": "mg/dL", "ref_min": 70.0, "ref_max": 99.0, "ref_text": "70 - 99 mg/dL", "days_ago": 14},
        {"organ_system": "pancreas", "code": "HBA1C", "name": "Glycated Hemoglobin (HbA1c)", "value_numeric": 5.3, "unit": "%", "ref_min": 4.0, "ref_max": 5.6, "ref_text": "< 5.7 %", "days_ago": 14},
        {"organ_system": "pancreas", "code": "AMYLASE", "name": "Serum Amylase", "value_numeric": 58.0, "unit": "U/L", "ref_min": 30.0, "ref_max": 110.0, "ref_text": "30 - 110 U/L", "days_ago": 60},
        # Renal / Kidneys
        {"organ_system": "kidneys", "code": "CREATININE", "name": "Serum Creatinine", "value_numeric": 0.95, "unit": "mg/dL", "ref_min": 0.7, "ref_max": 1.3, "ref_text": "0.7 - 1.3 mg/dL", "days_ago": 30},
        {"organ_system": "kidneys", "code": "EGFR", "name": "Estimated GFR (eGFR)", "value_numeric": 104.0, "unit": "mL/min/1.73m²", "ref_min": 90.0, "ref_max": 140.0, "ref_text": ">= 90 mL/min/1.73m²", "days_ago": 30},
        {"organ_system": "kidneys", "code": "BUN", "name": "Blood Urea Nitrogen (BUN)", "value_numeric": 13.0, "unit": "mg/dL", "ref_min": 7.0, "ref_max": 20.0, "ref_text": "7 - 20 mg/dL", "days_ago": 30},
        {"organ_system": "kidneys", "code": "URIC_ACID", "name": "Serum Uric Acid", "value_numeric": 5.4, "unit": "mg/dL", "ref_min": 3.5, "ref_max": 7.2, "ref_text": "3.5 - 7.2 mg/dL", "days_ago": 30},
        # Intestines
        {"organ_system": "intestines", "code": "CRP", "name": "C-Reactive Protein (CRP)", "value_numeric": 1.4, "unit": "mg/L", "ref_min": 0.0, "ref_max": 3.0, "ref_text": "< 3.0 mg/L", "days_ago": 45},
        # Brain / Neurological
        {"organ_system": "brain", "code": "MAP", "name": "Mean Arterial Pressure", "value_numeric": 94.0, "unit": "mmHg", "ref_min": 70.0, "ref_max": 100.0, "ref_text": "70 - 100 mmHg", "days_ago": 7},
    ]

    for o in observations_to_create:
        if not ClinicalObservation.objects.filter(patient=patient, code=o["code"]).exists():
            ClinicalObservation.objects.create(
                patient=patient,
                organ_system=o["organ_system"],
                code=o["code"],
                name=o["name"],
                value_numeric=o["value_numeric"],
                unit=o["unit"],
                reference_range_min=o["ref_min"],
                reference_range_max=o["ref_max"],
                reference_range_text=o["ref_text"],
                provenance="clinical_lab_ebr",
                observation_timestamp=now - timedelta(days=o["days_ago"]),
            )

    # 3. Vital Signs Stream
    if not VitalSignRecord.objects.filter(patient=patient).exists():
        vitals_entries = [
            {"sys": 128, "dia": 82, "hr": 72, "rr": 16, "spo2": 98.0, "temp": 36.6, "days": 1},
            {"sys": 130, "dia": 84, "hr": 76, "rr": 16, "spo2": 98.0, "temp": 36.7, "days": 7},
            {"sys": 132, "dia": 85, "hr": 74, "rr": 15, "spo2": 99.0, "temp": 36.6, "days": 14},
        ]
        for v in vitals_entries:
            VitalSignRecord.objects.create(
                patient=patient,
                systolic_bp=v["sys"],
                diastolic_bp=v["dia"],
                heart_rate=v["hr"],
                respiratory_rate=v["rr"],
                oxygen_saturation=v["spo2"],
                temperature_c=v["temp"],
                recorded_at=now - timedelta(days=v["days"]),
                source="clinical_triage",
            )

    print(f"Successfully seeded clinical twin data for: {patient}")


def main():
    patients = Patient.objects.all()
    print(f"Seeding clinical records for {len(patients)} registered patients...")
    for p in patients:
        seed_patient_clinical_data(p)
    print("Clinical baseline data seeding complete!")


if __name__ == '__main__':
    main()
