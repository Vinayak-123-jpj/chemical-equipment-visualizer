from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_csv),
    path('history/', views.history),
    path('report/', views.generate_pdf),
]
