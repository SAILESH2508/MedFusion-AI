from django.db import models
from django.contrib.auth.models import AbstractUser
import json

class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=50, default='Patient', choices=[
        ('Patient', 'Patient'),
        ('Doctor', 'Doctor'),
    ])
    license_number = models.CharField(max_length=100, blank=True)
    medical_proof_file = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']
    
    def __str__(self):
        return f"{self.email} ({self.role})"

class Patient(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    allergies = models.TextField(default='[]')  # Stored as JSON string
    emergency_contact = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"
    
    class Meta:
        verbose_name = "Patient"
        verbose_name_plural = "Patients"

    def to_dict(self):
        try:
            allergies = json.loads(self.allergies or '[]')
        except Exception:
            allergies = []
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "dob": self.dob.isoformat() if self.dob is not None else None,
            "gender": self.gender,
            "blood_group": self.blood_group,
            "weight": self.weight_kg,
            "height": self.height_cm,
            "allergies": allergies,
            "emergency_contact": self.emergency_contact
        }

class Prescription(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, null=True, blank=True, related_name='prescriptions')
    guest_email = models.EmailField(blank=True, null=True)
    guest_name = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.CharField(max_length=255, blank=True)
    extracted_data = models.TextField(blank=True)  # JSON string
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='completed')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Prescription for {self.patient or self.guest_email} - {self.status}"

    def to_dict(self):
        try:
            extracted = json.loads(self.extracted_data or "{}")
        except Exception:
            extracted = {}
        return {
            "id": self.id,
            "type": "prescription",
            "label": "Prescription Analysis",
            "image_url": self.image_url,
            "extracted_data": extracted,
            "status": self.status,
            "guest_email": self.guest_email,
            "guest_name": self.guest_name,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }


class PathologyReport(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, null=True, blank=True, related_name="pathology_reports"
    )
    guest_email = models.EmailField(blank=True, null=True)
    guest_name = models.CharField(max_length=255, blank=True, null=True)
    report_data = models.TextField(blank=True)  # JSON string (Input biomarkers)
    clinical_insight = models.TextField(blank=True)  # JSON string (AI Result)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pathology Report for {self.patient or self.guest_email} - {self.created_at.strftime('%Y-%m-%d')}"

    def to_dict(self):
        try:
            report_data = json.loads(self.report_data or "[]")
        except Exception:
            report_data = []
        try:
            clinical_insight = json.loads(self.clinical_insight or "{}")
        except Exception:
            clinical_insight = {}
        return {
            "id": self.id,
            "type": "pathology",
            "label": "Pathology Analysis",
            "report_data": report_data,
            "analysis": clinical_insight,
            "guest_email": self.guest_email,
            "guest_name": self.guest_name,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }


class EmergencyToken(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='emergency_token')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"EmergencyToken for {self.patient} ({'active' if self.is_active else 'revoked'})"


class PredictionRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, null=True, blank=True, related_name='predictions')
    guest_email = models.EmailField(blank=True, null=True)
    guest_name = models.CharField(max_length=255, blank=True, null=True)
    disease_type = models.CharField(max_length=50)  # 'Heart Attack', 'Cancer', 'Diabetes'
    input_parameters = models.TextField(blank=True)  # JSON string of inputs
    risk_score = models.FloatField(default=0.0)  # Percentage (0-100)
    risk_level = models.CharField(max_length=50, default='LOW')  # 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
    clinical_reasoning = models.TextField(blank=True)
    remedies = models.TextField(blank=True)  # JSON string of remedies
    model_version = models.CharField(max_length=50, default='rf-v1.2.0')
    dataset_provenance = models.CharField(max_length=200, default='UCI Machine Learning Repository / Clinical Trial Benchmark')
    is_experimental = models.BooleanField(default=True)
    validation_status = models.CharField(max_length=50, default='pre-clinical / research')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.disease_type} Prediction for {self.patient or self.guest_email} - {self.risk_level} ({self.risk_score}%)"

    def to_dict(self):
        try:
            inp = json.loads(self.input_parameters or "{}")
        except Exception:
            inp = {}
        try:
            rem = json.loads(self.remedies or "{}")
        except Exception:
            rem = {}
        if isinstance(rem, dict):
            for k in ['dietary_guidelines', 'lifestyle_modifications', 'clinical_recommendations', 'urgent_warning_signs']:
                v = rem.get(k)
                if v is None:
                    rem[k] = []
                elif isinstance(v, list):
                    rem[k] = [str(x) for x in v]
                elif isinstance(v, str):
                    rem[k] = [s.strip() for s in v.split("\n") if s.strip()] or [v]
                elif isinstance(v, dict):
                    rem[k] = [f"{dk}: {dv}" for dk, dv in v.items()]
                else:
                    rem[k] = [str(v)]
        return {
            "id": self.id,
            "type": "prediction",
            "disease_type": self.disease_type,
            "input_parameters": inp,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "clinical_reasoning": self.clinical_reasoning,
            "remedies": rem,
            "model_version": self.model_version,
            "dataset_provenance": self.dataset_provenance,
            "is_experimental": self.is_experimental,
            "validation_status": self.validation_status,
            "guest_email": self.guest_email,
            "guest_name": self.guest_name,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }


