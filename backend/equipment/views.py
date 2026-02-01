import pandas as pd
import numpy as np
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Dataset, EquipmentAlert, MaintenanceSchedule, EquipmentParameter
from reportlab.lib.pagesizes import A4, letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime, timedelta
import json


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_csv(request):
    """Enhanced CSV upload with advanced analytics"""
    file = request.FILES.get('file')

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    df = pd.read_csv(file)

    # Basic summary
    summary = {
        "total_records": len(df),
        "avg_flowrate": df["Flowrate"].mean(),
        "avg_pressure": df["Pressure"].mean(),
        "avg_temperature": df["Temperature"].mean(),
        "type_distribution": df["Type"].value_counts().to_dict()
    }

    # Advanced analytics
    advanced_analytics = {
        # Statistical measures
        "flowrate_stats": {
            "min": df["Flowrate"].min(),
            "max": df["Flowrate"].max(),
            "std": df["Flowrate"].std(),
            "median": df["Flowrate"].median(),
        },
        "pressure_stats": {
            "min": df["Pressure"].min(),
            "max": df["Pressure"].max(),
            "std": df["Pressure"].std(),
            "median": df["Pressure"].median(),
        },
        "temperature_stats": {
            "min": df["Temperature"].min(),
            "max": df["Temperature"].max(),
            "std": df["Temperature"].std(),
            "median": df["Temperature"].median(),
        },
        
        # Equipment health scoring
        "health_scores": calculate_health_scores(df),
        
        # Anomaly detection
        "anomalies": detect_anomalies(df),
        
        # Efficiency metrics
        "efficiency_metrics": calculate_efficiency_metrics(df),
        
        # Correlation analysis
        "correlations": {
            "flowrate_pressure": df[["Flowrate", "Pressure"]].corr().iloc[0, 1],
            "flowrate_temperature": df[["Flowrate", "Temperature"]].corr().iloc[0, 1],
            "pressure_temperature": df[["Pressure", "Temperature"]].corr().iloc[0, 1],
        }
    }

    # Create alerts for equipment outside normal range
    alerts_data = generate_alerts(df)

    # Save to database
    dataset = Dataset.objects.create(
        total_records=summary["total_records"],
        avg_flowrate=summary["avg_flowrate"],
        avg_pressure=summary["avg_pressure"],
        avg_temperature=summary["avg_temperature"],
        uploaded_by=request.user,
        file_name=file.name
    )

    # Save equipment parameters
    for _, row in df.iterrows():
        health_score = calculate_single_health_score(row['Flowrate'], row['Pressure'], row['Temperature'])
        EquipmentParameter.objects.create(
            dataset=dataset,
            equipment_name=row['Equipment Name'],
            equipment_type=row['Type'],
            flowrate=row['Flowrate'],
            pressure=row['Pressure'],
            temperature=row['Temperature'],
            health_score=health_score
        )

    # Save alerts to database
    for alert in alerts_data:
        EquipmentAlert.objects.create(
            equipment_name=alert['equipment'],
            alert_type=alert['type'].upper(),
            parameter=alert.get('parameter', 'General'),
            value=alert.get('value', 0),
            threshold=alert.get('threshold', 0),
            message=alert['message'],
            recommendation=alert.get('recommendation', '')
        )

    return Response({
        **summary,
        "advanced_analytics": advanced_analytics,
        "alerts": alerts_data
    })


def calculate_health_scores(df):
    """Calculate health scores for each equipment"""
    scores = []
    
    for _, row in df.iterrows():
        # Normalize parameters (0-100 scale)
        flowrate_score = normalize_score(row['Flowrate'], 50, 150, 100, 130)
        pressure_score = normalize_score(row['Pressure'], 3, 9, 4, 8)
        temp_score = normalize_score(row['Temperature'], 90, 150, 100, 135)
        
        # Weighted average
        overall_score = (flowrate_score * 0.4 + pressure_score * 0.3 + temp_score * 0.3)
        
        scores.append({
            "equipment": row['Equipment Name'],
            "score": round(overall_score, 2),
            "status": "Excellent" if overall_score >= 90 else "Good" if overall_score >= 75 else "Fair" if overall_score >= 60 else "Poor"
        })
    
    return scores


def calculate_single_health_score(flowrate, pressure, temperature):
    """Calculate health score for single equipment"""
    flowrate_score = normalize_score(flowrate, 50, 150, 100, 130)
    pressure_score = normalize_score(pressure, 3, 9, 4, 8)
    temp_score = normalize_score(temperature, 90, 150, 100, 135)
    return round((flowrate_score * 0.4 + pressure_score * 0.3 + temp_score * 0.3), 2)


def normalize_score(value, min_val, max_val, optimal_min, optimal_max):
    """Normalize value to 0-100 score based on optimal range"""
    if optimal_min <= value <= optimal_max:
        return 100
    elif value < optimal_min:
        distance = optimal_min - value
        range_size = optimal_min - min_val
        return max(0, 100 - (distance / range_size * 100))
    else:
        distance = value - optimal_max
        range_size = max_val - optimal_max
        return max(0, 100 - (distance / range_size * 100))


