"""
organ_mapping_service.py — Anatomical Organ to Clinical Record Mapping Engine
MedFusion AI Clinical Informatics Pipeline

Maps supported anatomical structures (heart, lungs, liver, stomach, pancreas,
kidneys, intestines, brain) to patient EHR records, discrete lab observations,
active/historical diagnoses, prescribed medications, and traceable risk predictions.
"""

import json
from typing import Dict, Any, List, Optional
from django.utils import timezone
from medical.models import (
    Patient,
    MedicalCondition,
    ClinicalObservation,
    VitalSignRecord,
    PredictionRecord,
    Prescription,
    PathologyReport,
)
from .medical_datasets import get_dataset_metadata


ORGAN_CONFIG: Dict[str, Dict[str, Any]] = {
    "heart": {
        "id": "heart",
        "name": "Human Heart & Cardiovascular System",
        "system": "Cardiovascular",
        "icon": "Heart",
        "primary_color": "#c0192a",
        "accent_color": "#ff3040",
        "anatomical_region": "Anterior Mediastinum (Thoracic Cavity)",
        "prediction_types": ["Heart Attack", "Cardiovascular", "Heart Disease"],
        "condition_keywords": ["hypertension", "coronary", "angina", "infarction", "arrhythmia", "cardiac", "heart"],
        "observation_codes": ["CHOL_TOTAL", "CHOL_LDL", "CHOL_HDL", "TRIG", "BP_SYS", "BP_DIA", "HR", "TROPONIN", "BNP", "CRP_HS"],
        "biomarker_keywords": [
            "cholesterol", "ldl", "hdl", "triglyceride", "systolic", "diastolic",
            "blood pressure", "heart rate", "pulse", "troponin", "bnp", "crp"
        ],
        "medication_keywords": [
            "atorvastatin", "rosuvastatin", "simvastatin", "amlodipine", "losartan",
            "telmisartan", "enalapril", "metoprolol", "atenolol", "aspirin", "clopidogrel",
            "nitroglycerin", "spironolactone", "ramipril"
        ],
        "standard_reference_ranges": {
            "Total Cholesterol": {"min": 120.0, "max": 200.0, "unit": "mg/dL"},
            "LDL Cholesterol": {"min": 50.0, "max": 100.0, "unit": "mg/dL"},
            "HDL Cholesterol": {"min": 40.0, "max": 60.0, "unit": "mg/dL"},
            "Triglycerides": {"min": 50.0, "max": 150.0, "unit": "mg/dL"},
            "Systolic Blood Pressure": {"min": 90.0, "max": 120.0, "unit": "mmHg"},
            "Diastolic Blood Pressure": {"min": 60.0, "max": 80.0, "unit": "mmHg"},
            "Resting Heart Rate": {"min": 60.0, "max": 100.0, "unit": "bpm"},
        },
        "recommended_observations": [
            {"code": "CHOL_TOTAL", "name": "Total Serum Cholesterol", "unit": "mg/dL"},
            {"code": "CHOL_LDL", "name": "LDL Cholesterol", "unit": "mg/dL"},
            {"code": "BP_SYS", "name": "Systolic Blood Pressure", "unit": "mmHg"},
            {"code": "BP_DIA", "name": "Diastolic Blood Pressure", "unit": "mmHg"},
            {"code": "HR", "name": "Resting Heart Rate", "unit": "bpm"},
        ],
        "clinical_guidance": (
            "Cardiovascular health is assessed using resting hemodynamic measurements, fasting lipid panels, "
            "and validated Framingham/ACC-AHA risk factors. Isolated elevations in cholesterol or blood pressure "
            "indicate increased long-term risk and warrant lifestyle modification or clinical evaluation, but do not "
            "alone establish an acute myocardial infarction diagnosis."
        ),
    },
    "lungs": {
        "id": "lungs",
        "name": "Respiratory System (Lungs & Bronchial Tree)",
        "system": "Respiratory",
        "icon": "Wind",
        "primary_color": "#c96878",
        "accent_color": "#e88898",
        "anatomical_region": "Bilateral Pleural Cavities (Thorax)",
        "prediction_types": ["Respiratory", "COPD", "Asthma", "Pulmonary"],
        "condition_keywords": ["asthma", "copd", "bronchitis", "pneumonia", "respiratory", "emphysema", "dyspnea"],
        "observation_codes": ["SPO2", "RESP_RATE", "PEFR", "FEV1", "FVC"],
        "biomarker_keywords": ["spo2", "oxygen saturation", "respiratory rate", "peak flow", "fev1", "fvc"],
        "medication_keywords": [
            "salbutamol", "albuterol", "formoterol", "budesonide", "fluticasone",
            "ipratropium", "tiotropium", "montelukast", "theophylline"
        ],
        "standard_reference_ranges": {
            "Oxygen Saturation (SpO2)": {"min": 95.0, "max": 100.0, "unit": "%"},
            "Respiratory Rate": {"min": 12.0, "max": 20.0, "unit": "breaths/min"},
            "Peak Expiratory Flow": {"min": 400.0, "max": 650.0, "unit": "L/min"},
        },
        "recommended_observations": [
            {"code": "SPO2", "name": "Oxygen Saturation (SpO2)", "unit": "%"},
            {"code": "RESP_RATE", "name": "Respiratory Rate", "unit": "breaths/min"},
            {"code": "PEFR", "name": "Peak Expiratory Flow Rate", "unit": "L/min"},
        ],
        "clinical_guidance": (
            "Pulmonary function reflects oxygenation and alveolar gas exchange. Peripheral capillary SpO2 below 95% "
            "indicates reduced oxygenation and requires clinical correlation with exertional tolerance, respiratory rate, "
            "and ambient altitude."
        ),
    },
    "liver": {
        "id": "liver",
        "name": "Human Liver & Hepatic Parenchyma",
        "system": "Hepatic",
        "icon": "FlaskConical",
        "primary_color": "#8b4a14",
        "accent_color": "#c06828",
        "anatomical_region": "Right Upper Quadrant (Peritoneal Cavity)",
        "prediction_types": ["Hepatic", "Fatty Liver", "Liver Disease"],
        "condition_keywords": ["hepatitis", "fatty liver", "cirrhosis", "nafld", "hepatic", "steatosis", "jaundice"],
        "observation_codes": ["ALT", "AST", "BIL_TOTAL", "BIL_DIRECT", "ALP", "ALBUMIN", "GGT", "TOTAL_PROTEIN"],
        "biomarker_keywords": ["alt", "sgpt", "ast", "sgot", "bilirubin", "alkaline phosphatase", "alp", "albumin", "ggt"],
        "medication_keywords": ["ursodeoxycholic", "udca", "silymarin", "vitamin e", "lactulose"],
        "standard_reference_ranges": {
            "ALT (SGPT)": {"min": 7.0, "max": 56.0, "unit": "U/L"},
            "AST (SGOT)": {"min": 10.0, "max": 40.0, "unit": "U/L"},
            "Total Bilirubin": {"min": 0.2, "max": 1.2, "unit": "mg/dL"},
            "Alkaline Phosphatase": {"min": 44.0, "max": 147.0, "unit": "U/L"},
            "Serum Albumin": {"min": 3.5, "max": 5.5, "unit": "g/dL"},
        },
        "recommended_observations": [
            {"code": "ALT", "name": "Alanine Aminotransferase (ALT)", "unit": "U/L"},
            {"code": "AST", "name": "Aspartate Aminotransferase (AST)", "unit": "U/L"},
            {"code": "BIL_TOTAL", "name": "Total Bilirubin", "unit": "mg/dL"},
            {"code": "ALBUMIN", "name": "Serum Albumin", "unit": "g/dL"},
        ],
        "clinical_guidance": (
            "Hepatic enzyme elevation (ALT/AST) reflects hepatocellular stress or injury from medications, steatosis, "
            "or viral causes. Serum albumin and bilirubin assess synthetic and excretory reserve. Mild transaminase "
            "elevations are common in metabolic syndrome and require longitudinal observation."
        ),
    },
    "stomach": {
        "id": "stomach",
        "name": "Gastric Reservoir & Upper Gastrointestinal Tract",
        "system": "Gastric",
        "icon": "FlaskConical",
        "primary_color": "#c2642a",
        "accent_color": "#f59e0b",
        "anatomical_region": "Left Upper Quadrant (Epigastrium)",
        "prediction_types": ["Gastric", "Gastrointestinal", "GERD"],
        "condition_keywords": ["gerd", "gastritis", "ulcer", "dyspepsia", "reflux", "h. pylori", "helicobacter"],
        "observation_codes": ["GASTRIN", "PEPSINOGEN", "HP_AB", "FERRITIN", "VIT_B12", "HEMOGLOBIN"],
        "biomarker_keywords": ["gastrin", "pepsinogen", "h. pylori", "vitamin b12", "ferritin", "hemoglobin"],
        "medication_keywords": ["omeprazole", "pantoprazole", "rabeprazole", "esomeprazole", "famotidine", "sucralfate", "antacid"],
        "standard_reference_ranges": {
            "Hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
            "Serum Ferritin": {"min": 30.0, "max": 300.0, "unit": "ng/mL"},
            "Vitamin B12": {"min": 200.0, "max": 900.0, "unit": "pg/mL"},
        },
        "recommended_observations": [
            {"code": "HEMOGLOBIN", "name": "Hemoglobin (CBC)", "unit": "g/dL"},
            {"code": "FERRITIN", "name": "Serum Ferritin", "unit": "ng/mL"},
            {"code": "VIT_B12", "name": "Vitamin B12 Level", "unit": "pg/mL"},
        ],
        "clinical_guidance": (
            "Gastric mucosal evaluation focuses on acid secretion balance and mucosal integrity. Chronic gastritis "
            "can impair intrinsic factor secretion leading to Vitamin B12 and iron malabsorption."
        ),
    },
    "pancreas": {
        "id": "pancreas",
        "name": "Pancreas & Endocrine Islet Complex",
        "system": "Endocrine / Metabolic",
        "icon": "Activity",
        "primary_color": "#9d174d",
        "accent_color": "#db2777",
        "anatomical_region": "Retroperitoneal Space (Posterior to Stomach)",
        "prediction_types": ["Diabetes", "Diabetic", "Metabolic"],
        "condition_keywords": ["diabetes", "prediabetes", "insulin resistance", "pancreatitis", "metabolic syndrome", "hyperglycemia"],
        "observation_codes": ["GLUCOSE_FASTING", "HBA1C", "GLUCOSE_PP", "INSULIN_FASTING", "AMYLASE", "LIPASE"],
        "biomarker_keywords": ["glucose", "hba1c", "glycated hemoglobin", "insulin", "amylase", "lipase", "c-peptide"],
        "medication_keywords": [
            "metformin", "glimepiride", "gliclazide", "sitagliptin", "linagliptin",
            "empagliflozin", "dapagliflozin", "semaglutide", "liraglutide", "insulin"
        ],
        "standard_reference_ranges": {
            "Fasting Blood Glucose": {"min": 70.0, "max": 99.0, "unit": "mg/dL"},
            "HbA1c (Glycated Hemoglobin)": {"min": 4.0, "max": 5.6, "unit": "%"},
            "Postprandial Glucose": {"min": 70.0, "max": 140.0, "unit": "mg/dL"},
            "Serum Amylase": {"min": 30.0, "max": 110.0, "unit": "U/L"},
            "Serum Lipase": {"min": 10.0, "max": 140.0, "unit": "U/L"},
        },
        "recommended_observations": [
            {"code": "GLUCOSE_FASTING", "name": "Fasting Plasma Glucose", "unit": "mg/dL"},
            {"code": "HBA1C", "name": "Glycated Hemoglobin (HbA1c)", "unit": "%"},
            {"code": "INSULIN_FASTING", "name": "Fasting Serum Insulin", "unit": "µIU/mL"},
        ],
        "clinical_guidance": (
            "The endocrine pancreas produces insulin to regulate glucose uptake. An HbA1c between 5.7% and 6.4% "
            "designates pre-diabetes; >= 6.5% establishes diabetes according to American Diabetes Association guidelines. "
            "Isolated elevated glucose requires confirmation with a fasting plasma glucose or formal HbA1c test."
        ),
    },
    "kidneys": {
        "id": "kidneys",
        "name": "Human Kidneys & Renal Filtration System",
        "system": "Renal / Urinary",
        "icon": "Droplet",
        "primary_color": "#8f1c20",
        "accent_color": "#c83038",
        "anatomical_region": "Bilateral Retroperitoneal Flanks (T12 - L3)",
        "prediction_types": ["Renal", "Kidney Disease", "Nephrology"],
        "condition_keywords": ["ckd", "kidney", "renal", "nephropathy", "proteinuria", "creatinine", "nephrolithiasis", "stones"],
        "observation_codes": ["CREATININE", "BUN", "UREA", "EGFR", "URIC_ACID", "POTASSIUM", "SODIUM", "UACR"],
        "biomarker_keywords": ["creatinine", "bun", "urea", "egfr", "uric acid", "potassium", "sodium", "microalbumin"],
        "medication_keywords": ["losartan", "ramipril", "furosemide", "torsemide", "allopurinol", "febuxostat", "sodium bicarbonate"],
        "standard_reference_ranges": {
            "Serum Creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
            "Blood Urea Nitrogen (BUN)": {"min": 7.0, "max": 20.0, "unit": "mg/dL"},
            "Estimated GFR (eGFR)": {"min": 90.0, "max": 140.0, "unit": "mL/min/1.73m²"},
            "Serum Uric Acid": {"min": 3.5, "max": 7.2, "unit": "mg/dL"},
            "Serum Potassium": {"min": 3.5, "max": 5.0, "unit": "mmol/L"},
        },
        "recommended_observations": [
            {"code": "CREATININE", "name": "Serum Creatinine", "unit": "mg/dL"},
            {"code": "EGFR", "name": "Estimated Glomerular Filtration Rate (eGFR)", "unit": "mL/min/1.73m²"},
            {"code": "BUN", "name": "Blood Urea Nitrogen (BUN)", "unit": "mg/dL"},
            {"code": "POTASSIUM", "name": "Serum Potassium", "unit": "mmol/L"},
        ],
        "clinical_guidance": (
            "Renal filtration capacity is quantified by serum creatinine and estimated GFR (CKD-EPI formula). "
            "An eGFR persistent < 60 mL/min/1.73m² for >= 3 months or albuminuria defines chronic kidney disease. "
            "Mild creatinine shifts can occur acutely due to dehydration, strenuous exercise, or dietary protein."
        ),
    },
    "intestines": {
        "id": "intestines",
        "name": "Intestinal Tract (Enteric & Colonic System)",
        "system": "Gastrointestinal",
        "icon": "Wind",
        "primary_color": "#047857",
        "accent_color": "#10b981",
        "anatomical_region": "Umbilical & Hypogastric Abdominal Cavity",
        "prediction_types": ["Gastrointestinal", "Bowel", "Colorectal"],
        "condition_keywords": ["ibs", "colitis", "crohn", "celiac", "constipation", "diarrhea", "bowel", "diverticulitis"],
        "observation_codes": ["CALPROTECTIN", "CRP", "ESR", "ALBUMIN", "FOLATE", "MAGNESIUM"],
        "biomarker_keywords": ["calprotectin", "crp", "c-reactive protein", "esr", "albumin", "folate", "magnesium"],
        "medication_keywords": ["mesalamine", "sulfasalazine", "probiotic", "mebeverine", "dicyclomine", "loperamide", "rifaximin"],
        "standard_reference_ranges": {
            "C-Reactive Protein (CRP)": {"min": 0.0, "max": 3.0, "unit": "mg/L"},
            "Erythrocyte Sedimentation Rate": {"min": 0.0, "max": 20.0, "unit": "mm/hr"},
            "Serum Albumin": {"min": 3.5, "max": 5.5, "unit": "g/dL"},
        },
        "recommended_observations": [
            {"code": "CRP", "name": "C-Reactive Protein (CRP)", "unit": "mg/L"},
            {"code": "ESR", "name": "Erythrocyte Sedimentation Rate (ESR)", "unit": "mm/hr"},
            {"code": "CALPROTECTIN", "name": "Fecal Calprotectin", "unit": "µg/g"},
        ],
        "clinical_guidance": (
            "Intestinal mucosal inflammation is assessed via systemic acute phase reactants (CRP, ESR) and local "
            "enteric markers such as fecal calprotectin. Functional conditions like IBS present with normal inflammatory "
            "markers and normal histology."
        ),
    },
    "brain": {
        "id": "brain",
        "name": "Human Brain & Central Nervous System",
        "system": "Neurological",
        "icon": "Brain",
        "primary_color": "#a09ab0",
        "accent_color": "#c0b8cc",
        "anatomical_region": "Cranial Cavity (Neurocranium)",
        "prediction_types": ["Neurological", "Stroke", "Cerebrovascular"],
        "condition_keywords": ["stroke", "tia", "migraine", "headache", "neuropathy", "seizure", "neurological", "cognitive"],
        "observation_codes": ["BP_SYS", "BP_DIA", "GLUCOSE_FASTING", "HOMOCYSTEINE", "VIT_B12", "HEMOGLOBIN"],
        "biomarker_keywords": ["blood pressure", "glucose", "homocysteine", "vitamin b12", "hemoglobin", "sodium"],
        "medication_keywords": ["aspirin", "clopidogrel", "gabapentin", "pregabalin", "levetiracetam", "topiramate", "sumatriptan", "donepezil"],
        "standard_reference_ranges": {
            "Systolic Blood Pressure": {"min": 90.0, "max": 120.0, "unit": "mmHg"},
            "Diastolic Blood Pressure": {"min": 60.0, "max": 80.0, "unit": "mmHg"},
            "Fasting Glucose": {"min": 70.0, "max": 99.0, "unit": "mg/dL"},
            "Vitamin B12": {"min": 200.0, "max": 900.0, "unit": "pg/mL"},
        },
        "recommended_observations": [
            {"code": "BP_SYS", "name": "Systolic Blood Pressure", "unit": "mmHg"},
            {"code": "GLUCOSE_FASTING", "name": "Fasting Glucose", "unit": "mg/dL"},
            {"code": "VIT_B12", "name": "Serum Vitamin B12", "unit": "pg/mL"},
        ],
        "clinical_guidance": (
            "Neurological parenchyma relies continuously on cerebral blood flow and stable glucose supply. "
            "Strict blood pressure management is the primary modifiable protection against ischemic stroke and "
            "cerebrovascular microangiopathy. Symptoms like acute focal weakness or speech difficulty require immediate emergency triage."
        ),
    },
}