# ── Health Twin Clinical Data Models ───────────────────────────────────────

ORGAN_SYSTEM_CHOICES = [
    ('heart', 'Heart / Cardiovascular'),
    ('lungs', 'Lungs / Respiratory'),
    ('liver', 'Liver / Hepatic'),
    ('stomach', 'Stomach / Gastric'),
    ('pancreas', 'Pancreas / Metabolic'),
    ('kidneys', 'Kidneys / Renal'),
    ('intestines', 'Intestines / Gastrointestinal'),
    ('brain', 'Brain / Neurological'),
    ('systemic', 'Systemic / Multi-system'),
]

CONDITION_STATUS_CHOICES = [
    ('active', 'Active'),
    ('recurrence', 'Recurrence'),
    ('remission', 'Remission'),
    ('resolved', 'Resolved'),
    ('historical', 'Historical'),
]

VERIFICATION_STATUS_CHOICES = [
    ('confirmed', 'Clinically Confirmed'),
    ('suspected', 'Suspected / Differential'),
    ('self_reported', 'Patient Reported'),
]


class MedicalCondition(models.Model):
    """
    Formal representation of diagnosed and reported medical conditions
    distinguishing active conditions, historical findings, and unverified data.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='conditions')
    condition_name = models.CharField(max_length=200)
    icd10_code = models.CharField(max_length=20, blank=True)
    organ_system = models.CharField(max_length=30, choices=ORGAN_SYSTEM_CHOICES, default='systemic')
    clinical_status = models.CharField(max_length=20, choices=CONDITION_STATUS_CHOICES, default='active')
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS_CHOICES, default='confirmed')
    onset_date = models.DateField(null=True, blank=True)
    diagnosed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    verified_by_doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_conditions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-diagnosed_date', '-created_at']

    def __str__(self):
        return f"{self.condition_name} ({self.clinical_status}) - {self.patient}"

    def to_dict(self):
        return {
            "id": self.id,
            "condition_name": self.condition_name,
            "icd10_code": self.icd10_code,
            "organ_system": self.organ_system,
            "clinical_status": self.clinical_status,
            "verification_status": self.verification_status,
            "onset_date": self.onset_date.isoformat() if self.onset_date else None,
            "diagnosed_date": self.diagnosed_date.isoformat() if self.diagnosed_date else None,
            "notes": self.notes,
            "is_active": self.clinical_status == 'active',
            "is_historical": self.clinical_status in ['resolved', 'historical'],
            "verified_by": self.verified_by_doctor.full_name if self.verified_by_doctor else None,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }


class ClinicalObservation(models.Model):
    """
    Normalized, unit-aware laboratory and biomarker measurement.
    Strictly preserves measurement values, standard units, timestamps,
    reference intervals, and provenance to prevent unit corruption.
    """
    ABNORMALITY_CHOICES = [
        ('NORMAL', 'Normal'),
        ('LOW', 'Low'),
        ('HIGH', 'High'),
        ('CRITICAL_LOW', 'Critical Low'),
        ('CRITICAL_HIGH', 'Critical High'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='observations')
    organ_system = models.CharField(max_length=30, choices=ORGAN_SYSTEM_CHOICES, default='systemic')
    code = models.CharField(max_length=50, blank=True, help_text="Standard biomarker identifier or LOINC code")
    name = models.CharField(max_length=150)
    value_numeric = models.FloatField(null=True, blank=True)
    value_text = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=50, blank=True, help_text="Standard measurement unit (e.g. mg/dL, mL/min/1.73m2)")
    reference_range_min = models.FloatField(null=True, blank=True)
    reference_range_max = models.FloatField(null=True, blank=True)
    reference_range_text = models.CharField(max_length=100, blank=True)
    is_abnormal = models.BooleanField(default=False)
    abnormality_flag = models.CharField(max_length=20, choices=ABNORMALITY_CHOICES, default='NORMAL')
    status = models.CharField(max_length=20, default='final', choices=[
        ('preliminary', 'Preliminary'),
        ('final', 'Final'),
        ('corrected', 'Corrected'),
    ])
    observation_timestamp = models.DateTimeField()
    provenance = models.CharField(max_length=60, default='lab_report', help_text="Origin: lab_report, clinical_device, physician_entry")
    source_report = models.ForeignKey(PathologyReport, null=True, blank=True, on_delete=models.SET_NULL, related_name='extracted_observations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_timestamp']
        indexes = [
            models.Index(fields=['patient', 'organ_system']),
            models.Index(fields=['patient', 'observation_timestamp']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        val = f"{self.value_numeric} {self.unit}".strip() if self.value_numeric is not None else self.value_text
        return f"{self.name}: {val} ({'Abnormal' if self.is_abnormal else 'Normal'}) - {self.patient}"

    def clean(self):
        # Automatically calculate abnormality if reference ranges exist and value_numeric is set
        if self.value_numeric is not None:
            ref_max = float(self.reference_range_max) if self.reference_range_max is not None else None
            ref_min = float(self.reference_range_min) if self.reference_range_min is not None else None
            if ref_max is not None and float(self.value_numeric) > ref_max:
                self.is_abnormal = True
                if float(self.value_numeric) > ref_max * 1.5:
                    self.abnormality_flag = 'CRITICAL_HIGH'
                else:
                    self.abnormality_flag = 'HIGH'
            elif ref_min is not None and float(self.value_numeric) < ref_min:
                self.is_abnormal = True
                if float(self.value_numeric) < ref_min * 0.6:
                    self.abnormality_flag = 'CRITICAL_LOW'
                else:
                    self.abnormality_flag = 'LOW'
            else:
                self.is_abnormal = False
                self.abnormality_flag = 'NORMAL'

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "organ_system": self.organ_system,
            "code": self.code,
            "name": self.name,
            "value": self.value_numeric if self.value_numeric is not None else self.value_text,
            "value_numeric": self.value_numeric,
            "value_text": self.value_text,
            "unit": self.unit,
            "reference_range": {
                "min": self.reference_range_min,
                "max": self.reference_range_max,
                "display": self.reference_range_text or (
                    f"{self.reference_range_min} - {self.reference_range_max} {self.unit}".strip()
                    if self.reference_range_min is not None and self.reference_range_max is not None
                    else (f"< {self.reference_range_max} {self.unit}".strip() if self.reference_range_max is not None else "")
                ),
            },
            "is_abnormal": self.is_abnormal,
            "abnormality_flag": self.abnormality_flag,
            "status": self.status,
            "observation_timestamp": self.observation_timestamp.isoformat() if self.observation_timestamp else "",
            "provenance": self.provenance,
            "source_report_id": self.source_report_id,
        }


class VitalSignRecord(models.Model):
    """
    Cardiovascular and pulmonary physiological vitals stream with units and timestamps.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vital_signs')
    systolic_bp = models.IntegerField(null=True, blank=True, help_text="Systolic Blood Pressure (mmHg)")
    diastolic_bp = models.IntegerField(null=True, blank=True, help_text="Diastolic Blood Pressure (mmHg)")
    heart_rate = models.IntegerField(null=True, blank=True, help_text="Resting Heart Rate (bpm)")
    respiratory_rate = models.IntegerField(null=True, blank=True, help_text="Respirations per minute (breaths/min)")
    oxygen_saturation = models.FloatField(null=True, blank=True, help_text="Peripheral capillary oxygen saturation SpO2 (%)")
    temperature_c = models.FloatField(null=True, blank=True, help_text="Body Temperature (°C)")
    recorded_at = models.DateTimeField()
    source = models.CharField(max_length=60, default='clinical_vitals', help_text="clinical_triage, telemetry_sensor, patient_home_monitor")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['patient', 'recorded_at']),
        ]

    def __str__(self):
        bp = f"{self.systolic_bp}/{self.diastolic_bp} mmHg" if self.systolic_bp and self.diastolic_bp else "BP N/A"
        return f"Vitals: {bp}, HR {self.heart_rate} bpm - {self.patient}"

    def to_dict(self):
        return {
            "id": self.id,
            "systolic_bp": self.systolic_bp,
            "diastolic_bp": self.diastolic_bp,
            "bp_display": f"{self.systolic_bp}/{self.diastolic_bp} mmHg" if self.systolic_bp and self.diastolic_bp else None,
            "heart_rate": self.heart_rate,
            "heart_rate_unit": "bpm",
            "respiratory_rate": self.respiratory_rate,
            "respiratory_rate_unit": "breaths/min",
            "oxygen_saturation": self.oxygen_saturation,
            "oxygen_saturation_unit": "%",
            "temperature_c": self.temperature_c,
            "temperature_unit": "°C",
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else "",
            "source": self.source,
        }




