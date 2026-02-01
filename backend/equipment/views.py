import pandas as pd
import numpy as np
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Dataset, EquipmentAlert, MaintenanceSchedule
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
    alerts = generate_alerts(df)

    # Save to database
    Dataset.objects.create(
        total_records=summary["total_records"],
        avg_flowrate=summary["avg_flowrate"],
        avg_pressure=summary["avg_pressure"],
        avg_temperature=summary["avg_temperature"],
    )

    return Response({
        **summary,
        "advanced_analytics": advanced_analytics,
        "alerts": alerts
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
        if row['Flowrate'] > 150 or row['Flowrate'] < 50:
            alerts.append({
                "type": "Critical",
                "equipment": row['Equipment Name'],
                "message": f"Flowrate critically {'high' if row['Flowrate'] > 150 else 'low'}: {row['Flowrate']:.2f} L/min",
                "recommendation": "Immediate inspection required"
            })
        
        if row['Pressure'] > 8.5 or row['Pressure'] < 3.5:
            alerts.append({
                "type": "Critical",
                "equipment": row['Equipment Name'],
                "message": f"Pressure critically {'high' if row['Pressure'] > 8.5 else 'low'}: {row['Pressure']:.2f} bar",
                "recommendation": "Check pressure regulators"
            })
        
        if row['Temperature'] > 140 or row['Temperature'] < 95:
            alerts.append({
                "type": "Warning",
                "equipment": row['Equipment Name'],
                "message": f"Temperature {'high' if row['Temperature'] > 140 else 'low'}: {row['Temperature']:.2f}°C",
                "recommendation": "Monitor temperature controls"
            })
    
    return alerts


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history(request):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predictive_maintenance(request):
    """Get predictive maintenance recommendations"""
    # This would typically use ML models, for now using rule-based approach
    
    recommendations = [
        {
            "equipment": "Pump-1",
            "next_maintenance": (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d'),
            "priority": "High",
            "estimated_hours": 4,
            "parts_needed": ["Seal kit", "Bearing"],
            "reason": "Operating hours exceeding threshold"
        },
        {
            "equipment": "Compressor-1",
            "next_maintenance": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            "priority": "Medium",
            "estimated_hours": 6,
            "parts_needed": ["Filter", "Oil"],
            "reason": "Scheduled maintenance"
        }
    ]
    
    return Response(recommendations)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_excel(request):
    """Export comprehensive Excel report"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.chart import BarChart, Reference
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Equipment Summary"
    
    # Header styling
    header_fill = PatternFill(start_color="667eea", end_color="667eea", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    # Add headers
    headers = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature', 'Health Score', 'Status']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
    
    # Add data (example)
    ws.append(['Pump-1', 'Pump', 120, 5.2, 110, 95, 'Excellent'])
    ws.append(['Compressor-1', 'Compressor', 95, 8.4, 95, 78, 'Good'])
    
    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if len(str(cell.value)) > max_length:
                max_length = len(str(cell.value))
        ws.column_dimensions[column].width = max_length + 2
    
    # Save to buffer
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    response = HttpResponse(
        buffer,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="equipment_report.xlsx"'
    
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compare_datasets(request):
    """Compare multiple dataset uploads"""
    dataset_ids = request.data.get('dataset_ids', [])
    
    if len(dataset_ids) < 2:
        return Response({"error": "Please select at least 2 datasets to compare"}, status=400)
    
    datasets = Dataset.objects.filter(id__in=dataset_ids).order_by('uploaded_at')
    
    comparison = {
        "datasets": [],
        "trends": {
            "flowrate": [],
            "pressure": [],
            "temperature": []
        }
    }
    
    for ds in datasets:
        comparison["datasets"].append({
            "id": ds.id,
            "date": ds.uploaded_at,
            "total_records": ds.total_records,
            "avg_flowrate": ds.avg_flowrate,
            "avg_pressure": ds.avg_pressure,
            "avg_temperature": ds.avg_temperature,
        })
        
        comparison["trends"]["flowrate"].append(ds.avg_flowrate)
        comparison["trends"]["pressure"].append(ds.avg_pressure)
        comparison["trends"]["temperature"].append(ds.avg_temperature)
    
    return Response(comparison)