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

