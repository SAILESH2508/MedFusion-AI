"""
Diet Planner views for MedFusion AI.
All views use the existing run_async() helper from views.py and the
existing llm_provider singleton from services.llm_provider.
"""
import json
import logging
import os
from datetime import date, timedelta

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import (
    Patient, PredictionRecord,
    DietPreference, MealPlan, MealCompletion, FavoriteMeal, ShoppingListItem,
    HealthActivity,
)
from .views import run_async
from .services.llm_provider import llm_provider

logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────

VALID_REGIONS = {c[0] for c in [
    ('Tamil Nadu', ''), ('Kerala', ''), ('Karnataka', ''), ('Andhra Pradesh', ''),
    ('Telangana', ''), ('Maharashtra', ''), ('North Indian', ''), ('Other', ''),
]}
VALID_DIET_TYPES = {'vegetarian', 'non_vegetarian', 'vegan'}
VALID_CALORIE = {'low', 'moderate', 'high'}
VALID_BUDGET = {'low', 'moderate', 'high'}
VALID_MEAL_TYPES = {'breakfast', 'snack1', 'lunch', 'snack2', 'dinner'}


def _get_patient(user):
    """Return Patient for a logged-in patient user, or auto-create if missing."""
    if not user or not user.is_authenticated or user.role != 'Patient':
        return None
    patient = Patient.objects.filter(user=user).first()
    if not patient:
        parts = (user.full_name or 'Patient').split()
        first_name = parts[0] if parts else 'Patient'
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ''
        patient = Patient.objects.create(user=user, first_name=first_name, last_name=last_name)
    return patient


def _serialize_pref(pref):
    allergies = json.loads(pref.food_allergies or '[]')
    dislikes = json.loads(pref.food_dislikes or '[]')
    cal_target = 2000
    if pref.calorie_preference == 'low':
        cal_target = 1600
    elif pref.calorie_preference == 'high':
        cal_target = 2400

    return {
        "region": pref.region,
        "regional_preference": pref.region,
        "diet_type": pref.diet_type,
        "food_allergies": allergies,
        "allergies": allergies,
        "food_dislikes": dislikes,
        "dislikes": dislikes,
        "meals_per_day": pref.meals_per_day,
        "calorie_preference": pref.calorie_preference,
        "calorie_target": cal_target,
        "budget": pref.budget,
        "health_goal": "Maintenance",
        "updated_at": pref.updated_at.isoformat(),
    }


def _build_health_context(patient):
    """
    Build a short, safe health context string from existing prediction records.
    Sends NO raw biomarkers or personal identifiers to the LLM.
    """
    hints = []
    recent = PredictionRecord.objects.filter(
        patient=patient, risk_level__in=['HIGH', 'CRITICAL']
    ).order_by('-created_at')[:5]

    disease_guidance = {
        'Heart Attack': 'low sodium, low saturated fat, heart-healthy',
        'Diabetes': 'low glycemic index, controlled carbohydrates, high fibre',
        'Cancer Screening': 'antioxidant-rich, plant-based, limit processed food',
    }
    seen = set()
    for r in recent:
        key = r.disease_type
        if key in disease_guidance and key not in seen:
            hints.append(disease_guidance[key])
            seen.add(key)

    return '; '.join(hints) if hints else 'balanced healthy diet'


