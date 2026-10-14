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
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "dob": self.dob.isoformat() if self.dob is not None else None,
            "gender": self.gender,
            "blood_group": self.blood_group,
            "weight": self.weight_kg,
            "height": self.height_cm,
            "allergies": json.loads(self.allergies or '[]'),
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
        return {
            "id": self.id,
            "type": "prescription",
            "label": "Prescription Analysis",
            "image_url": self.image_url,
            "extracted_data": json.loads(self.extracted_data or "{}"),
            "status": self.status,
            "guest_email": self.guest_email,
            "guest_name": self.guest_name,
            "created_at": self.created_at.isoformat(),
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
        return {
            "id": self.id,
            "type": "pathology",
            "label": "Pathology Analysis",
            "report_data": json.loads(self.report_data or "[]"),
            "analysis": json.loads(self.clinical_insight or "{}"),
            "guest_email": self.guest_email,
            "guest_name": self.guest_name,
            "created_at": self.created_at.isoformat(),
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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.disease_type} Prediction for {self.patient or self.guest_email} - {self.risk_level} ({self.risk_score}%)"

    def to_dict(self):
        return {
            "id": self.id,
            "type": "prediction",
            "disease_type": self.disease_type,
            "input_parameters": json.loads(self.input_parameters or "{}"),
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "clinical_reasoning": self.clinical_reasoning,
            "remedies": json.loads(self.remedies or "{}"),
            "guest_email": self.guest_email,
            "guest_name": self.guest_name,
            "created_at": self.created_at.isoformat(),
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
