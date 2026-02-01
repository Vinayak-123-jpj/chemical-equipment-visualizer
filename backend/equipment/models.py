from django.db import models
from django.contrib.auth.models import User


class Dataset(models.Model):
    uploaded_at = models.DateTimeField(auto_now_add=True)
    total_records = models.IntegerField()
    avg_flowrate = models.FloatField()
    avg_pressure = models.FloatField()
    avg_temperature = models.FloatField()
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Dataset {self.id} - {self.uploaded_at}"
    
    class Meta:
        ordering = ['-uploaded_at']


class EquipmentAlert(models.Model):
    ALERT_TYPES = [
        ('CRITICAL', 'Critical'),
        ('WARNING', 'Warning'),
        ('INFO', 'Info'),
    ]
    
    equipment_name = models.CharField(max_length=100)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    parameter = models.CharField(max_length=50)
    value = models.FloatField()
    threshold = models.FloatField()
    message = models.TextField()
    recommendation = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.alert_type} - {self.equipment_name} - {self.parameter}"
    
    class Meta:
        ordering = ['-created_at']


class MaintenanceSchedule(models.Model):
    PRIORITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    equipment_name = models.CharField(max_length=100)
    equipment_type = models.CharField(max_length=50)
    scheduled_date = models.DateField()
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    estimated_hours = models.FloatField()
    parts_needed = models.JSONField(default=list)
    description = models.TextField()
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_maintenance')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_maintenance')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.equipment_name} - {self.scheduled_date} ({self.status})"
    
    class Meta:
        ordering = ['scheduled_date', '-priority']


class EquipmentParameter(models.Model):
    """Store historical equipment parameters for trend analysis"""
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='parameters')
    equipment_name = models.CharField(max_length=100)
    equipment_type = models.CharField(max_length=50)
    flowrate = models.FloatField()
    pressure = models.FloatField()
    temperature = models.FloatField()
    health_score = models.FloatField(null=True, blank=True)
    efficiency_index = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.equipment_name} - {self.recorded_at}"
    
    class Meta:
        ordering = ['-recorded_at']


class SystemNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('ALERT', 'Alert'),
        ('MAINTENANCE', 'Maintenance'),
        ('UPDATE', 'System Update'),
        ('REPORT', 'Report Generated'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    link = models.URLField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.notification_type} - {self.title}"
    
    class Meta:
        ordering = ['-created_at']


class EquipmentPerformanceMetric(models.Model):
    """Track performance metrics over time"""
    equipment_name = models.CharField(max_length=100)
    equipment_type = models.CharField(max_length=50)
    date = models.DateField()
    uptime_percentage = models.FloatField()
    downtime_hours = models.FloatField()
    efficiency_score = models.FloatField()
    maintenance_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    energy_consumption = models.FloatField(null=True, blank=True)
    output_volume = models.FloatField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.equipment_name} - {self.date}"
    
    class Meta:
        ordering = ['-date']
        unique_together = ['equipment_name', 'date']