MEAL_SLOTS_MAP = {1: ['lunch'], 2: ['breakfast', 'dinner'],
                  3: ['breakfast', 'lunch', 'dinner'],
                  4: ['breakfast', 'lunch', 'snack2', 'dinner'],
                  5: ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner']}

REGION_FOOD_HINTS = {
    'Tamil Nadu': 'idli, dosa, ragi dosa, adai, vegetable kootu, sambar, rasam, poriyal, sundal, red rice, millet dishes, curd rice',
    'Kerala': 'puttu, appam, kerala rice, fish curry (for non-veg), avial, thoran, kanji, ela sadya items',
    'Karnataka': 'ragi mudde, bisibelebath, akki roti, vangi bath, jolada roti, kosambari',
    'Andhra Pradesh': 'pesarattu, gongura rice, pulihora, gutti vankaya, pesara pappu',
    'Telangana': 'jonna roti, sajja roti, sarva pindi, bagara baingan, mirchi ka salan',
    'Maharashtra': 'poha, thalipeeth, bhakri, dal baati, puran poli, pav bhaji (health version)',
    'North Indian': 'dal roti, bajra roti, mixed vegetable sabzi, rajma, chana, makki ki roti, moong dal',
    'Other': 'balanced regional foods with whole grains, pulses and vegetables',
}


async def _generate_meal_plan_llm(region, diet_type, all_allergies, meals_per_day,
                                   calorie_preference, health_context):
    slots = MEAL_SLOTS_MAP.get(meals_per_day, MEAL_SLOTS_MAP[3])
    food_hints = REGION_FOOD_HINTS.get(region, REGION_FOOD_HINTS['Other'])
    allergy_str = ', '.join(all_allergies) if all_allergies else 'none'
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    prompt = f"""You are a regional Indian nutritionist. Generate a 7-day meal plan.

Region: {region}
Diet type: {diet_type}
Meals per day: {meals_per_day} (slots: {', '.join(slots)})
Calorie preference: {calorie_preference}
Food allergies (NEVER include these): {allergy_str}
Health context: {health_context}
Regional food examples to prioritize: {food_hints}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{{
  "monday": {{{', '.join(f'"{s}": {{"name":"...","portion":"...","calories":0,"protein":"...","carbs":"...","fat":"...","why":"...","alternatives":["...","..."]}}' for s in slots)}}},
  "tuesday": {{...}},
  "wednesday": {{...}},
  "thursday": {{...}},
  "friday": {{...}},
  "saturday": {{...}},
  "sunday": {{...}}
}}

Rules:
- Use authentic {region} foods
- {diet_type} only — never include prohibited ingredients
- Keep portions realistic and suitable for {calorie_preference} calorie intake
- Each meal must have: name, portion, calories (integer), protein, carbs, fat, why, alternatives (list of 2)
- Return ONLY valid JSON"""

    try:
        response = await llm_provider.generate_response(
            prompt=prompt,
            system_prompt="You are a certified Indian regional nutritionist. Return only valid JSON meal plans.",
            timeout=90.0,
        )
        # Strip markdown if present
        text = response.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[-1]
            text = text.rsplit('```', 1)[0]
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except Exception as e:
        logger.error(f"Meal plan LLM generation failed: {e}")

    # High-quality diverse regional clinical fallback schedule
    return _get_fallback_meal_plan(region, diet_type, slots, days)


def _get_fallback_meal_plan(region, diet_type, slots, days):
    """
    Returns a clinical, diverse 7-day regional Indian meal plan with distinct authentic meals for every day and slot.
    """
    is_non_veg = diet_type == 'non_vegetarian'

    south_schedule = {
        'monday': {
            'breakfast': {"name": "Idli with Vegetable Sambar", "portion": "3 idlis + 1 bowl sambar", "calories": 280, "protein": "9g", "carbs": "50g", "fat": "4g", "why": "Fermented rice & lentils provide easy digestion and probiotic gut benefits", "alternatives": ["Ragi Dosa", "Ven Pongal"]},
            'snack1': {"name": "Sprouted Moong Salad", "portion": "1 cup", "calories": 130, "protein": "8g", "carbs": "22g", "fat": "1g", "why": "Mid-morning raw antioxidant and plant enzyme intake", "alternatives": ["Roasted Chana", "Cucumber Slices"]},
            'lunch': {"name": "Grilled Fish Curry with Brown Rice" if is_non_veg else "Brown Rice with Sambar & Spinach Kootu", "portion": "1 fillet + 1 cup rice" if is_non_veg else "1 cup rice + 1 cup kootu", "calories": 420, "protein": "26g" if is_non_veg else "14g", "carbs": "55g" if is_non_veg else "72g", "fat": "8g", "why": "Rich in omega-3 and iron-dense leafy greens" if is_non_veg else "High-fiber grains with iron-dense leafy greens", "alternatives": ["Millet Curd Rice", "Lemon Sevai with Dal"]},
            'snack2': {"name": "Sundal (Seasoned Chickpeas)", "portion": "1 small cup", "calories": 160, "protein": "7g", "carbs": "24g", "fat": "4g", "why": "Low-glycemic legume snack for sustained afternoon alertness", "alternatives": ["Roasted Makhana", "Green Tea"]},
            'dinner': {"name": "Millet Dosa with Tomato Chutney & Steamed Veggies", "portion": "2 dosas + chutney", "calories": 320, "protein": "10g", "carbs": "56g", "fat": "6g", "why": "Low GI dinner promoting stable nocturnal blood glucose levels", "alternatives": ["Ragi Adai", "Oats Vegetable Porridge"]},
        },
        'tuesday': {
            'breakfast': {"name": "Pesarattu (Green Gram Dosa) with Ginger Pachadi", "portion": "2 pesarattu", "calories": 290, "protein": "13g", "carbs": "46g", "fat": "6g", "why": "Whole moong provides slow-digesting complex carbs and folates", "alternatives": ["Oats Idli", "Vegetable Rava Upma"]},
            'snack1': {"name": "Pomegranate & Papaya Fruit Cup", "portion": "1 cup", "calories": 110, "protein": "2g", "carbs": "26g", "fat": "1g", "why": "Rich in papain digestive enzymes and cardiac polyphenols", "alternatives": ["Guava Slices", "Coconut Water"]},
            'lunch': {"name": "Grilled Herb Chicken Breast with Red Rice" if is_non_veg else "Red Rice with More Kuzhambu & Cabbage Poriyal", "portion": "120g chicken + 1 cup rice" if is_non_veg else "1 cup rice + 1 bowl kuzhambu", "calories": 440, "protein": "28g" if is_non_veg else "13g", "carbs": "52g" if is_non_veg else "75g", "fat": "9g", "why": "Lean protein with selenium" if is_non_veg else "Probiotic buttermilk curry with cruciferous vegetable fiber", "alternatives": ["Tomato Rice with Dal", "Vegetable Khichdi"]},
            'snack2': {"name": "Roasted Makhana (Fox Nuts)", "portion": "1 bowl", "calories": 130, "protein": "4g", "carbs": "22g", "fat": "3g", "why": "Anti-inflammatory, low-sodium light whole food", "alternatives": ["Boiled Peanuts", "Herbal Chai"]},
            'dinner': {"name": "Soft Phulkas with Mixed Dal Tadka & Ridge Gourd", "portion": "2 phulkas + 1 cup dal", "calories": 340, "protein": "14g", "carbs": "58g", "fat": "6g", "why": "Complete amino acid profile with easily digestible dietary fiber", "alternatives": ["Wheat Dosa", "Moong Soup with Toast"]},
        },
        'wednesday': {
            'breakfast': {"name": "Vegetable Ragi Semiya with Mint Chutney", "portion": "1 plate", "calories": 270, "protein": "8g", "carbs": "48g", "fat": "5g", "why": "Finger millet is exceptionally rich in natural bone calcium", "alternatives": ["Poha with Veggies", "Idli with Rasam"]},
            'snack1': {"name": "Tender Coconut Water with Soaked Chia", "portion": "1 glass (250ml)", "calories": 90, "protein": "2g", "carbs": "18g", "fat": "1g", "why": "Replenishes potassium, magnesium, and hydration balance", "alternatives": ["Buttermilk with Mint", "Amla Juice"]},
            'lunch': {"name": "Steamed Egg White Curry with Foxtail Millet" if is_non_veg else "Foxtail Millet Khichdi with Beans Poriyal", "portion": "2 egg whites + 1 cup millet" if is_non_veg else "1 plate khichdi", "calories": 410, "protein": "22g" if is_non_veg else "15g", "carbs": "60g" if is_non_veg else "68g", "fat": "7g", "why": "High bioavailability protein and millet-lentil prebiotic balance", "alternatives": ["Curd Rice with Pomegranate", "Vegetable Bisi Bele Bath"]},
            'snack2': {"name": "Steamed Sweet Corn with Lemon Pepper", "portion": "1 cup", "calories": 140, "protein": "4g", "carbs": "28g", "fat": "2g", "why": "Carotenoids lutein and zeaxanthin protecting retinal health", "alternatives": ["Roasted Chana", "Mixed Nut Trail"]},
            'dinner': {"name": "Adai (Multi-Lentil Crepe) with Avial", "portion": "2 adai + avial", "calories": 350, "protein": "16g", "carbs": "54g", "fat": "7g", "why": "Dense multi-pulse protein source with assorted vegetable vitamins", "alternatives": ["Millet Roti", "Vegetable Daliya"]},
        },
        'thursday': {
            'breakfast': {"name": "Kanchipuram Steamed Idli with Drumstick Sambar", "portion": "3 idlis + sambar", "calories": 280, "protein": "9g", "carbs": "52g", "fat": "4g", "why": "Cumin and ginger infused batter promotes gastric enzyme secretion", "alternatives": ["Barnyard Millet Upma", "Poha"]},
            'snack1': {"name": "Cucumber & Carrot Sticks with Spiced Curd Dip", "portion": "1 plate", "calories": 95, "protein": "3g", "carbs": "15g", "fat": "2g", "why": "Crucial alkaline raw hydration and dietary beta-carotene", "alternatives": ["Apple Slices", "Sprouted Methi Chaat"]},
            'lunch': {"name": "Kerala Fish Moilee with Red Matta Rice" if is_non_veg else "Brown Rice with Raw Banana Kootu & Pepper Rasam", "portion": "1 portion fish + rice" if is_non_veg else "1 cup rice + 1 cup kootu", "calories": 430, "protein": "25g" if is_non_veg else "12g", "carbs": "58g" if is_non_veg else "74g", "fat": "9g", "why": "Healthy fats & piperine from pepper promoting bioavailability", "alternatives": ["Millet Sambar Rice", "Vegetable Pulao with Raita"]},
            'snack2': {"name": "Masala Roasted Chickpeas", "portion": "1 small cup", "calories": 150, "protein": "7g", "carbs": "24g", "fat": "3g", "why": "Steady energy release curbing evening carb cravings", "alternatives": ["Roasted Peanuts", "Ginger Tea"]},
            'dinner': {"name": "Soft Phulkas (2) with Toor Dal & Baingan Bharta", "portion": "2 rotis + sabzi", "calories": 330, "protein": "13g", "carbs": "56g", "fat": "6g", "why": "Fiber-dense, light evening meal reducing gastroesophageal reflux", "alternatives": ["Ragi Dosa", "Moong Dal Cheela"]},
        },
        'friday': {
            'breakfast': {"name": "Multigrain Vegetable Dosa with Tomato Chutney", "portion": "2 dosas", "calories": 300, "protein": "10g", "carbs": "52g", "fat": "6g", "why": "Combined grains lower the overall postprandial glycemic response", "alternatives": ["Idli with Sambar", "Vegetable Semiya"]},
            'snack1': {"name": "Fresh Orange or Sweet Lime (Mosambi)", "portion": "1 whole fruit", "calories": 80, "protein": "1g", "carbs": "20g", "fat": "0g", "why": "High vitamin C and natural citrus bioflavonoids", "alternatives": ["Amla Juice", "Watermelon Slices"]},
            'lunch': {"name": "Egg Bhurji (2 eggs) with Phulka & Tomato Dal" if is_non_veg else "Lemon Rice with Chana Dal & Snake Gourd Kootu", "portion": "bhurji + 2 phulkas" if is_non_veg else "1 cup rice + kootu", "calories": 430, "protein": "20g" if is_non_veg else "13g", "carbs": "50g" if is_non_veg else "72g", "fat": "11g", "why": "High-biological value egg protein" if is_non_veg else "High-water-content gourd with cleansing turmeric and lemon", "alternatives": ["Brown Rice Sambar", "Vegetable Biryani with Soy"]},
            'snack2': {"name": "Pumpkin & Sunflower Seed Trail", "portion": "2 tablespoons", "calories": 140, "protein": "5g", "carbs": "10g", "fat": "10g", "why": "Natural zinc and magnesium for cellular restoration", "alternatives": ["Boiled Sundal", "Sprout Chaat"]},
            'dinner': {"name": "Brown Rice Kanji (Porridge) with Steamed Methi Moong", "portion": "1 large bowl", "calories": 310, "protein": "12g", "carbs": "58g", "fat": "4g", "why": "Easily assimilated warm porridge for restorative nocturnal sleep", "alternatives": ["Oats Khichdi", "Jowar Roti"]},
        },
        'saturday': {
            'breakfast': {"name": "Oats & Rava Vegetable Upma with Roasted Cashews", "portion": "1 bowl", "calories": 290, "protein": "9g", "carbs": "48g", "fat": "7g", "why": "Beta-glucan soluble fiber lowers circulating LDL cholesterol", "alternatives": ["Idli with Podi (mild)", "Pesarattu"]},
            'snack1': {"name": "Guava Slices with Rock Salt", "portion": "1 whole fruit", "calories": 90, "protein": "3g", "carbs": "20g", "fat": "1g", "why": "Pectin-dense superfood supporting colon motility", "alternatives": ["Muskmelon Cubes", "Green Tea"]},
            'lunch': {"name": "Grilled Fish Fillet with Steamed Rice & Rasam" if is_non_veg else "Vegetable Bisi Bele Bath with Cucumber Raita", "portion": "1 fillet + rice" if is_non_veg else "1 plate + raita", "calories": 450, "protein": "26g" if is_non_veg else "15g", "carbs": "54g" if is_non_veg else "76g", "fat": "10g", "why": "Cardioprotective polyunsaturated fats" if is_non_veg else "One-pot nutritional completeness with cooling probiotic raita", "alternatives": ["Curd Rice with Dal", "Millet Kootu Rice"]},
            'snack2': {"name": "Boiled Black Chana Sundal", "portion": "1 cup", "calories": 160, "protein": "8g", "carbs": "25g", "fat": "3g", "why": "Iron-dense whole legumes with sustained glucose release", "alternatives": ["Roasted Makhana", "Sprouted Salad"]},
            'dinner': {"name": "Palak Phulkas with Paneer / Tofu Bhurji", "portion": "2 rotis + 100g bhurji", "calories": 360, "protein": "18g", "carbs": "50g", "fat": "10g", "why": "High protein content supporting lean muscle preservation", "alternatives": ["Methi Thepla with Curd", "Lentil Soup with Toast"]},
        },
        'sunday': {
            'breakfast': {"name": "Steamed Puttu with Kadala Curry", "portion": "1 puttu + 1 bowl curry", "calories": 340, "protein": "12g", "carbs": "58g", "fat": "6g", "why": "Traditional steamed heritage meal rich in complex carbs & iron", "alternatives": ["Appam with Vegetable Stew", "Idli Sambar"]},
            'snack1': {"name": "Sliced Papaya with Lime", "portion": "1 cup", "calories": 90, "protein": "1g", "carbs": "22g", "fat": "0g", "why": "Gentle digestive aid with immune-supportive Vitamin A", "alternatives": ["Coconut Water", "Apple"]},
            'lunch': {"name": "Chicken Curry with Brown Rice & Cucumber Salad" if is_non_veg else "Curd Rice with Pomegranate & Cluster Beans Poriyal", "portion": "1 serving chicken + rice" if is_non_veg else "1 cup rice + poriyal", "calories": 430, "protein": "27g" if is_non_veg else "12g", "carbs": "50g" if is_non_veg else "70g", "fat": "9g", "why": "Lean animal protein and zinc" if is_non_veg else "Active lactobacillus cultures with low-GI cluster beans", "alternatives": ["Brown Rice Thali", "Sambar Rice with Salad"]},
            'snack2': {"name": "Handful of Soaked Almonds & Walnuts", "portion": "10 almonds + 2 walnuts", "calories": 160, "protein": "5g", "carbs": "6g", "fat": "14g", "why": "Neuroprotective omega-3 and alpha-tocopherol antioxidants", "alternatives": ["Roasted Chana", "Sundal"]},
            'dinner': {"name": "Vegetable Dalia (Broken Wheat) Khichdi with Curd", "portion": "1 plate", "calories": 320, "protein": "12g", "carbs": "56g", "fat": "5g", "why": "Light, calming end-of-week dinner optimizing sleep cycle", "alternatives": ["Moong Dal Khichdi", "Ragi Roti with Sabzi"]},
        },
    }

    full_plan = {}
    for day in days:
        full_plan[day] = {}
        day_meals = south_schedule.get(day, south_schedule['monday'])
        for slot in slots:
            if slot in day_meals:
                full_plan[day][slot] = day_meals[slot]
            else:
                full_plan[day][slot] = day_meals.get('lunch', list(day_meals.values())[0])
    return full_plan


def _scan_allergens(plan_data, all_allergies):
    """Return True if any allergen word appears in any meal name in the plan."""
    if not all_allergies:
        return False
    plan_str = json.dumps(plan_data).lower()
    for allergen in all_allergies:
        if allergen.lower() in plan_str:
            return True
    return False


# ── Diet Preference Views ──────────────────────────────────────────────────

@api_view(['GET', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def diet_preferences(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    if request.method == 'GET':
        pref, _ = DietPreference.objects.get_or_create(
            patient=patient,
            defaults={'region': 'Tamil Nadu', 'diet_type': 'vegetarian'}
        )
        data_out = _serialize_pref(pref)
        return JsonResponse({"preferences": data_out, **data_out}, status=200)

    # PUT or POST
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    pref, _ = DietPreference.objects.get_or_create(patient=patient)

    # Support both frontend key names and backend key names
    region_val = data.get('region') or data.get('regional_preference')
    if region_val:
        if region_val in VALID_REGIONS:
            pref.region = region_val

    if 'diet_type' in data:
        if data['diet_type'] in VALID_DIET_TYPES:
            pref.diet_type = data['diet_type']

    allergies_val = data.get('food_allergies') if 'food_allergies' in data else data.get('allergies')
    if allergies_val is not None:
        pref.food_allergies = json.dumps(allergies_val if isinstance(allergies_val, list) else [])

    dislikes_val = data.get('food_dislikes') if 'food_dislikes' in data else data.get('dislikes')
    if dislikes_val is not None:
        pref.food_dislikes = json.dumps(dislikes_val if isinstance(dislikes_val, list) else [])

    if 'meals_per_day' in data:
        try:
            mpd = int(data['meals_per_day'])
            if 1 <= mpd <= 5:
                pref.meals_per_day = mpd
        except (ValueError, TypeError):
            pass

    cal_val = data.get('calorie_preference')
    if not cal_val and 'calorie_target' in data:
        try:
            ct = int(data['calorie_target'])
            cal_val = 'low' if ct < 1800 else ('high' if ct > 2200 else 'moderate')
        except Exception:
            cal_val = 'moderate'

    if cal_val and cal_val in VALID_CALORIE:
        pref.calorie_preference = cal_val

    if 'budget' in data and data['budget'] in VALID_BUDGET:
        pref.budget = data['budget']

    pref.save()
    data_out = _serialize_pref(pref)
    return JsonResponse({"preferences": data_out, **data_out}, status=200)


# ── Meal Plan Views ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def generate_meal_plan(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    pref, _ = DietPreference.objects.get_or_create(
        patient=patient,
        defaults={'region': 'Tamil Nadu', 'diet_type': 'vegetarian'}
    )

    # Merge allergies from diet preference + medical profile
    diet_allergies = json.loads(pref.food_allergies or '[]')
    medical_allergies = json.loads(patient.allergies or '[]')
    all_allergies = list(set(diet_allergies + medical_allergies))

    health_context = _build_health_context(patient)

    plan_data = run_async(_generate_meal_plan_llm(
        region=pref.region,
        diet_type=pref.diet_type,
        all_allergies=all_allergies,
        meals_per_day=pref.meals_per_day,
        calorie_preference=pref.calorie_preference,
        health_context=health_context,
    ))

    # Safety: reject plan if allergen found
    if _scan_allergens(plan_data, all_allergies):
        logger.warning("Allergen detected in generated meal plan — returning fallback.")
        slots = MEAL_SLOTS_MAP.get(pref.meals_per_day, MEAL_SLOTS_MAP[3])
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        plan_data = _get_fallback_meal_plan(pref.region, pref.diet_type, slots, days)

    # Deactivate previous plans for this week
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    MealPlan.objects.filter(patient=patient, week_start=week_start).update(is_active=False)

    plan = MealPlan.objects.create(
        patient=patient,
        week_start=week_start,
        plan_data=json.dumps(plan_data),
        is_active=True,
    )

    return JsonResponse({
        "plan_id": plan.id,
        "week_start": plan.week_start.isoformat(),
        "plan": plan_data,
        "weekly_plan": plan_data,
        "disclaimer": "This meal plan is AI-generated based on your regional preferences and health profile. It is not a substitute for advice from a registered dietitian or your doctor.",
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_meal_plan(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    plan = MealPlan.objects.filter(patient=patient, is_active=True, week_start=week_start).first()
    if not plan:
        return JsonResponse({"plan": None, "weekly_plan": None, "week_start": week_start.isoformat()}, status=200)

    # Get this week's completions
    completions = MealCompletion.objects.filter(
        patient=patient,
        date__gte=week_start,
        date__lte=week_start + timedelta(days=6),
    ).values('date', 'meal_type', 'completed')

    completed_set = {
        (str(c['date']), c['meal_type']): c['completed']
        for c in completions
    }

    plan_obj = json.loads(plan.plan_data)
    return JsonResponse({
        "plan_id": plan.id,
        "week_start": plan.week_start.isoformat(),
        "plan": plan_obj,
        "weekly_plan": plan_obj,
        "completions": {f"{k[0]}_{k[1]}": v for k, v in completed_set.items()},
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def swap_meal(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    meal_type = data.get('meal_type', '')
    current_meal = data.get('current_meal_name', '')
    if not meal_type or not current_meal:
        return JsonResponse({"error": "meal_type and current_meal_name are required"}, status=400)

    pref, _ = DietPreference.objects.get_or_create(
        patient=patient,
        defaults={'region': 'Tamil Nadu', 'diet_type': 'vegetarian'}
    )
    diet_allergies = json.loads(pref.food_allergies or '[]')
    medical_allergies = json.loads(patient.allergies or '[]')
    all_allergies = list(set(diet_allergies + medical_allergies))
    allergy_str = ', '.join(all_allergies) if all_allergies else 'none'

    prompt = f"""Suggest 3 culturally similar alternatives to "{current_meal}" for a {meal_type} meal.
Region: {pref.region}, Diet: {pref.diet_type}, Allergies to avoid: {allergy_str}.
Return ONLY a JSON array of 3 meal objects: [{{"name":"...","portion":"...","calories":0,"protein":"...","carbs":"...","fat":"...","why":"..."}}]
No markdown, no explanation."""

    alternatives = []
    try:
        response = run_async(llm_provider.generate_response(prompt=prompt))
        text = response.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[-1].rsplit('```', 1)[0]
        start = text.find('[')
        end = text.rfind(']') + 1
        if start != -1 and end > start:
            parsed = json.loads(text[start:end])
            # Scan alternatives for allergens too
            if not _scan_allergens(parsed, all_allergies):
                alternatives = parsed[:3]
    except Exception as e:
        logger.error(f"Swap meal LLM failed: {e}")

    if not alternatives:
        alternatives = [
            {"name": "Ragi Dosa", "portion": "2 dosas", "calories": 180,
             "protein": "6g", "carbs": "32g", "fat": "3g", "why": "Rich in calcium and fibre"},
            {"name": "Adai", "portion": "2 adai", "calories": 200,
             "protein": "9g", "carbs": "35g", "fat": "4g", "why": "High protein lentil crepe"},
            {"name": "Idli with Chutney", "portion": "3 idli", "calories": 150,
             "protein": "5g", "carbs": "30g", "fat": "2g", "why": "Light and easy to digest"},
        ]

    return JsonResponse({"alternatives": alternatives}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def meal_complete(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    meal_date_str = data.get('date', str(date.today()))
    meal_type = data.get('meal_type', '')
    meal_name = data.get('meal_name', '')
    completed = bool(data.get('completed', True))

    if meal_type not in VALID_MEAL_TYPES:
        return JsonResponse({"error": f"Invalid meal_type. Valid: {sorted(VALID_MEAL_TYPES)}"}, status=400)

    try:
        meal_date = date.fromisoformat(meal_date_str)
    except ValueError:
        return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    completion, _ = MealCompletion.objects.update_or_create(
        patient=patient,
        date=meal_date,
        meal_type=meal_type,
        defaults={
            'meal_name': meal_name,
            'completed': completed,
            'completed_at': timezone.now() if completed else None,
        }
    )

    # If completed, award garden points (avoid duplicate points for same slot)
    if completed:
        already_awarded = HealthActivity.objects.filter(
            patient=patient,
            activity_type='meal_completed',
            logged_at__date=meal_date,
            note=f"{meal_type}:{meal_name[:50]}",
        ).exists()
        if not already_awarded:
            from .garden_views import _award_garden_activity
            _award_garden_activity(patient, 'meal_completed', note=f"{meal_type}:{meal_name[:50]}")

    return JsonResponse({
        "date": str(meal_date),
        "meal_type": meal_type,
        "completed": completed,
    }, status=200)


# ── Favorites & Shopping List ──────────────────────────────────────────────

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def favorites(request, fav_id=None):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    if request.method == 'GET':
        favs = list(FavoriteMeal.objects.filter(patient=patient).values('id', 'meal_data', 'added_at'))
        for f in favs:
            try:
                f['meal_data'] = json.loads(f['meal_data'])
            except Exception:
                pass
            f['added_at'] = str(f['added_at'])
        return JsonResponse({"favorites": favs}, status=200)

    elif request.method == 'DELETE':
        id_to_del = fav_id or request.GET.get('id')
        if not id_to_del:
            try:
                b = json.loads(request.body or '{}')
                id_to_del = b.get('id')
            except Exception:
                pass
        if id_to_del:
            FavoriteMeal.objects.filter(id=id_to_del, patient=patient).delete()
            return JsonResponse({"success": True}, status=200)
        return JsonResponse({"error": "id is required"}, status=400)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    meal_data = data.get('meal_data')
    if not meal_data or not isinstance(meal_data, dict):
        if data.get('name') or data.get('meal_name'):
            meal_data = {
                'name': data.get('name') or data.get('meal_name'),
                'portion': data.get('portion', ''),
                'calories': data.get('calories', 0),
                'protein': data.get('protein', ''),
                'carbs': data.get('carbs', ''),
                'fat': data.get('fat', ''),
                'why': data.get('why', ''),
            }
        else:
            return JsonResponse({"error": "meal_data (object) is required"}, status=400)

    fav = FavoriteMeal.objects.create(patient=patient, meal_data=json.dumps(meal_data))
    return JsonResponse({"id": fav.id, "meal_data": meal_data, "added_at": str(fav.added_at)}, status=201)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def shopping_list(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    if request.method == 'GET':
        items = list(ShoppingListItem.objects.filter(patient=patient).values(
            'id', 'ingredient', 'quantity', 'checked', 'added_at'))
        for i in items:
            i['added_at'] = str(i['added_at'])
        return JsonResponse({"items": items}, status=200)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    ingredient = str(data.get('ingredient', '')).strip()
    if not ingredient:
        return JsonResponse({"error": "ingredient is required"}, status=400)

    item = ShoppingListItem.objects.create(
        patient=patient,
        ingredient=ingredient,
        quantity=str(data.get('quantity', '')).strip(),
    )
    return JsonResponse({"id": item.id, "ingredient": item.ingredient, "quantity": item.quantity}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def shopping_list_item(request, item_id):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    try:
        item = ShoppingListItem.objects.get(id=item_id, patient=patient)
    except ShoppingListItem.DoesNotExist:
        return JsonResponse({"error": "Item not found."}, status=404)

    if request.method == 'DELETE':
        item.delete()
        return JsonResponse({"deleted": True}, status=200)

    # PATCH — toggle checked
    item.checked = not item.checked
    item.save(update_fields=['checked'])
    return JsonResponse({"id": item.id, "checked": item.checked}, status=200)
