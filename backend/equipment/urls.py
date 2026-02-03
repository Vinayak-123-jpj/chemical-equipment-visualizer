from django.urls import path
from . import views

urlpatterns = [
    # Main endpoints - NO AUTH
    path('upload/', views.upload_csv),
    path('history/', views.get_trends),
    path('report/', views.generate_pdf),
    path('alerts/', views.get_alerts),
    path('alerts/<int:alert_id>/resolve/', views.resolve_alert),
    path('compare-equipment/', views.compare_equipment),
    path('trends/', views.get_trends),
    path('maintenance/', views.get_maintenance_schedule),
    path('maintenance/create/', views.create_maintenance_schedule),
    path('maintenance/<int:schedule_id>/update/', views.update_maintenance_status),
    path('rankings/', views.get_equipment_rankings),
    path('export/excel/', views.export_to_excel),
    path('email-reports/', views.get_email_schedules),
    path('email-reports/schedule/', views.schedule_email_report),
    path('email-reports/<int:schedule_id>/update/', views.update_email_schedule),
    path('email-reports/<int:schedule_id>/delete/', views.delete_email_schedule),
]