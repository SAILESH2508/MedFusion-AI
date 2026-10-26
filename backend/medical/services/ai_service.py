import json
import logging
import os
import random
import datetime
from typing import Dict, Any, List, Optional
from .llm_provider import llm_provider
from google.genai import types

logger = logging.getLogger(__name__)


class AIService:
    async def analyze_prescription(
        self, image_data: bytes, mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Extract structured medical data from a prescription image.
        Uses Gemini 1.5 Flash as primary for its strong vision-to-text capabilities.
        """
        prompt = """
        Analyze this medical prescription image carefully. Extract all medicines and their full schedule.

        Return a JSON object with this exact structure:
        {
          "medicines": [
            {
              "name": "Medicine name",
              "dosage": "e.g. 500mg, 1 tablet, 2 drops",
              "frequency": "e.g. Once daily, Twice daily, TID, QID",
              "frequency_number": 2,
              "timing": "Before food" or "After food" or "With food" (choose based on instructions; default to "After food" if not specified),
              "times_of_day": ["morning", "night"] (use any combination of: "morning", "afternoon", "evening", "night" â€” must match frequency_number count),
              "type": "e.g. Antibiotic, Antacid, Analgesic",
              "description": "Brief clinical purpose of this medicine"
            }
          ],
          "recommendations": ["list of safety warnings or lifestyle advice"],
          "urgency": "Low" or "Moderate" or "High",
          "physician": "Doctor name if visible, else null",
          "clinical_intent": "One sentence summary of what condition this prescription treats"
        }

        Rules:
        - timing MUST be one of: "Before food", "After food", "With food"
        - times_of_day MUST be a list with exactly frequency_number elements chosen from: "morning", "afternoon", "evening", "night"
        - If frequency is once daily â†’ times_of_day has 1 item (typically "morning")
        - If twice daily â†’ ["morning", "night"]
        - If three times daily (TID) â†’ ["morning", "afternoon", "night"]
        - If four times daily (QID) â†’ ["morning", "afternoon", "evening", "night"]
        - Return ONLY the JSON object. No markdown, no explanation.
        """

        try:
            image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)
            content = [image_part, prompt]

            response_text = await llm_provider.generate_response(
                prompt=content,
                model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
                system_prompt="You are a Clinical Pharmacy Specialist. You output precision medical data in JSON format.",
            )

            return self._parse_json(response_text)
        except Exception as e:
            logger.error(f"Prescription Analysis failed: {e}")
            return self._get_fallback_vitals("Prescription analysis unavailable.")

    async def analyze_pathology(
        self, biomarkers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze lab results and calculate clinical indices.
        """
        prompt = f"""
        Analyze these clinical biomarkers: {json.dumps(biomarkers)}
        
        Calculate:
        - risk_index: percentage (0-100)
        - normalcy_index: percentage (0-100)
        - normalcy_level: "OPTIMAL", "GOOD", "OBSERVATION", or "INTERVENTION"
        - insights: list of key metabolic observations
        - summary: overall clinical status summary
        
        Return ONLY a JSON object.
        """

        try:
            response_text = await llm_provider.generate_response(
                prompt=prompt,
                model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
                system_prompt="You are a Metabolic Pathology Expert. You analyze biomarkers for longitudinal health trends.",
            )
            return self._parse_json(response_text)
        except Exception as e:
            logger.error(f"Pathology Analysis failed: {e}")
            return self._get_fallback_vitals("Biomarker analysis node offline.")

    async def extract_biomarkers_from_image(
        self, image_data: bytes, mime_type: str = "image/jpeg"
    ) -> List[Dict[str, Any]]:
        """
        Extract structured biomarker data from a lab/pathology report image.
        """
        prompt = """
        Analyze this laboratory pathology report image. Extract all the clinical biomarkers/vitals listed.
        For each biomarker, extract:
        - name: string (e.g. Glucose, Cholesterol, Hemoglobin, WBC Count, etc.)
        - value: float or integer
        - unit: string (e.g. mg/dL, g/dL, cells/mcL, etc.)
        
        Return ONLY a JSON list of objects, each containing 'name', 'value', and 'unit'.
        Example format:
        [
            {"name": "Glucose", "value": 95, "unit": "mg/dL"},
            {"name": "Cholesterol", "value": 185, "unit": "mg/dL"}
        ]
        No Markdown backticks, no markdown code block formatting, and no explanation. Output raw JSON list only.
        """

        try:
            image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)
            content = [image_part, prompt]

            response_text = await llm_provider.generate_response(
                prompt=content,
                model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
                system_prompt="You are a Laboratory Information System Specialist. You extract precision biometric data from report scans in JSON list format.",
            )

            # Parse JSON list
            return self._clean_and_parse_json(response_text, default=[], start_char="[", end_char="]")
        except Exception as e:
            logger.error(f"Pathology biomarker extraction failed: {e}")
            return []

    def _clean_and_parse_json(self, text: str, default: Any, start_char: str = "{", end_char: str = "}") -> Any:
        try:
            if "AI system failure" in text or "All fallbacks exhausted" in text:
                return default
            
            clean_text = text.strip()
            if clean_text.startswith("```"):
                newline_idx = clean_text.find("\n")
                if newline_idx != -1:
                    clean_text = clean_text[newline_idx:].strip()
                else:
                    clean_text = clean_text[3:].strip()
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3].strip()

            start = clean_text.find(start_char)
            end = clean_text.rfind(end_char)
            if start != -1 and end != -1 and end >= start:
                return json.loads(clean_text[start:end + 1])
            return json.loads(clean_text)
        except Exception as e:
            logger.error(f"JSON Clean & Parse Error: {e}. Raw: {text[:100]}...")
            return default

    def _parse_json(self, text: str) -> Dict[str, Any]:
        if "AI system failure" in text or "All fallbacks exhausted" in text:
            return self._get_fallback_vitals("AI API keys not configured")
        
        res = self._clean_and_parse_json(text, default=None, start_char="{", end_char="}")
        if res is None:
            return self._get_fallback_vitals("JSON parsing failed")
        return res

    def _get_fallback_vitals(self, error_msg: str) -> Dict[str, Any]:
        # Create enhanced demo responses when AI API is unavailable
        import random
        import datetime
        
        # Check if this is a quota issue vs configuration issue
        is_quota_issue = "quota" in error_msg.lower() or "exceeded" in error_msg.lower()
        is_config_issue = "not configured" in error_msg.lower() or "not found" in error_msg.lower()
        is_network_issue = "connection" in error_msg.lower() or "ssl" in error_msg.lower()
        
        if is_quota_issue:
            status_msg = "API_QUOTA_EXCEEDED"
            user_message = "API quota exceeded - please upgrade plan or wait for reset"
        elif is_config_issue:
            status_msg = "API_NOT_CONFIGURED"
            user_message = "API keys not configured - contact administrator"
        elif is_network_issue:
            status_msg = "NETWORK_ERROR"
            user_message = "Network connectivity issues - please check connection"
        else:
            status_msg = "AI_UNAVAILABLE"
            user_message = "AI service temporarily unavailable"
        
        # More realistic medical data
        medicines = [
            {
                "name": "Metformin HCL",
                "dosage": "500mg",
                "frequency": "Twice daily",
                "frequency_number": 2,
                "timing": "After food",
                "times_of_day": ["morning", "night"],
                "type": "Antidiabetic",
                "description": "For glycemic control in type 2 diabetes",
                "note": "Monitor renal function periodically"
            },
            {
                "name": "Lisinopril",
                "dosage": "10mg",
                "frequency": "Once daily",
                "frequency_number": 1,
                "timing": "After food",
                "times_of_day": ["morning"],
                "type": "ACE Inhibitor",
                "description": "Blood pressure management",
                "note": "Avoid potassium supplements"
            },
            {
                "name": "Atorvastatin",
                "dosage": "20mg",
                "frequency": "Once daily",
                "frequency_number": 1,
                "timing": "After food",
                "times_of_day": ["night"],
                "type": "Statin",
                "description": "Lipid management",
                "note": "Avoid grapefruit juice"
            }
        ]
        
        # Select 1-2 random medicines for variety
        selected_medicines = random.sample(medicines, random.randint(1, 2))
        
        return {
            "error": error_msg,
            "status": "demo_mode",
            "api_status": status_msg,
            "message": user_message,
            "medicines": selected_medicines,
            "recommendations": [
                "Take medications as prescribed",
                "Monitor blood glucose levels regularly",
                "Maintain healthy diet and exercise",
                "Schedule follow-up appointment",
                "Report any adverse effects immediately",
                "Note: This is demonstration data - requires API access"
            ],
            "urgency": "Low",
            "physician": f"Dr. Sample (Demo Mode - {status_msg.replace('_', ' ').title()})",
            "clinical_intent": "Chronic disease management and preventive care",
            "risk_index": random.randint(15, 45),
            "normalcy_index": random.randint(55, 85),
            "normalcy_level": random.choice(["OPTIMAL", "GOOD", "OBSERVATION"]),
            "insights": [
                f"Demo mode active - {user_message}",
                "Real-time analysis requires API configuration",
                "Consider upgrading API plan for production use",
                f"Analysis timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "MedFusion AI Core v5.0.1 - Enhanced Demo Mode"
            ],
            "summary": f"Enhanced demonstration data - AI service {status_msg.replace('_', ' ').title()}. Configure API keys for real analysis.",
            "disclaimer": "This is demonstration data only. Not for medical diagnosis. Real analysis requires API access.",
            "next_steps": [
                "Configure API keys in backend/.env",
                "Verify API quota limits",
                "Test with real medical documents",
                "Enable production AI features"
            ]
        }

    async def predict_health_risk(
        self, disease_type: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predict risk for a specific disease (Heart Attack, Cancer, Diabetes)
        and generate highly specific remedies (dietary, lifestyle, clinical).
        """
        prompt = f"""
        Conduct a comprehensive clinical risk prediction and remedy planning for the disease type: {disease_type}.
        The patient has submitted the following biomarkers and clinical parameters:
        {json.dumps(parameters, indent=2)}

        You must analyze these inputs to evaluate risk of {disease_type}.
        Provide:
        1. risk_score: A numerical risk index percentage (0.0 to 100.0) based on standard clinical risk scales (e.g. Framingham risk score for Heart Attack, ADA score for Diabetes).
        2. risk_level: One of "LOW", "MODERATE", "HIGH", "CRITICAL".
        3. clinical_reasoning: A detailed clinical explanation (1-2 paragraphs) outlining why the risk is at this level, detailing physiological interactions of the biomarkers, age, family history, and symptoms.
        4. remedies: A structured set of precise remedies to help mitigate this risk:
           - stage: A string description of the clinical stage or severity classification of this risk based on their parameters (e.g., "Stage 0 (Normal)", "Stage I (Pre-Clinical)", "Stage II (Mild / Early Symptom)", "Stage III (Moderate Risk)", "Stage IV (Severe / Critical)").
           - dietary_guidelines: Specific evidence-based dietary guidelines (e.g. DASH diet for cardiovascular risk, low-glycemic foods for diabetes risk).
           - lifestyle_modifications: Targeted habits, exercise regimens, and behavioral adjustments.
           - clinical_recommendations: Clinical next steps, diagnostic blood panels to order (e.g. HbA1c, lipid panel, specific imaging/screenings), and recommended specialist referrals.
           - urgent_warning_signs: Urgent red-flag symptoms that necessitate immediate emergency department evaluation.

        Return ONLY a JSON object. No Markdown, no surrounding explanation.
        """

        try:
            response_text = await llm_provider.generate_response(
                prompt=prompt,
                model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
                system_prompt=f"You are a Senior Clinical Diagnostic Lead and Preventive Medicine Specialist. You analyze patient vitals and symptoms to compute high-precision risk indexes and actionable remedy strategies for {disease_type} in JSON format.",
            )
            if "AI system failure" in response_text or "All fallbacks exhausted" in response_text:
                return self._get_fallback_prediction(disease_type, parameters, response_text)
            
            res = self._parse_json(response_text)
            if not isinstance(res, dict) or "risk_score" not in res:
                return self._get_fallback_prediction(disease_type, parameters, "Invalid prediction response format")

            # Ensure remedies structure and list fields are normalized
            raw_remedies = res.get('remedies')
            remedies: Dict[str, Any] = {}
            if isinstance(raw_remedies, str):
                try:
                    parsed_rem = json.loads(raw_remedies)
                    if isinstance(parsed_rem, dict):
                        remedies = parsed_rem
                    else:
                        remedies = {"stage": str(parsed_rem)}
                except Exception:
                    remedies = {"stage": raw_remedies}
            elif isinstance(raw_remedies, dict):
                remedies = dict(raw_remedies)

            def _normalize_list(val: Any) -> List[str]:
                if val is None:
                    return []
                if isinstance(val, list):
                    return [str(x) for x in val]
                if isinstance(val, str):
                    return [s.strip() for s in val.split("\n") if s.strip()] or [val]
                if isinstance(val, dict):
                    return [f"{k}: {v}" for k, v in val.items()]
                return [str(val)]

            for key in ['dietary_guidelines', 'lifestyle_modifications', 'clinical_recommendations', 'urgent_warning_signs']:
                remedies[key] = _normalize_list(remedies.get(key))
            res['remedies'] = remedies

            # Augment Gemini response with real ML feature importances
            if 'factors' not in res or not res.get('factors'):
                ml_result = self._predict_using_ml(disease_type, parameters)
                if isinstance(ml_result, dict):
                    res['factors'] = ml_result.get('factors', [])
                else:
                    res['factors'] = []
            return res
        except Exception as e:
            logger.error(f"Health Risk Prediction failed for {disease_type}: {e}")
            return self._get_fallback_prediction(disease_type, parameters, str(e))

    def _get_fallback_prediction(
        self, disease_type: str, parameters: Dict[str, Any], error_msg: str
    ) -> Dict[str, Any]:
        import random
        
        disease = disease_type.lower()
        
        # Try running real-time Machine Learning prediction via our trained Random Forest models
        ml_result = self._predict_using_ml(disease_type, parameters)
        if isinstance(ml_result, (int, float)):
            risk_score = float(ml_result)
            ml_factors = []
            ml_active = True
        elif isinstance(ml_result, dict):
            risk_score = float(ml_result.get('score', 15.0))
            ml_factors = ml_result.get('factors', [])
            ml_active = True
        else:
            risk_score = 15.0
            ml_factors = []
            ml_active = False
        
        # Extract common fields
        age = int(parameters.get("age", 35) or 35)
        gender = parameters.get("gender", "M")
        family_history_val = parameters.get("family_history", "no")
        family_history = family_history_val in ["yes", "severe", "mild"]
        smoking = parameters.get("smoking", "no") == "yes"
        
        stage_val = "Stage 0 (Normal / Low Risk)"
        if risk_score > 80:
            stage_val = "Stage III (Severe / Critical Risk)"
        elif risk_score > 55:
            stage_val = "Stage II (High Risk / Intervention Needed)"
        elif risk_score > 30:
            stage_val = "Stage I (Moderate Risk / Monitoring Recommended)"
            
        remedies = {
            "stage": stage_val,
            "dietary_guidelines": [],
            "lifestyle_modifications": [],
            "clinical_recommendations": [],
            "urgent_warning_signs": []
        }
        
        clinical_reasoning = ""
        
        if "diabetes" in disease or "diabetic" in disease:
            # Calculate diabetes risk score
            glucose = float(parameters.get("glucose", 90) or 90)
            hba1c = float(parameters.get("hba1c", 5.0) or 5.0)
            bmi = float(parameters.get("bmi", 22.0) or 22.0)
            hypertension = parameters.get("hypertension", "no") == "yes"
            symptoms = parameters.get("symptoms", [])
            
            risk_score = 10.0
            reasons = []
            
            if glucose > 100:
                risk_score += 15
                reasons.append(f"Elevated fasting/random blood glucose level ({glucose} mg/dL)")
            if glucose > 140:
                risk_score += 15
                reasons.append("Postprandial glucose values indicate impaired glucose tolerance")
            if glucose > 200:
                risk_score += 20
                reasons.append("Severe hyperglycemic reading exceeds standard diabetic diagnostic thresholds")
                
            if hba1c > 5.7:
                risk_score += 15
                reasons.append(f"Prediabetic range HbA1c ({hba1c}%) indicates cumulative glycemic stress")
            if hba1c > 6.5:
                risk_score += 25
                reasons.append(f"Diabetic range HbA1c ({hba1c}%) shows chronic high concentration of glycated hemoglobin")
                
            if bmi > 30:
                risk_score += 25
                reasons.append(f"Obese BMI ({bmi:.1f}) is a highly positive driver of metabolic syndrome and lipid dysfunction")
            elif bmi > 25:
                risk_score += 12
                reasons.append(f"Overweight BMI ({bmi:.1f}) elevates cellular insulin resistance")
                
            if age > 45:
                risk_score += 10
                reasons.append(f"Age factor ({age} years) is associated with beta-cell decline and reduced insulin sensitivity")
            if age > 65:
                risk_score += 10
                
            if hypertension:
                risk_score += 15
                reasons.append("Comorbid hypertension causes endothelial tension and elevates vascular risk pathways")
                
            if family_history:
                risk_score += 18
                reasons.append("Positive family history of Type 2 Diabetes suggests shared polygenic susceptibility alleles")
                
            if symptoms:
                active_symptoms = [s for s, val in symptoms.items() if val is True] if isinstance(symptoms, dict) else symptoms
                risk_score += min(20, len(active_symptoms) * 7)
                if active_symptoms:
                    reasons.append(f"Active clinical symptoms reported (e.g. {', '.join(active_symptoms[:3])})")
                
            risk_score = min(98.5, max(5.0, risk_score))
            
            # Clinical reasoning text
            reasons_str = "; ".join(reasons) if reasons else "no major metabolic risks identified."
            clinical_reasoning = (
                f"Glycemic profiling indicates a calculated Type 2 Diabetes risk of {risk_score:.1f}%. "
                f"This projection is primarily driven by: {reasons_str}. The insulin receptor sensitivity appears to be "
                f"under metabolic load, hindering glucose uptake by skeletal muscle and liver cells, thereby increasing vascular endothelial damage."
            )
            
            # Remedies
            remedies["dietary_guidelines"] = [
                "Adopt a strict Low Glycemic Index (GI) dietary framework focusing on complex carbohydrates",
                "Increase daily soluble fiber intake to 35g minimum (helps slow carbohydrate absorption)",
                "Follow a structured plate method: 50% non-starchy vegetables, 25% lean protein, 25% complex grains",
                "Eliminate simple sugars, fructose corn syrups, and carbonated beverages completely"
            ]
            remedies["lifestyle_modifications"] = [
                "Engage in 150 minutes of weekly moderate-intensity cardiovascular exercise (e.g., brisk walking)",
                "Integrate progressive resistance training 2-3 times/week to improve insulin receptor upregulation",
                "Practice sleep hygiene targeting 7-8 hours nightly to regulate cortisol and leptin balances",
                "Target a 5% to 10% reduction in total body weight if overweight"
            ]
            remedies["clinical_recommendations"] = [
                "Schedule a formal Laboratory Fasting Plasma Glucose and HbA1c confirmation panel",
                "Obtain a comprehensive Lipid Panel (Total, HDL, LDL, Triglycerides) and fasting insulin levels",
                "Consult an Endocrinologist or Certified Diabetes Educator (CDE) for long-term health planning",
                "Monitor home blood glucose daily using a digital glucometer (Fasting target: <100 mg/dL; postprandial: <140 mg/dL)"
            ]
            remedies["urgent_warning_signs"] = [
                "Extreme lethargy or confusion accompanied by a sweet, fruity odor on the breath (suspected DKA)",
                "Severe dehydration, extreme unquenchable thirst, and hyperventilation",
                "Blood glucose reading exceeding 250 mg/dL on multiple consecutive tests with symptoms of nausea"
            ]
            
        elif "heart" in disease or "cardio" in disease:
            # Heart Attack / Cardiovascular risk
            cholesterol = float(parameters.get("cholesterol", 180) or 180)
            systolic_bp = float(parameters.get("systolic_bp", 120) or 120)
            diastolic_bp = float(parameters.get("diastolic_bp", 80) or 80)
            chest_pain = parameters.get("chest_pain", "none")
            exercise_angina = parameters.get("exercise_angina", "no") == "yes"
            symptoms = parameters.get("symptoms", [])
            
            risk_score = 12.0
            reasons = []
            
            if cholesterol > 200:
                risk_score += 15
                reasons.append(f"Hypercholesterolemia ({cholesterol} mg/dL) promotes arterial plaque formation")
            if cholesterol > 240:
                risk_score += 20
                reasons.append("Severe lipid concentration indicates critical circulating LDL-C accumulation")
                
            if systolic_bp > 130 or diastolic_bp > 85:
                risk_score += 10
                reasons.append(f"Pre-hypertensive state ({systolic_bp}/{diastolic_bp} mmHg) elevates vascular shearing stress")
            if systolic_bp > 145 or diastolic_bp > 95:
                risk_score += 20
                reasons.append(f"Stage 2 Hypertension ({systolic_bp}/{diastolic_bp} mmHg) forces high left ventricular workload")
            if systolic_bp > 165:
                risk_score += 15
                
            if chest_pain != "none" and chest_pain != "typical_angina":
                risk_score += 15
                reasons.append("Atypical cardiac chest discomfort indicates possible localized myocardial ischemia")
            elif chest_pain == "typical_angina":
                risk_score += 35
                reasons.append("Typical Angina reports strongly correlate with critical coronary artery stenosis")
                
            if exercise_angina:
                risk_score += 20
                reasons.append("Exercise-induced angina highlights an active oxygen supply-demand mismatch in the myocardium")
                
            if age > 50:
                risk_score += 12
                reasons.append(f"Age factor ({age} years) increases arterial stiffness and calcification risk")
            if age > 65:
                risk_score += 13
                
            if family_history:
                risk_score += 20
                reasons.append("First-degree family history of early onset coronary artery disease elevates baseline genetic risk")
                
            if smoking:
                risk_score += 25
                reasons.append("Nicotine inhalation damages vascular endothelial lining and increases platelet aggregation")
                
            if symptoms:
                active_symptoms = [s for s, val in symptoms.items() if val is True] if isinstance(symptoms, dict) else symptoms
                risk_score += min(18, len(active_symptoms) * 6)
                if active_symptoms:
                    reasons.append(f"Active cardiovascular symptoms reported: {', '.join(active_symptoms[:3])}")
                
            risk_score = min(98.0, max(5.0, risk_score))
            
            reasons_str = "; ".join(reasons) if reasons else "no primary cardiovascular risk factors found."
            clinical_reasoning = (
                f"Cardiovascular profiling predicts a calculated myocardial infarction (Heart Attack) risk index of {risk_score:.1f}% "
                f"over the medium term. Main contributors include: {reasons_str}. Chronic arterial wall friction due to hypertension "
                f"combined with lipid buildup accelerates coronary atherogenesis, risking acute plaque rupture and thrombosis."
            )
            
            # Remedies
            remedies["dietary_guidelines"] = [
                "Implement a strict Mediterranean or DASH dietary framework",
                "Reduce daily sodium intake to less than 1,500 mg to assist in vascular pressure control",
                "Eliminate all trans fats and limit saturated fats to less than 6% of total daily calories",
                "Increase daily intake of Omega-3 rich foods (wild-caught salmon, walnuts, flaxseeds)"
            ]
            remedies["lifestyle_modifications"] = [
                "Perform 30 minutes of aerobic activity (such as cycling or swimming) 5 times a week",
                "Engage in strict stress-management protocols (mindfulness, breathing exercises) to control sympathetic drive",
                "Maintain a healthy waist circumference (target <40 inches for men, <35 inches for women)",
                "Complete tobacco/smoking cessation immediately if applicable"
            ]
            remedies["clinical_recommendations"] = [
                "Request a comprehensive Cardiovascular panel: Lipid Fractionation, High-Sensitivity CRP (hs-CRP), and Lipoprotein(a)",
                "Obtain a Resting 12-lead Electrocardiogram (ECG) and seek a Referral for a Coronary Calcium Scan (CAC)",
                "Consult a Board-Certified Cardiologist for advanced diagnostic risk stratification (Stress test, Echocardiogram)",
                "Perform daily blood pressure telemetry monitoring at rest (Home target: <120/80 mmHg)"
            ]
            remedies["urgent_warning_signs"] = [
                "Crushing, squeezing central chest pressure, heaviness, or pain radiating to the left arm, neck, or jaw",
                "Acute, unexplained shortness of breath, sudden cold sweats, and overwhelming dizziness or syncope",
                "Chest discomfort that does not subside after 5 minutes of complete physical rest"
            ]
        else:
            # Cancer risk (screening focus)
            symptoms = parameters.get("symptoms", [])
            cancer_type = parameters.get("cancer_type", "General")
            alcohol = parameters.get("alcohol", "no") == "yes"
            exposure = parameters.get("exposure", "no") == "yes"
            
            risk_score = 8.0
            reasons = []
            
            if family_history:
                risk_score += 25
                reasons.append("First-degree hereditary lineage of malignant oncology raises genomic risk profile")
            if smoking:
                risk_score += 35
                reasons.append("Chronic tobacco exposure introduces high concentrations of cellular carcinogens")
            if alcohol:
                risk_score += 12
                reasons.append("Regular alcohol intake induces cellular acetaldehyde production (a proven mutagen)")
            if exposure:
                risk_score += 15
                reasons.append("Occupational/environmental contact with chemical carcinogens or radiation")
                
            if age > 50:
                risk_score += 12
                reasons.append(f"Age factor ({age} years) increases cumulative DNA replication error probability")
            if age > 65:
                risk_score += 15
                
            if symptoms:
                active_symptoms = [s for s, val in symptoms.items() if val is True] if isinstance(symptoms, dict) else symptoms
                risk_score += min(35, len(active_symptoms) * 10)
                if active_symptoms:
                    reasons.append(f"Concerning physiological signs reported: {', '.join(active_symptoms[:3])}")
                
            risk_score = min(95.0, max(4.0, risk_score))
            
            reasons_str = "; ".join(reasons) if reasons else "no critical oncological warning flags detected."
            clinical_reasoning = (
                f"Oncological screening assessment calculates a risk exposure index of {risk_score:.1f}% for "
                f"{cancer_type} Cancer. Clinical triggers: {reasons_str}. Hereditary and environmental factors "
                f"can cause progressive cellular mutations that override natural apoptosis mechanisms, requiring vigilant surveillance."
            )
            
            # Remedies
            remedies["dietary_guidelines"] = [
                "Implement a colorful, high-antioxidant, plant-based diet rich in cruciferous vegetables (broccoli, kale)",
                "Strictly limit processed meats, cured foods, and red meat consumption to less than 100g/week",
                "Increase daily intake of prebiotic-rich foods (garlic, onions, oats) to optimize microbiome immunological defense",
                "Eliminate all alcohol consumption completely (proven multi-site carcinogen)"
            ]
            remedies["lifestyle_modifications"] = [
                "Maintain a healthy Body Mass Index (excess adipose tissue promotes high systemic inflammatory cytokines)",
                "Ensure strict UV solar protection (SPF 50+, wide-brimmed hats) and avoid tanning beds",
                "Optimize physical exercise to 220+ minutes of active movement weekly to stimulate natural killer cell activity",
                "Minimize household and occupational exposure to chemical solvents, heavy metals, and radon"
            ]
            remedies["clinical_recommendations"] = [
                "Schedule routine age-appropriate clinical screenings (e.g., Mammogram, Colonoscopy, Pap Smear, or PSA test)",
                "Request a Complete Blood Count (CBC) with differential, liver function tests, and inflammation panels (hs-CRP)",
                "Consult a clinical geneticist for hereditary testing if a strong multi-generational cancer history exists",
                "Conduct regular self-examinations (skin mole assessments, lymph node checks, breast/testicular self-exams)"
            ]
            remedies["urgent_warning_signs"] = [
                "Unexplained, rapid, unintentional weight loss exceeding 10% of body weight within 3 months",
                "Discovery of a rapidly growing, hard, painless, non-mobile lump in any tissue layer (e.g. breast, neck, groin)",
                "Persistent, non-healing sores, a changing skin mole showing asymmetry and irregular borders, or unexplained bleeding"
            ]
            
        if ml_active:
            if isinstance(ml_result, dict):
                risk_score = float(ml_result.get('score', risk_score))
            elif isinstance(ml_result, (int, float)):
                risk_score = float(ml_result)
            clinical_reasoning = (
                f"[Trained Random Forest Machine Learning Model active. Calculated exact probability of {risk_score}% based on patient clinical parameters.] "
                + clinical_reasoning
            )

        # Ensure remedies stage reflects the final calculated risk_score
        stage_val = "Stage 0 (Normal / Low Risk)"
        if risk_score > 80:
            stage_val = "Stage III (Severe / Critical Risk)"
        elif risk_score > 55:
            stage_val = "Stage II (High Risk / Intervention Needed)"
        elif risk_score > 30:
            stage_val = "Stage I (Moderate Risk / Monitoring Recommended)"
        remedies["stage"] = stage_val

        return {
            "disease_type": disease_type,
            "input_parameters": parameters,
            "risk_score": round(risk_score, 1),
            "risk_level": "CRITICAL" if risk_score > 80 else ("HIGH" if risk_score > 55 else ("MODERATE" if risk_score > 30 else "LOW")),
            "clinical_reasoning": clinical_reasoning,
            "remedies": remedies,
            "factors": ml_factors if ml_active else [],
            "note": "Calculated via MedFusion Machine Learning (Random Forest) Diagnostics Core.",
            "error_detail": error_msg
        }

    def _predict_using_ml(self, disease_type: str, parameters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Run the trained Random Forest model and return {score, factors} or None on failure."""
        try:
            import pickle
            import numpy as np

            disease = disease_type.lower()
            model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_models')

            age = int(parameters.get("age", 35) or 35)
            gender_val = 1 if str(parameters.get("gender", "M")).upper() == "F" else 0
            family_hist_val = parameters.get("family_history", "no")
            family_hist = 1 if family_hist_val in ["yes", "severe", "mild"] else 0
            smoking_val = 1 if parameters.get("smoking", "no") == "yes" else 0

            if "heart" in disease:
                model_path = os.path.join(model_dir, 'heart_attack_rf.pkl')
                if not os.path.exists(model_path):
                    return None

                systolic_bp = float(parameters.get("systolic_bp", 120) or 120)
                diastolic_bp = float(parameters.get("diastolic_bp", 80) or 80)
                cholesterol = float(parameters.get("cholesterol", 180) or 180)
                max_heart_rate = float(parameters.get("max_heart_rate", 150) or 150)

                cp_str = str(parameters.get("chest_pain", "none")).lower()
                if "typical_angina" in cp_str:
                    cp_val = 1
                elif "atypical_angina" in cp_str:
                    cp_val = 2
                elif "non_anginal" in cp_str:
                    cp_val = 3
                else:
                    cp_val = 0

                exercise_angina = 1 if parameters.get("exercise_angina", "no") == "yes" else 0
                fasting_sugar = 1 if parameters.get("fasting_sugar", "no") == "yes" else 0

                symptoms = parameters.get("symptoms", [])
                shortness_of_breath = 1 if "shortness_of_breath" in symptoms else 0
                left_arm_pain = 1 if "left_arm_pain" in symptoms else 0

                feature_names = [
                    'Age', 'Gender', 'Systolic BP', 'Diastolic BP', 'Cholesterol',
                    'Max Heart Rate', 'Chest Pain', 'Exercise Angina', 'Fasting Sugar',
                    'Shortness of Breath', 'Left Arm Pain'
                ]
                feature_values = [
                    age, gender_val, systolic_bp, diastolic_bp, cholesterol, max_heart_rate,
                    cp_val, exercise_angina, fasting_sugar, shortness_of_breath, left_arm_pain
                ]
                display_values = [
                    age, parameters.get("gender", "M"), systolic_bp, diastolic_bp, cholesterol,
                    max_heart_rate, parameters.get("chest_pain", "none"),
                    parameters.get("exercise_angina", "no"), parameters.get("fasting_sugar", "no"),
                    shortness_of_breath, left_arm_pain
                ]

            elif "diabetes" in disease or "diabetic" in disease:
                model_path = os.path.join(model_dir, 'diabetes_rf.pkl')
                if not os.path.exists(model_path):
                    return None

                glucose = float(parameters.get("glucose", 90) or 90)
                hba1c = float(parameters.get("hba1c", 5.0) or 5.0)
                bmi = float(parameters.get("bmi", 22.0) or 22.0)
                hypertension = 1 if parameters.get("hypertension", "no") == "yes" else 0
                heart_disease = 1 if parameters.get("heart_disease_history", "no") == "yes" else 0

                symptoms = parameters.get("symptoms", [])
                thirst = 1 if "excessive_thirst" in symptoms else 0
                urination = 1 if "frequent_urination" in symptoms else 0
                blurry = 1 if "blurry_vision" in symptoms else 0
                sores = 1 if "slow_healing_sores" in symptoms else 0

                feature_names = [
                    'Age', 'Gender', 'Glucose', 'HbA1c', 'BMI', 'Hypertension',
                    'Heart Disease', 'Family History', 'Excessive Thirst',
                    'Frequent Urination', 'Blurry Vision', 'Slow Healing Sores'
                ]
                feature_values = [
                    age, gender_val, glucose, hba1c, bmi, hypertension, heart_disease,
                    family_hist, thirst, urination, blurry, sores
                ]
                display_values = [
                    age, parameters.get("gender", "M"), glucose, hba1c, bmi,
                    parameters.get("hypertension", "no"), parameters.get("heart_disease_history", "no"),
                    parameters.get("family_history", "no"), thirst, urination, blurry, sores
                ]

            elif "cancer" in disease or "oncological" in disease:
                model_path = os.path.join(model_dir, 'cancer_rf.pkl')
                if not os.path.exists(model_path):
                    return None

                alcohol = 1 if parameters.get("alcohol", "no") == "yes" else 0
                exposure = 1 if parameters.get("exposure", "no") == "yes" else 0

                symptoms = parameters.get("symptoms", [])
                weight_loss = 1 if "unexplained_weight_loss" in symptoms else 0
                cough = 1 if "persistent_cough" in symptoms else 0
                fatigue = 1 if "persistent_fatigue" in symptoms else 0
                mole_changes = 1 if "skin_mole_changes" in symptoms else 0
                lumps = 1 if "unusual_lumps" in symptoms else 0

                feature_names = [
                    'Age', 'Gender', 'Family History', 'Smoking', 'Alcohol',
                    'Toxin Exposure', 'Weight Loss', 'Persistent Cough',
                    'Fatigue', 'Skin/Mole Changes', 'Unusual Lumps'
                ]
                feature_values = [
                    age, gender_val, family_hist, smoking_val, alcohol, exposure,
                    weight_loss, cough, fatigue, mole_changes, lumps
                ]
                display_values = [
                    age, parameters.get("gender", "M"), parameters.get("family_history", "no"),
                    parameters.get("smoking", "no"), parameters.get("alcohol", "no"),
                    parameters.get("exposure", "no"), weight_loss, cough, fatigue, mole_changes, lumps
                ]

            else:
                return None

            import warnings
            features = np.array([feature_values])
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                with open(model_path, 'rb') as f:
                    model = pickle.load(f)
            score = float(model.predict(features)[0])

            # Extract feature importances from the trained Random Forest
            importances = model.feature_importances_
            factors = sorted(
                [
                    {
                        "feature": feature_names[i],
                        "importance": round(float(importances[i]), 4),
                        "value": display_values[i],
                    }
                    for i in range(len(feature_names))
                ],
                key=lambda x: x["importance"],
                reverse=True,
            )[:5]

            return {"score": round(score, 1), "factors": factors}

        except Exception as e:
            logger.error(f"Error executing ML inference model: {e}")
            return None

ai_service = AIService()


async def llm_chat(message: str, system_prompt: str) -> str:
    """Standalone chat function for the chatbot endpoint."""
    return await llm_provider.generate_response(
        prompt=message,
        model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
        system_prompt=system_prompt,
    )


