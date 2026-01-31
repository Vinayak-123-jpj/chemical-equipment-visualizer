from django.contrib import admin
from .models import Dataset


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'uploaded_at',
        'total_records',
        'avg_flowrate',
        'avg_pressure',
        'avg_temperature',
    )

    list_filter = (
        'uploaded_at',
    )