# ── Diet Planner Models ────────────────────────────────────────────────────

REGION_CHOICES = [
    ('Tamil Nadu', 'Tamil Nadu'),
    ('Kerala', 'Kerala'),
    ('Karnataka', 'Karnataka'),
    ('Andhra Pradesh', 'Andhra Pradesh'),
    ('Telangana', 'Telangana'),
    ('Maharashtra', 'Maharashtra'),
    ('North Indian', 'North Indian'),
    ('Other', 'Other'),
]

DIET_TYPE_CHOICES = [
    ('vegetarian', 'Vegetarian'),
    ('non_vegetarian', 'Non-Vegetarian'),
    ('vegan', 'Vegan'),
]

CALORIE_CHOICES = [
    ('low', 'Low (<1500 kcal)'),
    ('moderate', 'Moderate (1500-2000 kcal)'),
    ('high', 'High (>2000 kcal)'),
]

BUDGET_CHOICES = [
    ('low', 'Budget-Friendly'),
    ('moderate', 'Moderate'),
    ('high', 'Premium'),
]


class DietPreference(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='diet_preference')
    region = models.CharField(max_length=50, choices=REGION_CHOICES, default='Tamil Nadu')
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, default='vegetarian')
    food_allergies = models.TextField(default='[]')   # JSON list of strings
    food_dislikes = models.TextField(default='[]')    # JSON list of strings
    meals_per_day = models.IntegerField(default=3)
    calorie_preference = models.CharField(max_length=20, choices=CALORIE_CHOICES, default='moderate')
    budget = models.CharField(max_length=20, choices=BUDGET_CHOICES, default='moderate')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"DietPreference({self.patient}, {self.region}, {self.diet_type})"


