"""
Health Garden views for MedFusion AI.
"""
import json
import logging
from datetime import date, timedelta

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import Patient, HealthActivity, GardenProgress, POINTS_MAP, ACTIVITY_TYPE_CHOICES
from .diet_views import _get_patient

logger = logging.getLogger(__name__)

VALID_ACTIVITY_TYPES = {c[0] for c in ACTIVITY_TYPE_CHOICES}

# ── Garden stage logic ─────────────────────────────────────────────────────

def get_garden_stage(total_points):
    if total_points < 50:
        return {"stage": 0, "name": "Seed", "icon": "seed", "next_at": 50}
    elif total_points < 150:
        return {"stage": 1, "name": "Sprout", "icon": "sprout", "next_at": 150}
    elif total_points < 300:
        return {"stage": 2, "name": "Small Plant", "icon": "plant", "next_at": 300}
    elif total_points < 500:
        return {"stage": 3, "name": "Growing Plant", "icon": "tree", "next_at": 500}
    elif total_points < 750:
        return {"stage": 4, "name": "Flowering Plant", "icon": "flower", "next_at": 750}
    elif total_points < 1000:
        return {"stage": 5, "name": "Mature Plant", "icon": "bloom", "next_at": 1000}
    else:
        return {"stage": 6, "name": "Personal Health Garden", "icon": "garden", "next_at": None}


# ── Achievement logic ──────────────────────────────────────────────────────

ACHIEVEMENTS_DEF = [
    {"id": "first_step",      "name": "First Step",          "icon": "footprints",
     "desc": "Your first health check-in"},
    {"id": "three_day",       "name": "3-Day Growth",         "icon": "sprout",
     "desc": "Maintained a 3-day streak"},
    {"id": "one_week",        "name": "One Week Strong",      "icon": "leaf",
     "desc": "Maintained a 7-day streak"},
    {"id": "consistency",     "name": "Consistency Builder",  "icon": "flame",
     "desc": "Maintained a 30-day streak"},
    {"id": "med_champ",       "name": "Medication Champion",  "icon": "pill",
     "desc": "Logged 50+ medication points"},
    {"id": "healthy_plate",   "name": "Healthy Plate",        "icon": "utensils",
     "desc": "Completed 20 meals"},
    {"id": "active_bloom",    "name": "Active Bloom",         "icon": "activity",
     "desc": "Logged 10 activity sessions"},
    {"id": "garden_keeper",   "name": "Garden Keeper",        "icon": "shield-check",
     "desc": "Reached 500 total points"},
]


def _compute_achievements(garden, activities):
    """Compute which achievements are earned."""
    med_points = sum(a.points for a in activities if a.activity_type == 'medication_taken')
    meal_count = sum(1 for a in activities if a.activity_type == 'meal_completed')
    activity_count = sum(1 for a in activities if a.activity_type == 'activity_completed')

    conditions = {
        "first_step":    garden.total_points >= 5,
        "three_day":     garden.best_streak >= 3,
        "one_week":      garden.best_streak >= 7,
        "consistency":   garden.best_streak >= 30,
        "med_champ":     med_points >= 50,
        "healthy_plate": meal_count >= 20,
        "active_bloom":  activity_count >= 10,
        "garden_keeper": garden.total_points >= 500,
    }
    return conditions


def _update_streak(garden):
    """Update current_streak and best_streak based on last_activity_date."""
    today = date.today()
    if garden.last_activity_date is None:
        garden.current_streak = 1
    elif garden.last_activity_date == today:
        pass  # same day, no change
    elif garden.last_activity_date == today - timedelta(days=1):
        garden.current_streak += 1
    else:
        # Gap — reset (recovery: never drops below 0)
        garden.current_streak = 1

    if garden.current_streak > garden.best_streak:
        garden.best_streak = garden.current_streak

    garden.last_activity_date = today


# ── Internal helper used by diet_views ────────────────────────────────────