def detect_anomalies(df):
    """Detect anomalies using statistical methods"""
    anomalies = []
    
    for param in ['Flowrate', 'Pressure', 'Temperature']:
        mean = df[param].mean()
        std = df[param].std()
        
        # Find values beyond 2 standard deviations
        outliers = df[(df[param] < mean - 2*std) | (df[param] > mean + 2*std)]
        
        for _, row in outliers.iterrows():
            anomalies.append({
                "equipment": row['Equipment Name'],
                "parameter": param,
                "value": row[param],
                "expected_range": f"{mean - 2*std:.2f} - {mean + 2*std:.2f}",
                "severity": "High" if abs(row[param] - mean) > 3*std else "Medium"
            })
    
    return anomalies


def calculate_efficiency_metrics(df):
    """Calculate efficiency metrics"""
    # Group by equipment type
    type_efficiency = {}
    
    for eq_type in df['Type'].unique():
        type_data = df[df['Type'] == eq_type]
        
        type_efficiency[eq_type] = {
            "avg_flowrate": type_data['Flowrate'].mean(),
            "avg_pressure": type_data['Pressure'].mean(),
            "avg_temperature": type_data['Temperature'].mean(),
            "count": len(type_data),
            "efficiency_index": calculate_efficiency_index(type_data)
        }
    
    return type_efficiency


def calculate_efficiency_index(data):
    """Calculate custom efficiency index"""
    # Custom formula based on optimal ranges
    flowrate_eff = data['Flowrate'].apply(lambda x: 100 if 100 <= x <= 130 else 80 if 80 <= x <= 150 else 60)
    pressure_eff = data['Pressure'].apply(lambda x: 100 if 4 <= x <= 8 else 80 if 3 <= x <= 9 else 60)
    temp_eff = data['Temperature'].apply(lambda x: 100 if 100 <= x <= 135 else 80 if 90 <= x <= 150 else 60)
    
    overall_eff = (flowrate_eff.mean() + pressure_eff.mean() + temp_eff.mean()) / 3
    return round(overall_eff, 2)


