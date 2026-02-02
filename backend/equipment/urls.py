from django.urls import path
from . import views, auth_views

urlpatterns = [
    # Auth endpoints
    path('auth/register/', auth_views.register),
    path('auth/login/', auth_views.login),
    
    # Existing endpoints
  path('upload/', cors_views.upload_csv_wrapper),
    path('history/', views.get_trends),
    path('report/', views.generate_pdf),
    
    # Alert endpoints
    path('alerts/', views.get_alerts),
    path('alerts/<int:alert_id>/resolve/', views.resolve_alert),
    
    # Equipment endpoints
    path('compare-equipment/', views.compare_equipment),
    path('trends/', views.get_trends),
    
    # Maintenance endpoints
    path('maintenance/', views.get_maintenance_schedule),
    path('maintenance/create/', views.create_maintenance_schedule),
    path('maintenance/<int:schedule_id>/update/', views.update_maintenance_status),
    
    # NEW: Rankings endpoint
    path('rankings/', views.get_equipment_rankings),
    
    # NEW: Excel export
    path('export/excel/', views.export_to_excel),
    
    # NEW: Email report endpoints
    path('email-reports/', views.get_email_schedules),
    path('email-reports/schedule/', views.schedule_email_report),
    path('email-reports/<int:schedule_id>/update/', views.update_email_schedule),
    path('email-reports/<int:schedule_id>/delete/', views.delete_email_schedule),
]