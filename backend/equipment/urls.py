from django.urls import path
from . import views, auth_views

urlpatterns = [
    # Auth endpoints
    path('auth/register/', auth_views.register),
    path('auth/login/', auth_views.login),
    
    # Existing endpoints
    path('upload/', views.upload_csv),
    path('history/', views.get_trends),
    path('report/', views.generate_pdf),
    
    # New endpoints
    path('alerts/', views.get_alerts),
    path('alerts/<int:alert_id>/resolve/', views.resolve_alert),
    path('compare-equipment/', views.compare_equipment),
    path('trends/', views.get_trends),
    path('maintenance/', views.get_maintenance_schedule),
    path('maintenance/create/', views.create_maintenance_schedule),
    path('maintenance/<int:schedule_id>/update/', views.update_maintenance_status),
]