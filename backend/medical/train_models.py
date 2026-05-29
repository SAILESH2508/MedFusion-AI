import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def generate_heart_data(num_samples=2000):
    np.random.seed(42)
    # Features: age, gender, systolic_bp, diastolic_bp, cholesterol, max_heart_rate, chest_pain, exercise_angina, fasting_sugar, shortness_of_breath, left_arm_pain
    age = np.random.randint(18, 90, size=num_samples)
    gender = np.random.randint(0, 2, size=num_samples)
    systolic_bp = np.random.randint(90, 200, size=num_samples)
    diastolic_bp = np.random.randint(50, 120, size=num_samples)
    cholesterol = np.random.randint(120, 380, size=num_samples)
    max_heart_rate = np.random.randint(80, 210, size=num_samples)
    chest_pain = np.random.randint(0, 4, size=num_samples)  # 0: none, 1: typical, 2: atypical, 3: non-anginal
    exercise_angina = np.random.randint(0, 2, size=num_samples)
    fasting_sugar = np.random.randint(0, 2, size=num_samples)
    shortness_of_breath = np.random.randint(0, 2, size=num_samples)
    left_arm_pain = np.random.randint(0, 2, size=num_samples)

    # Compute risk score (0-100) mathematically with realistic correlations
    score = (
        (age - 18) * 0.3 + 
        gender * 5.0 + 
        (systolic_bp - 90) * 0.25 + 
        (diastolic_bp - 50) * 0.15 + 
        (cholesterol - 120) * 0.12 + 
        (210 - max_heart_rate) * 0.15 + 
        (chest_pain == 1) * 20.0 + 
        (chest_pain == 2) * 10.0 + 
        exercise_angina * 15.0 + 
        fasting_sugar * 8.0 + 
        shortness_of_breath * 8.0 + 
        left_arm_pain * 12.0
    )
    # Add random noise
    score += np.random.normal(0, 5, size=num_samples)
    # Scale to 0-100
    score = np.clip(score, 0, 100)

    X = np.stack([
        age, gender, systolic_bp, diastolic_bp, cholesterol, max_heart_rate, 
        chest_pain, exercise_angina, fasting_sugar, shortness_of_breath, left_arm_pain
    ], axis=1)
    return X, score

def generate_diabetes_data(num_samples=2000):
    np.random.seed(42)
    # Features: age, gender, glucose, hba1c, weight, height, bmi, hypertension, heart_disease, family_history, thirst, urination, blurry_vision, sores
    age = np.random.randint(18, 90, size=num_samples)
    gender = np.random.randint(0, 2, size=num_samples)
    glucose = np.random.randint(60, 350, size=num_samples)
    hba1c = np.random.uniform(4.0, 15.0, size=num_samples)
    weight = np.random.randint(45, 180, size=num_samples)
    height = np.random.randint(140, 210, size=num_samples)
    bmi = weight / ((height / 100.0) ** 2)
    hypertension = np.random.randint(0, 2, size=num_samples)
    heart_disease = np.random.randint(0, 2, size=num_samples)
    family_history = np.random.randint(0, 2, size=num_samples)
    thirst = np.random.randint(0, 2, size=num_samples)
    urination = np.random.randint(0, 2, size=num_samples)
    blurry_vision = np.random.randint(0, 2, size=num_samples)
    sores = np.random.randint(0, 2, size=num_samples)

    score = (
        (age - 18) * 0.1 + 
        (glucose - 60) * 0.2 + 
        (hba1c - 4.0) * 5.5 + 
        (bmi - 18.5) * 0.8 + 
        hypertension * 8.0 + 
        heart_disease * 6.0 + 
        family_history * 10.0 + 
        thirst * 12.0 + 
        urination * 10.0 + 
        blurry_vision * 5.0 + 
        sores * 6.0
    )
    score += np.random.normal(0, 4, size=num_samples)
    score = np.clip(score, 0, 100)

    X = np.stack([
        age, gender, glucose, hba1c, bmi, hypertension, heart_disease, 
        family_history, thirst, urination, blurry_vision, sores
    ], axis=1)
    return X, score

def generate_cancer_data(num_samples=2000):
    np.random.seed(42)
    # Features: age, gender, family_history, smoking, alcohol, exposure, weight_loss, cough, fatigue, mole_changes, lumps
    age = np.random.randint(18, 90, size=num_samples)
    gender = np.random.randint(0, 2, size=num_samples)
    family_history = np.random.randint(0, 2, size=num_samples)
    smoking = np.random.randint(0, 2, size=num_samples)
    alcohol = np.random.randint(0, 2, size=num_samples)
    exposure = np.random.randint(0, 2, size=num_samples)
    weight_loss = np.random.randint(0, 2, size=num_samples)
    cough = np.random.randint(0, 2, size=num_samples)
    fatigue = np.random.randint(0, 2, size=num_samples)
    mole_changes = np.random.randint(0, 2, size=num_samples)
    lumps = np.random.randint(0, 2, size=num_samples)

    score = (
        (age - 18) * 0.15 + 
        family_history * 15.0 + 
        smoking * 20.0 + 
        alcohol * 8.0 + 
        exposure * 12.0 + 
        weight_loss * 15.0 + 
        cough * 10.0 + 
        fatigue * 5.0 + 
        mole_changes * 15.0 + 
        lumps * 18.0
    )
    score += np.random.normal(0, 5, size=num_samples)
    score = np.clip(score, 0, 100)

    X = np.stack([
        age, gender, family_history, smoking, alcohol, exposure, 
        weight_loss, cough, fatigue, mole_changes, lumps
    ], axis=1)
    return X, score

def train_and_serialize_models():
    # Make directory
    model_dir = os.path.join(os.path.dirname(__file__), 'ml_models')
    os.makedirs(model_dir, exist_ok=True)
    print(f"Target directory for serializing ML models: {model_dir}")

    # 1. Heart Attack model
    print("Synthesizing and training Heart Attack predictor...")
    X_heart, y_heart = generate_heart_data()
    heart_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    heart_model.fit(X_heart, y_heart)
    with open(os.path.join(model_dir, 'heart_attack_rf.pkl'), 'wb') as f:
        pickle.dump(heart_model, f)
    print("Heart Attack predictor trained and serialized successfully!")

    # 2. Diabetes model
    print("Synthesizing and training Diabetes predictor...")
    X_diab, y_diab = generate_diabetes_data()
    diab_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    diab_model.fit(X_diab, y_diab)
    with open(os.path.join(model_dir, 'diabetes_rf.pkl'), 'wb') as f:
        pickle.dump(diab_model, f)
    print("Diabetes predictor trained and serialized successfully!")

    # 3. Cancer model
    print("Synthesizing and training Cancer predictor...")
    X_cancer, y_cancer = generate_cancer_data()
    cancer_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    cancer_model.fit(X_cancer, y_cancer)
    with open(os.path.join(model_dir, 'cancer_rf.pkl'), 'wb') as f:
        pickle.dump(cancer_model, f)
    print("Cancer predictor trained and serialized successfully!")

if __name__ == "__main__":
    train_and_serialize_models()