class OrganMappingService:
    """
    Core service connecting anatomical organs to patient EHR clinical data.
    """

    def get_supported_organs(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": k,
                "name": v["name"],
                "system": v["system"],
                "icon": v["icon"],
                "primary_color": v["primary_color"],
                "accent_color": v["accent_color"],
                "anatomical_region": v["anatomical_region"],
            }
            for k, v in ORGAN_CONFIG.items()
        ]

    def get_organ_health_summary(self, patient: Patient, organ_id: str) -> Optional[Dict[str, Any]]:
        """
        Assemble comprehensive clinical snapshot for a given organ and patient.
        """
        organ_key = (organ_id or "").lower().strip()
        config = ORGAN_CONFIG.get(organ_key)
        if not config:
            return None

        biomarker_keywords: List[str] = [str(k) for k in config.get("biomarker_keywords", [])]
        medication_keywords: List[str] = [str(k) for k in config.get("medication_keywords", [])]
        observation_codes: List[str] = [str(c) for c in config.get("observation_codes", [])]
        prediction_types: List[str] = [str(p) for p in config.get("prediction_types", [])]
        recommended_observations: List[Dict[str, Any]] = [
            r for r in config.get("recommended_observations", []) if isinstance(r, dict)
        ]

        # 1. Gather Conditions
        active_conditions = []
        historical_conditions = []
        unverified_conditions = []

        # From MedicalCondition model
        conditions_qs = MedicalCondition.objects.filter(patient=patient)
        for cond in conditions_qs:
            # match by organ_system or keyword
            matches_organ = (cond.organ_system == organ_key) or any(
                kw in cond.condition_name.lower() for kw in config["condition_keywords"]
            )
            if matches_organ:
                cond_dict = cond.to_dict()
                if cond.verification_status != 'confirmed':
                    unverified_conditions.append(cond_dict)
                elif cond.clinical_status == 'active':
                    active_conditions.append(cond_dict)
                else:
                    historical_conditions.append(cond_dict)

        # 2. Gather Observations (Normalized ClinicalObservations + fallback extraction from PathologyReports)
        observations = []
        seen_obs_names = set()

        # Query explicit ClinicalObservation records
        obs_qs = ClinicalObservation.objects.filter(
            patient=patient
        ).filter(
            organ_system__in=[organ_key, 'systemic']
        ).order_by('-observation_timestamp')

        for obs in obs_qs:
            name_lower = obs.name.lower()
            matches_obs = (
                obs.organ_system == organ_key
                or any(kw in name_lower for kw in biomarker_keywords)
                or obs.code in observation_codes
            )
            if matches_obs and name_lower not in seen_obs_names:
                seen_obs_names.add(name_lower)
                observations.append(obs.to_dict())

        # Also parse latest PathologyReport items if no explicit observation recorded yet
        for report in patient.pathology_reports.order_by('-created_at')[:10]:
            try:
                data = json.loads(report.report_data or "[]")
                if isinstance(data, list):
                    for item in data:
                        name = item.get("name") or ""
                        name_lower = name.lower()
                        if any(kw in name_lower for kw in biomarker_keywords):
                            if name_lower not in seen_obs_names:
                                seen_obs_names.add(name_lower)
                                # Lookup standard reference range if available
                                ref = config.get("standard_reference_ranges", {}).get(name, {})
                                val_num = None
                                try:
                                    val_num = float(item.get("value"))
                                except (TypeError, ValueError):
                                    pass

                                is_abn = False
                                flag = 'NORMAL'
                                if val_num is not None and ref:
                                    if ref.get("max") is not None and val_num > ref["max"]:
                                        is_abn = True
                                        flag = 'HIGH'
                                    elif ref.get("min") is not None and val_num < ref["min"]:
                                        is_abn = True
                                        flag = 'LOW'

                                observations.append({
                                    "id": f"pathology-{report.id}-{name_lower}",
                                    "organ_system": organ_key,
                                    "code": name_lower.upper(),
                                    "name": name,
                                    "value": val_num if val_num is not None else item.get("value"),
                                    "value_numeric": val_num,
                                    "value_text": str(item.get("value", "")),
                                    "unit": item.get("unit") or ref.get("unit", ""),
                                    "reference_range": {
                                        "min": ref.get("min"),
                                        "max": ref.get("max"),
                                        "display": f"{ref.get('min', '')} - {ref.get('max', '')} {ref.get('unit', '')}".strip() if ref else "",
                                    },
                                    "is_abnormal": is_abn,
                                    "abnormality_flag": flag,
                                    "status": "final",
                                    "observation_timestamp": report.created_at.isoformat() if report.created_at else "",
                                    "provenance": "pathology_report_extraction",
                                    "source_report_id": report.id,
                                })
            except Exception:
                pass

        # 3. Gather Recent Vitals if relevant to Heart/Lungs/Brain
        vitals_qs = VitalSignRecord.objects.filter(patient=patient).order_by('-recorded_at')[:3]
        recent_vitals = [v.to_dict() for v in vitals_qs]

        # 4. Filter Abnormal Observations
        abnormal_observations = [o for o in observations if o.get("is_abnormal")]

        # 5. Gather Prescriptions & Correlate Active Medications
        matched_medications = []
        for rx in patient.prescriptions.order_by('-created_at')[:10]:
            try:
                rx_data = json.loads(rx.extracted_data or "{}")
                medicines = rx_data.get("medicines", [])
                if isinstance(medicines, list):
                    for med in medicines:
                        med_name = (med.get("name") if isinstance(med, dict) else str(med)) or ""
                        med_lower = med_name.lower()
                        if any(kw in med_lower for kw in medication_keywords):
                            matched_medications.append({
                                "name": med_name,
                                "dosage": med.get("dosage", "") if isinstance(med, dict) else "",
                                "frequency": med.get("frequency", "") if isinstance(med, dict) else "",
                                "timing": med.get("timing", "") if isinstance(med, dict) else "",
                                "clinical_purpose": med.get("description", "") if isinstance(med, dict) else "",
                                "prescription_id": rx.id,
                                "prescribed_date": rx.created_at.isoformat() if rx.created_at else "",
                            })
            except Exception:
                pass

        # 6. Gather Model Risk Predictions
        predictions = []
        for pred_type in prediction_types:
            preds = patient.predictions.filter(
                disease_type__icontains=pred_type
            ).order_by('-created_at')[:3]
            for p in preds:
                p_dict = p.to_dict()
                # Attach dataset metadata provenance
                datasets = get_dataset_metadata(p.disease_type)
                if datasets:
                    p_dict["dataset_details"] = datasets[0]
                predictions.append(p_dict)

        # 7. Check for Missing Data Checklist
        # P6-04: Fixed reversed containment logic and added code-based matching so an
        # observation recorded under a slightly different display name (e.g. "Total
        # Cholesterol" vs recommended "Total Serum Cholesterol") is not falsely flagged
        # as missing. A recommendation is satisfied when an observation shares its
        # canonical code OR either name contains the other.
        missing_data = []
        recorded_names_lower = {o["name"].lower() for o in observations}
        recorded_codes = {o.get("code") for o in observations if o.get("code")}
        for rec in recommended_observations:
            rec_code = str(rec.get("code", ""))
            rec_name = str(rec.get("name", ""))
            rec_unit = str(rec.get("unit", ""))
            rec_name_lower = rec_name.lower()
            code_match = rec_code in recorded_codes
            name_match = any(
                rec_name_lower in recorded or recorded in rec_name_lower
                for recorded in recorded_names_lower
            )
            if code_match or name_match:
                continue
            missing_data.append({
                "code": rec_code,
                "name": rec_name,
                "unit": rec_unit,
                "recommended_action": f"Order or upload latest {rec_name} observation.",
            })

        # 8. Compute Clinical Status Label
        if active_conditions or any(o.get("abnormality_flag") in ["CRITICAL_HIGH", "CRITICAL_LOW"] for o in observations):
            clinical_status_indicator = "ALERT"
            status_description = "Active clinical condition diagnosed or critical measurement detected."
        elif abnormal_observations or any(p.get("risk_level") in ["HIGH", "CRITICAL"] for p in predictions):
            clinical_status_indicator = "ATTENTION"
            status_description = "Elevated risk assessment or biomarker observation requires clinical monitoring."
        elif len(observations) > 0:
            clinical_status_indicator = "OPTIMAL"
            status_description = "All recorded biomarkers are within standard reference intervals."
        else:
            clinical_status_indicator = "INSUFFICIENT_DATA"
            status_description = "No recent laboratory or vital observations recorded for this anatomical system."

        return {
            "organ_id": organ_key,
            "organ_name": config["name"],
            "organ_system": config["system"],
            "icon": config["icon"],
            "primary_color": config["primary_color"],
            "accent_color": config["accent_color"],
            "anatomical_region": config["anatomical_region"],
            "clinical_status": clinical_status_indicator,
            "status_description": status_description,
            "active_conditions": active_conditions,
            "historical_conditions": historical_conditions,
            "unverified_conditions": unverified_conditions,
            "observations_count": len(observations),
            "observations": observations,
            "abnormal_observations": abnormal_observations,
            "recent_vitals": recent_vitals if organ_key in ['heart', 'lungs', 'brain'] else [],
            "medications": matched_medications,
            "predictions": predictions,
            "missing_data": missing_data,
            "clinical_guidance": config["clinical_guidance"],
            "last_updated": timezone.now().isoformat(),
        }

    def get_full_twin_overview(self, patient: Patient) -> Dict[str, Any]:
        """
        Consolidated summary across all 8 organs for full-body 3D navigation.
        """
        # P6-01: Prefetch related collections once to avoid an N+1 query storm across
        # the 8-organ sweep and downstream serializations (predictions, pathology,
        # prescriptions).
        patient = Patient.objects.prefetch_related(
            'conditions', 'observations', 'prescriptions',
            'predictions', 'pathology_reports', 'vital_signs'
        ).get(pk=patient.pk)

        organs_summary = {}
        alert_count = 0
        attention_count = 0
        optimal_count = 0

        for organ_id in ORGAN_CONFIG.keys():
            summary = self.get_organ_health_summary(patient, organ_id)
            if summary:
                status = summary["clinical_status"]
                if status == "ALERT":
                    alert_count += 1
                elif status == "ATTENTION":
                    attention_count += 1
                elif status == "OPTIMAL":
                    optimal_count += 1

                organs_summary[organ_id] = {
                    "organ_id": organ_id,
                    "organ_name": summary["organ_name"],
                    "system": summary["organ_system"],
                    "clinical_status": status,
                    "active_conditions_count": len(summary["active_conditions"]),
                    "abnormal_count": len(summary["abnormal_observations"]),
                    "observations_count": summary["observations_count"],
                    "primary_color": summary["primary_color"],
                    "accent_color": summary["accent_color"],
                }

        # Profile info
        profile_data = {
            "id": patient.id,
            "full_name": f"{patient.first_name} {patient.last_name}".strip() or patient.user.full_name or "Patient",
            "blood_group": patient.blood_group or "Not recorded",
            "gender": patient.gender or "Not recorded",
            "dob": patient.dob.isoformat() if patient.dob else None,
            "weight_kg": patient.weight_kg,
            "height_cm": patient.height_cm,
            "allergies": json.loads(patient.allergies or "[]"),
        }

        # Latest predictions
        recent_predictions = [p.to_dict() for p in patient.predictions.order_by('-created_at')[:6]]

        # Overall summary
        return {
            "patient_profile": profile_data,
            "organs": organs_summary,
            "system_metrics": {
                "total_systems": len(ORGAN_CONFIG),
                "alert_count": alert_count,
                "attention_count": attention_count,
                "optimal_count": optimal_count,
            },
            "recent_predictions": recent_predictions,
            "timestamp": timezone.now().isoformat(),
        }


organ_mapping_service = OrganMappingService()
