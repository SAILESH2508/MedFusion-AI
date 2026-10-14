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
    HealthActivity, GardenProgress, POINTS_MAP,
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
    """Return Patient for a logged-in patient user, or None."""
    if user.role != 'Patient':
        return None
    try:
        return Patient.objects.get(user=user)
    except Patient.DoesNotExist:
        return None


def _serialize_pref(pref):
    return {
        "region": pref.region,
        "diet_type": pref.diet_type,
        "food_allergies": json.loads(pref.food_allergies or '[]'),
        "food_dislikes": json.loads(pref.food_dislikes or '[]'),
        "meals_per_day": pref.meals_per_day,
        "calorie_preference": pref.calorie_preference,
        "budget": pref.budget,
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

    # Deterministic fallback
    fallback_meal = {"name": "Idli with Sambar", "portion": "3 idli + 1 bowl",
                     "calories": 250, "protein": "8g", "carbs": "48g", "fat": "3g",
                     "why": "Light, nutritious and easy to digest",
                     "alternatives": ["Ragi Dosa", "Adai"]}
    return {day: {slot: fallback_meal for slot in slots} for day in days}


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

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
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
        return JsonResponse({"preferences": _serialize_pref(pref)}, status=200)

    # PUT
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    pref, _ = DietPreference.objects.get_or_create(patient=patient)

    if 'region' in data:
        if data['region'] not in VALID_REGIONS:
            return JsonResponse({"error": f"Invalid region. Valid: {sorted(VALID_REGIONS)}"}, status=400)
        pref.region = data['region']
    if 'diet_type' in data:
        if data['diet_type'] not in VALID_DIET_TYPES:
            return JsonResponse({"error": f"Invalid diet_type. Valid: {sorted(VALID_DIET_TYPES)}"}, status=400)
        pref.diet_type = data['diet_type']
    if 'food_allergies' in data:
        pref.food_allergies = json.dumps(data['food_allergies'] if isinstance(data['food_allergies'], list) else [])
    if 'food_dislikes' in data:
        pref.food_dislikes = json.dumps(data['food_dislikes'] if isinstance(data['food_dislikes'], list) else [])
    if 'meals_per_day' in data:
        try:
            mpd = int(data['meals_per_day'])
            if mpd < 1 or mpd > 5:
                return JsonResponse({"error": "meals_per_day must be 1-5"}, status=400)
            pref.meals_per_day = mpd
        except (ValueError, TypeError):
            return JsonResponse({"error": "meals_per_day must be an integer"}, status=400)
    if 'calorie_preference' in data:
        if data['calorie_preference'] not in VALID_CALORIE:
            return JsonResponse({"error": f"Invalid calorie_preference. Valid: {sorted(VALID_CALORIE)}"}, status=400)
        pref.calorie_preference = data['calorie_preference']
    if 'budget' in data:
        if data['budget'] not in VALID_BUDGET:
            return JsonResponse({"error": f"Invalid budget. Valid: {sorted(VALID_BUDGET)}"}, status=400)
        pref.budget = data['budget']

    pref.save()
    return JsonResponse({"preferences": _serialize_pref(pref)}, status=200)


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
        safe_meal = {"name": "Plain Rice with Dal", "portion": "1 cup rice + 1 bowl dal",
                     "calories": 300, "protein": "12g", "carbs": "55g", "fat": "4g",
                     "why": "Safe, allergen-free meal", "alternatives": ["Ragi Porridge", "Vegetable Upma"]}
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        plan_data = {day: {slot: safe_meal for slot in slots} for day in days}

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
        return JsonResponse({"plan": None, "week_start": week_start.isoformat()}, status=200)

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

    return JsonResponse({
        "plan_id": plan.id,
        "week_start": plan.week_start.isoformat(),
        "plan": json.loads(plan.plan_data),
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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def favorites(request):
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

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    meal_data = data.get('meal_data')
    if not meal_data or not isinstance(meal_data, dict):
        return JsonResponse({"error": "meal_data (object) is required"}, status=400)

    fav = FavoriteMeal.objects.create(patient=patient, meal_data=json.dumps(meal_data))
    return JsonResponse({"id": fav.id, "added_at": str(fav.added_at)}, status=201)


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