def generate_alerts(df):
    """Generate alerts for equipment issues"""
    alerts = []
    
    for _, row in df.iterrows():
        # Critical thresholds
        if row['Flowrate'] > 150:
            alerts.append({
                "type": "Critical",
                "equipment": row['Equipment Name'],
                "parameter": "Flowrate",
                "value": row['Flowrate'],
                "threshold": 150,
                "message": f"Flowrate critically high: {row['Flowrate']:.2f} L/min",
                "recommendation": "Immediate inspection required - Check for blockages or pump malfunction"
            })
        elif row['Flowrate'] < 50:
            alerts.append({
                "type": "Critical",
                "equipment": row['Equipment Name'],
                "parameter": "Flowrate",
                "value": row['Flowrate'],
                "threshold": 50,
                "message": f"Flowrate critically low: {row['Flowrate']:.2f} L/min",
                "recommendation": "Check pump operation and inlet valves"
            })
        
        if row['Pressure'] > 8.5:
            alerts.append({
                "type": "Critical",
                "equipment": row['Equipment Name'],
                "parameter": "Pressure",
                "value": row['Pressure'],
                "threshold": 8.5,
                "message": f"Pressure critically high: {row['Pressure']:.2f} bar",
                "recommendation": "Check pressure regulators and relief valves immediately"
            })
        elif row['Pressure'] < 3.5:
            alerts.append({
                "type": "Critical",
                "equipment": row['Equipment Name'],
                "parameter": "Pressure",
                "value": row['Pressure'],
                "threshold": 3.5,
                "message": f"Pressure critically low: {row['Pressure']:.2f} bar",
                "recommendation": "Inspect pressure control systems"
            })
        
        if row['Temperature'] > 140:
            alerts.append({
                "type": "Warning",
                "equipment": row['Equipment Name'],
                "parameter": "Temperature",
                "value": row['Temperature'],
                "threshold": 140,
                "message": f"Temperature high: {row['Temperature']:.2f}°C",
                "recommendation": "Monitor temperature controls and cooling system"
            })
        elif row['Temperature'] < 95:
            alerts.append({
                "type": "Warning",
                "equipment": row['Equipment Name'],
                "parameter": "Temperature",
                "value": row['Temperature'],
                "threshold": 95,
                "message": f"Temperature low: {row['Temperature']:.2f}°C",
                "recommendation": "Check heating elements"
            })
    
    return alerts


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # CORRECT
def get_trends(request):
    """Get upload history with enhanced details"""
    datasets = Dataset.objects.order_by('-uploaded_at')[:10]

    data = []
    for d in datasets:
        data.append({
            "id": d.id,
            "uploaded_at": d.uploaded_at,
            "total_records": d.total_records,
            "avg_flowrate": d.avg_flowrate,
            "avg_pressure": d.avg_pressure,
            "avg_temperature": d.avg_temperature,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):
    """Generate enhanced PDF report with charts and analysis"""
    dataset = Dataset.objects.order_by('-uploaded_at').first()

    if not dataset:
        return Response({"error": "No data available"}, status=400)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=1  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=12,
        spaceBefore=12,
    )
    
    # Title
    story.append(Paragraph("Chemical Equipment Analysis Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Summary section
    story.append(Paragraph("Executive Summary", heading_style))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Records', str(dataset.total_records)],
        ['Average Flowrate', f'{dataset.avg_flowrate:.2f} L/min'],
        ['Average Pressure', f'{dataset.avg_pressure:.2f} bar'],
        ['Average Temperature', f'{dataset.avg_temperature:.2f}°C'],
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(summary_table)
    
    # Build PDF
    doc.build(story)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="equipment_report.pdf"'

    return response


# NEW ENDPOINTS FOR FEATURES

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_alerts(request):
    """Get all alerts with filtering"""
    resolved = request.GET.get('resolved', 'false').lower() == 'true'
    
    alerts = EquipmentAlert.objects.filter(resolved=resolved).order_by('-created_at')[:50]
    
    data = []
    for alert in alerts:
        data.append({
            'id': alert.id,
            'equipment_name': alert.equipment_name,
            'alert_type': alert.alert_type,
            'parameter': alert.parameter,
            'value': alert.value,
            'threshold': alert.threshold,
            'message': alert.message,
            'recommendation': alert.recommendation,
            'created_at': alert.created_at,
            'resolved': alert.resolved,
            'resolved_at': alert.resolved_at
        })
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
    """Resolve an alert"""
    try:
        alert = EquipmentAlert.objects.get(id=alert_id)
        alert.resolved = True
        alert.resolved_at = datetime.now()
        alert.resolved_by = request.user
        alert.save()
        
        return Response({'success': True, 'message': 'Alert resolved'})
    except EquipmentAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compare_equipment(request):
    """Compare multiple equipment"""
    equipment_names = request.data.get('equipment_names', [])
    
    if len(equipment_names) < 2:
        return Response({'error': 'Select at least 2 equipment'}, status=400)
    
    # Get latest data for each equipment
    latest_dataset = Dataset.objects.order_by('-uploaded_at').first()
    
    if not latest_dataset:
        return Response({'error': 'No data available'}, status=400)
    
    equipment_data = EquipmentParameter.objects.filter(
        dataset=latest_dataset,
        equipment_name__in=equipment_names
    )
    
    comparison = []
    for eq in equipment_data:
        comparison.append({
            'name': eq.equipment_name,
            'type': eq.equipment_type,
            'flowrate': eq.flowrate,
            'pressure': eq.pressure,
            'temperature': eq.temperature,
            'health_score': eq.health_score
        })
    
    return Response(comparison)


@api_view(['GET'])
@permission_classes([IsAuthenticated])

def get_trends(request):
    """Get historical trends for charts"""
    days = int(request.GET.get('days', 30))
    
    datasets = Dataset.objects.filter(
        uploaded_at__gte=datetime.now() - timedelta(days=days)
    ).order_by('uploaded_at')
    
    trends = {
        'dates': [],
        'flowrate': [],
        'pressure': [],
        'temperature': []
    }
    
    for ds in datasets:
        trends['dates'].append(ds.uploaded_at.strftime('%Y-%m-%d'))
        trends['flowrate'].append(float(ds.avg_flowrate))
        trends['pressure'].append(float(ds.avg_pressure))
        trends['temperature'].append(float(ds.avg_temperature))
    
    return Response(trends)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_maintenance_schedule(request):
    """Get maintenance schedule"""
    schedules = MaintenanceSchedule.objects.filter(
        status__in=['SCHEDULED', 'IN_PROGRESS']
    ).order_by('scheduled_date')[:20]
    
    data = []
    for schedule in schedules:
        data.append({
            'id': schedule.id,
            'equipment_name': schedule.equipment_name,
            'equipment_type': schedule.equipment_type,
            'scheduled_date': schedule.scheduled_date,
            'priority': schedule.priority,
            'status': schedule.status,
            'estimated_hours': schedule.estimated_hours,
            'parts_needed': schedule.parts_needed,
            'description': schedule.description
        })
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_maintenance_schedule(request):
    """Create new maintenance schedule"""
    schedule = MaintenanceSchedule.objects.create(
        equipment_name=request.data.get('equipment_name'),
        equipment_type=request.data.get('equipment_type'),
        scheduled_date=request.data.get('scheduled_date'),
        priority=request.data.get('priority', 'MEDIUM'),
        estimated_hours=request.data.get('estimated_hours', 2),
        parts_needed=request.data.get('parts_needed', []),
        description=request.data.get('description', ''),
        created_by=request.user
    )
    
    return Response({'success': True, 'id': schedule.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_maintenance_status(request, schedule_id):
    """Update maintenance schedule status"""
    try:
        schedule = MaintenanceSchedule.objects.get(id=schedule_id)
        new_status = request.data.get('status')
        
        schedule.status = new_status
        if new_status == 'COMPLETED':
            schedule.completed_at = datetime.now()
        
        schedule.save()
        
        return Response({'success': True})
    except MaintenanceSchedule.DoesNotExist:
        return Response({'error': 'Schedule not found'}, status=404)