class MealPlan(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='meal_plans')
    week_start = models.DateField()
    plan_data = models.TextField()    # JSON: {"monday": {"breakfast": {...}, ...}, ...}
    generated_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"MealPlan({self.patient}, week={self.week_start})"


class MealCompletion(models.Model):
    MEAL_TYPES = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner']

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='meal_completions')
    date = models.DateField()
    meal_type = models.CharField(max_length=20)
    meal_name = models.CharField(max_length=200, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('patient', 'date', 'meal_type')]
        ordering = ['-date']

    def __str__(self):
        return f"MealCompletion({self.patient}, {self.date}, {self.meal_type}, completed={self.completed})"


class FavoriteMeal(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='favorite_meals')
    meal_data = models.TextField()    # JSON blob of the meal object
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-added_at']


class ShoppingListItem(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='shopping_items')
    ingredient = models.CharField(max_length=200)
    quantity = models.CharField(max_length=100, blank=True)
    checked = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['checked', '-added_at']


# ── Health Garden Models ────────────────────────────────────────────────────

ACTIVITY_TYPE_CHOICES = [
    ('medication_taken', 'Medication Taken'),
    ('meal_completed', 'Meal Completed'),
    ('symptom_logged', 'Symptom Logged'),
    ('activity_completed', 'Activity Completed'),
    ('checkin', 'Health Check-in'),
]

POINTS_MAP = {
    'medication_taken': 10,
    'meal_completed': 5,
    'symptom_logged': 5,
    'activity_completed': 10,
    'checkin': 5,
}


class HealthActivity(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='health_activities')
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPE_CHOICES)
    points = models.IntegerField(default=5)
    note = models.CharField(max_length=200, blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-logged_at']

    def __str__(self):
        return f"HealthActivity({self.patient}, {self.activity_type}, +{self.points}pts)"


class GardenProgress(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='garden')
    total_points = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    best_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    achievements = models.TextField(default='[]')   # JSON list of achievement id strings
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"GardenProgress({self.patient}, pts={self.total_points}, streak={self.current_streak})"
