from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Patient, Prescription, PathologyReport, PredictionRecord,
    EmergencyToken, DietPreference, MealPlan, MealCompletion,
    FavoriteMeal, ShoppingListItem, HealthActivity, GardenProgress,
)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('email', 'full_name', 'license_number')
    ordering = ('email',)

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'gender', 'blood_group', 'user')
    search_fields = ('first_name', 'last_name', 'user__email')
    list_filter = ('gender', 'blood_group')

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'guest_email', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('guest_email', 'patient__first_name', 'patient__last_name')

@admin.register(PathologyReport)
class PathologyReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'guest_email', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('guest_email', 'patient__first_name')

@admin.register(PredictionRecord)
class PredictionRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'disease_type', 'risk_score', 'risk_level', 'patient', 'guest_email', 'created_at')
    list_filter = ('disease_type', 'risk_level', 'created_at')
    search_fields = ('disease_type', 'guest_email', 'patient__first_name')

@admin.register(EmergencyToken)
class EmergencyTokenAdmin(admin.ModelAdmin):
    list_display = ('patient', 'token', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')

@admin.register(DietPreference)
class DietPreferenceAdmin(admin.ModelAdmin):
    list_display = ('patient', 'region', 'diet_type', 'meals_per_day', 'calorie_preference', 'budget')
    list_filter = ('region', 'diet_type', 'calorie_preference')

@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = ('patient', 'week_start', 'is_active', 'generated_at')
    list_filter = ('is_active', 'week_start')

@admin.register(MealCompletion)
class MealCompletionAdmin(admin.ModelAdmin):
    list_display = ('patient', 'date', 'meal_type', 'meal_name', 'completed', 'completed_at')
    list_filter = ('completed', 'date', 'meal_type')

@admin.register(FavoriteMeal)
class FavoriteMealAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'added_at')

@admin.register(ShoppingListItem)
class ShoppingListItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'ingredient', 'quantity', 'checked', 'added_at')
    list_filter = ('checked',)

@admin.register(HealthActivity)
class HealthActivityAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'activity_type', 'points', 'logged_at')
    list_filter = ('activity_type', 'logged_at')

@admin.register(GardenProgress)
class GardenProgressAdmin(admin.ModelAdmin):
    list_display = ('patient', 'total_points', 'current_streak', 'best_streak', 'last_activity_date')
