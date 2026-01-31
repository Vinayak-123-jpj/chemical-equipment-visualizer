from django.urls import path
from .views import upload_csv, history, generate_pdf

urlpatterns = [
    path('upload/', upload_csv),
    path('history/', history),
    path('report/', generate_pdf),
]
