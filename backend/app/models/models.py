from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="patient") # patient, doctor, admin
    is_active = Column(Boolean, default=True)

    patients = relationship("Patient", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    dob = Column(DateTime)
    gender = Column(String)
    blood_group = Column(String)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    allergies = Column(JSON, default=[]) # List of allergy strings
    emergency_contact = Column(String)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    
    doctor = relationship("User", back_populates="patients")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    image_url = Column(String)
    extracted_data = Column(JSON) # {medicines: [], instructions: "", physician: ""}
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PathologyReport(Base):
    __tablename__ = "pathology_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    report_data = Column(JSON) # {biomarkers: [{name: "", value: "", status: ""}]}
    clinical_insight = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