def _award_garden_activity(patient, activity_type, note=''):
    """Award points to the patient's garden. Used internally."""
    points = POINTS_MAP.get(activity_type, 5)
    HealthActivity.objects.create(
        patient=patient, activity_type=activity_type, points=points, note=note
    )
    with transaction.atomic():  # type: ignore
        garden, _ = GardenProgress.objects.get_or_create(patient=patient)
        garden.total_points += points
        _update_streak(garden)
        # Update achievements
        all_acts = list(HealthActivity.objects.filter(patient=patient))
        earned = _compute_achievements(garden, all_acts)
        current = set(json.loads(garden.achievements or '[]'))
        for aid, cond in earned.items():
            if cond:
                current.add(aid)
        garden.achievements = json.dumps(sorted(current))
        garden.save()
    return garden


# ── Garden API views ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def garden_status(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    garden, _ = GardenProgress.objects.get_or_create(patient=patient)
    stage = get_garden_stage(garden.total_points)

    today = date.today()
    today_activities = list(HealthActivity.objects.filter(
        patient=patient, logged_at__date=today
    ).values('activity_type', 'points', 'note', 'logged_at'))
    for a in today_activities:
        a['logged_at'] = str(a['logged_at'])

    # Weekly stats
    week_start = today - timedelta(days=today.weekday())
    week_acts = HealthActivity.objects.filter(
        patient=patient, logged_at__date__gte=week_start
    )
    week_points = sum(a.points for a in week_acts)

    return JsonResponse({
        "total_points": garden.total_points,
        "current_streak": garden.current_streak,
        "best_streak": garden.best_streak,
        "last_activity_date": str(garden.last_activity_date) if garden.last_activity_date else None,
        "stage": stage,
        "today_activities": today_activities,
        "today_activity_count": len(today_activities),
        "week_points": week_points,
        "achievements_earned": json.loads(garden.achievements or '[]'),
        "recovery_message": (
            "Your garden can grow again today"
            if (garden.last_activity_date and
                garden.last_activity_date < today - timedelta(days=1))
            else None
        ),
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def log_garden_activity(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    if hasattr(request, 'data') and isinstance(request.data, dict):
        data = request.data
    else:
        try:
            data = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

    activity_type = data.get('activity_type', '')
    if activity_type not in VALID_ACTIVITY_TYPES:
        return JsonResponse({
            "error": f"Invalid activity_type. Valid: {sorted(VALID_ACTIVITY_TYPES)}"
        }, status=400)

    note = str(data.get('note', ''))[:200]

    garden = _award_garden_activity(patient, activity_type, note=note)
    stage = get_garden_stage(garden.total_points)

    today = date.today()
    today_activities = list(HealthActivity.objects.filter(
        patient=patient, logged_at__date=today
    ).values('activity_type', 'points', 'note', 'logged_at'))
    for a in today_activities:
        a['logged_at'] = str(a['logged_at'])

    return JsonResponse({
        "total_points": garden.total_points,
        "current_streak": garden.current_streak,
        "best_streak": garden.best_streak,
        "stage": stage,
        "points_awarded": POINTS_MAP.get(activity_type, 5),
        "achievements_earned": json.loads(garden.achievements or '[]'),
        "today_activities": today_activities,
        "today_activity_count": len(today_activities),
    }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def garden_history(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    today = date.today()
    thirty_days_ago = today - timedelta(days=29)

    activities = HealthActivity.objects.filter(
        patient=patient,
        logged_at__date__gte=thirty_days_ago,
    ).order_by('logged_at')

    # Group by date
    by_date = {}
    for a in activities:
        d = str(a.logged_at.date())
        if d not in by_date:
            by_date[d] = {"date": d, "activities": [], "points": 0}
        by_date[d]["activities"].append({
            "type": a.activity_type, "points": a.points, "note": a.note,
        })
        by_date[d]["points"] += a.points

    return JsonResponse({"history": list(by_date.values())}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def garden_achievements(request):
    user = request.user
    patient = _get_patient(user)
    if not patient:
        return JsonResponse({"error": "Patient profile not found."}, status=404)

    garden, _ = GardenProgress.objects.get_or_create(patient=patient)
    all_acts = list(HealthActivity.objects.filter(patient=patient))
    earned_conditions = _compute_achievements(garden, all_acts)
    earned_ids = set(json.loads(garden.achievements or '[]'))

    result = []
    for a in ACHIEVEMENTS_DEF:
        result.append({
            **a,
            "earned": a["id"] in earned_ids or earned_conditions.get(a["id"], False),
        })

    return JsonResponse({"achievements": result}, status=200)
