import pandas as pd
import numpy as np
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Dataset, EquipmentAlert, MaintenanceSchedule, EquipmentParameter, EmailReportSchedule, EquipmentRanking
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
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, Reference, LineChart
from sklearn.linear_model import LinearRegression

# SIMPLIFIED UPLOAD FIX
# Replace the upload_csv function in backend/equipment/views.py with this:

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_csv(request):
    file = request.FILES.get('file')

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        # Read CSV
        df = pd.read_csv(file)
        
        # Validate required columns
        required_columns = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            return Response({"error": f"Missing columns: {', '.join(missing)}"}, status=400)

        # Calculate summary
        summary = {
            "total_records": len(df),
            "avg_flowrate": float(df["Flowrate"].mean()),
            "avg_pressure": float(df["Pressure"].mean()),
            "avg_temperature": float(df["Temperature"].mean()),
            "type_distribution": df["Type"].value_counts().to_dict()
        }

        # Save to database with timezone-aware datetime
        from django.utils import timezone
        dataset = Dataset.objects.create(
            total_records=summary["total_records"],
            avg_flowrate=summary["avg_flowrate"],
            avg_pressure=summary["avg_pressure"],
            avg_temperature=summary["avg_temperature"],
            uploaded_by=request.user,
            file_name=file.name
        )

        # Save individual equipment parameters with health scores
        for _, row in df.iterrows():
            flowrate = float(row['Flowrate'])
            pressure = float(row['Pressure'])
            temperature = float(row['Temperature'])
            
            # Simple health score calculation
            flowrate_score = 100 if 100 <= flowrate <= 130 else 80 if 80 <= flowrate <= 150 else 60
            pressure_score = 100 if 4 <= pressure <= 8 else 80 if 3 <= pressure <= 9 else 60
            temp_score = 100 if 100 <= temperature <= 135 else 80 if 90 <= temperature <= 150 else 60
            health_score = (flowrate_score + pressure_score + temp_score) / 3
            
            EquipmentParameter.objects.create(
                dataset=dataset,
                equipment_name=row['Equipment Name'],
                equipment_type=row['Type'],
                flowrate=flowrate,
                pressure=pressure,
                temperature=temperature,
                health_score=health_score,
                efficiency_index=health_score  # Use same for simplicity
            )
            
            # Generate alerts for critical values
            if flowrate > 150 or flowrate < 50:
                EquipmentAlert.objects.create(
                    equipment_name=row['Equipment Name'],
                    alert_type='CRITICAL',
                    parameter='Flowrate',
                    value=flowrate,
                    threshold=150 if flowrate > 150 else 50,
                    message=f"Flowrate {'critically high' if flowrate > 150 else 'critically low'}: {flowrate:.2f} L/min",
                    recommendation="Immediate inspection required"
                )
            
            if pressure > 8.5 or pressure < 3.5:
                EquipmentAlert.objects.create(
                    equipment_name=row['Equipment Name'],
                    alert_type='CRITICAL',
                    parameter='Pressure',
                    value=pressure,
                    threshold=8.5 if pressure > 8.5 else 3.5,
                    message=f"Pressure {'critically high' if pressure > 8.5 else 'critically low'}: {pressure:.2f} bar",
                    recommendation="Check pressure regulators immediately"
                )

        # Generate rankings
        EquipmentRanking.objects.all().delete()
        params = EquipmentParameter.objects.filter(dataset=dataset).order_by('-health_score')
        for rank, param in enumerate(params, start=1):
            EquipmentRanking.objects.create(
                equipment_name=param.equipment_name,
                equipment_type=param.equipment_type,
                overall_score=param.health_score,
                efficiency_rank=rank,
                reliability_rank=rank,
                performance_rank=rank
            )

        return Response(summary)
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Upload error: {error_details}")
        return Response({
            "error": f"Failed to process file: {str(e)}"
        }, status=500)

def calculate_health_scores(df):
    scores = []
    for _, row in df.iterrows():
        flowrate_score = normalize_score(row['Flowrate'], 50, 150, 100, 130)
        pressure_score = normalize_score(row['Pressure'], 3, 9, 4, 8)
        temp_score = normalize_score(row['Temperature'], 90, 150, 100, 135)
        overall_score = (flowrate_score * 0.4 + pressure_score * 0.3 + temp_score * 0.3)
        
        scores.append({
            "equipment": row['Equipment Name'],
            "score": round(overall_score, 2),
            "status": "Excellent" if overall_score >= 90 else "Good" if overall_score >= 75 else "Fair" if overall_score >= 60 else "Poor"
        })
    
    return scores


def calculate_single_health_score(flowrate, pressure, temperature):
    flowrate_score = normalize_score(flowrate, 50, 150, 100, 130)
    pressure_score = normalize_score(pressure, 3, 9, 4, 8)
    temp_score = normalize_score(temperature, 90, 150, 100, 135)
    return round((flowrate_score * 0.4 + pressure_score * 0.3 + temp_score * 0.3), 2)


def normalize_score(value, min_val, max_val, optimal_min, optimal_max):
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
    anomalies = []
    for param in ['Flowrate', 'Pressure', 'Temperature']:
        mean = df[param].mean()
        std = df[param].std()
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
    flowrate_eff = data['Flowrate'].apply(lambda x: 100 if 100 <= x <= 130 else 80 if 80 <= x <= 150 else 60)
    pressure_eff = data['Pressure'].apply(lambda x: 100 if 4 <= x <= 8 else 80 if 3 <= x <= 9 else 60)
    temp_eff = data['Temperature'].apply(lambda x: 100 if 100 <= x <= 135 else 80 if 90 <= x <= 150 else 60)
    overall_eff = (flowrate_eff.mean() + pressure_eff.mean() + temp_eff.mean()) / 3
    return round(overall_eff, 2)


def generate_alerts(df):
    alerts = []
    for _, row in df.iterrows():
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


def generate_predictive_alerts(df):
    """Use simple linear regression to predict equipment failures"""
    predictive_alerts = []
    
    # Get historical data for trend analysis
    historical_params = EquipmentParameter.objects.all().order_by('recorded_at')
    
    for equipment_name in df['Equipment Name'].unique():
        equipment_history = historical_params.filter(equipment_name=equipment_name)
        
        if len(equipment_history) < 5:
            continue
            
        # Analyze flowrate trend
        flowrates = [p.flowrate for p in equipment_history]
        X = np.array(range(len(flowrates))).reshape(-1, 1)
        y = np.array(flowrates)
        
        if len(X) > 0:
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict next 30 days
            future_days = 30
            future_X = np.array(range(len(flowrates), len(flowrates) + future_days)).reshape(-1, 1)
            predictions = model.predict(future_X)
            
            # Check if predicted to go out of range
            critical_threshold_high = 150
            critical_threshold_low = 50
            
            for i, pred in enumerate(predictions):
                if pred > critical_threshold_high or pred < critical_threshold_low:
                    days_to_failure = i + 1
                    predicted_date = datetime.now().date() + timedelta(days=days_to_failure)
                    confidence = min(95, 70 + (len(flowrates) * 2))
                    
                    predictive_alerts.append({
                        "equipment": equipment_name,
                        "parameter": "Flowrate",
                        "current_value": flowrates[-1],
                        "threshold": critical_threshold_high if pred > critical_threshold_high else critical_threshold_low,
                        "message": f"Predicted failure in {days_to_failure} days - Flowrate trending {'up' if pred > critical_threshold_high else 'down'}",
                        "recommendation": f"Schedule preventive maintenance before {predicted_date.strftime('%Y-%m-%d')}",
                        "predicted_date": predicted_date,
                        "confidence": confidence
                    })
                    break
    
    return predictive_alerts


def calculate_equipment_rankings(df):
    """Calculate and store equipment rankings"""
    EquipmentRanking.objects.all().delete()
    
    rankings = []
    for _, row in df.iterrows():
        health_score = calculate_single_health_score(row['Flowrate'], row['Pressure'], row['Temperature'])
        
        # Calculate efficiency score
        efficiency = calculate_efficiency_index(pd.DataFrame([row]))
        
        # Overall score (weighted)
        overall_score = (health_score * 0.5 + efficiency * 0.5)
        
        rankings.append({
            'equipment_name': row['Equipment Name'],
            'equipment_type': row['Type'],
            'overall_score': overall_score,
            'health_score': health_score,
            'efficiency_score': efficiency
        })
    
    # Sort and assign ranks
    rankings.sort(key=lambda x: x['overall_score'], reverse=True)
    
    for i, rank_data in enumerate(rankings):
        EquipmentRanking.objects.create(
            equipment_name=rank_data['equipment_name'],
            equipment_type=rank_data['equipment_type'],
            overall_score=rank_data['overall_score'],
            efficiency_rank=i + 1,
            reliability_rank=i + 1,
            performance_rank=i + 1
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trends(request):
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
def generate_pdf(request):
    dataset = Dataset.objects.order_by('-uploaded_at').first()

    if not dataset:
        return Response({"error": "No data available"}, status=400)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=1
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=12,
        spaceBefore=12,
    )
    
    story.append(Paragraph("Chemical Equipment Analysis Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
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
    doc.build(story)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="equipment_report.pdf"'

    return response


"""
FIXED VERSION OF export_to_excel function
Replace the existing function in backend/equipment/views.py with this version
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, Reference
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_to_excel(request):
    """Export comprehensive data to Excel with multiple sheets and charts"""
    try:
        # Get the latest dataset
        from .models import Dataset, EquipmentParameter, EquipmentRanking, EquipmentAlert
        
        dataset = Dataset.objects.order_by('-uploaded_at').first()
        
        if not dataset:
            return Response({'error': 'No data available'}, status=400)
        
        # Create workbook
        wb = Workbook()
        
        # ========================================
        # Sheet 1: Summary
        # ========================================
        ws_summary = wb.active
        ws_summary.title = "Summary"
        
        # Header styling
        header_fill = PatternFill(start_color="667EEA", end_color="667EEA", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=12)
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Title
        ws_summary['A1'] = "Equipment Analysis Report"
        ws_summary['A1'].font = Font(bold=True, size=16, color="667EEA")
        ws_summary.merge_cells('A1:B1')
        
        # Timestamp
        ws_summary['A3'] = "Generated"
        ws_summary['B3'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Headers
        ws_summary['A5'] = "Metric"
        ws_summary['B5'] = "Value"
        ws_summary['A5'].fill = header_fill
        ws_summary['B5'].fill = header_fill
        ws_summary['A5'].font = header_font
        ws_summary['B5'].font = header_font
        ws_summary['A5'].border = border
        ws_summary['B5'].border = border
        
        # Summary data
        summary_data = [
            ["Total Records", dataset.total_records],
            ["Average Flowrate (L/min)", round(dataset.avg_flowrate, 2)],
            ["Average Pressure (bar)", round(dataset.avg_pressure, 2)],
            ["Average Temperature (°C)", round(dataset.avg_temperature, 2)],
        ]
        
        row = 6
        for metric, value in summary_data:
            ws_summary[f'A{row}'] = metric
            ws_summary[f'B{row}'] = value
            ws_summary[f'A{row}'].border = border
            ws_summary[f'B{row}'].border = border
            ws_summary[f'B{row}'].alignment = Alignment(horizontal='right')
            row += 1
        
        # Auto-size columns
        ws_summary.column_dimensions['A'].width = 30
        ws_summary.column_dimensions['B'].width = 20
        
        # ========================================
        # Sheet 2: Equipment Details
        # ========================================
        ws_equipment = wb.create_sheet("Equipment Details")
        headers = ["Equipment Name", "Type", "Flowrate", "Pressure", "Temperature", "Health Score"]
        ws_equipment.append(headers)
        
        # Style headers
        for col_num, cell in enumerate(ws_equipment[1], 1):
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")
            cell.border = border
        
        # Get equipment parameters
        equipment_params = EquipmentParameter.objects.filter(dataset=dataset)
        
        if equipment_params.exists():
            for param in equipment_params:
                row_data = [
                    param.equipment_name,
                    param.equipment_type,
                    round(param.flowrate, 2),
                    round(param.pressure, 2),
                    round(param.temperature, 2),
                    round(param.health_score, 2) if param.health_score else 0
                ]
                ws_equipment.append(row_data)
                
                # Add borders to data cells
                for cell in ws_equipment[ws_equipment.max_row]:
                    cell.border = border
            
            # Add chart only if we have data
            try:
                chart = BarChart()
                chart.title = "Equipment Health Scores"
                chart.x_axis.title = "Equipment"
                chart.y_axis.title = "Health Score"
                chart.style = 10
                
                # Reference data for chart
                data = Reference(ws_equipment, min_col=6, min_row=1, max_row=min(equipment_params.count() + 1, 20))
                cats = Reference(ws_equipment, min_col=1, min_row=2, max_row=min(equipment_params.count() + 1, 20))
                
                chart.add_data(data, titles_from_data=True)
                chart.set_categories(cats)
                chart.height = 10
                chart.width = 20
                
                ws_equipment.add_chart(chart, "H2")
            except Exception as chart_error:
                print(f"Chart creation error: {chart_error}")
                # Continue without chart
        else:
            # Add a message if no data
            ws_equipment.append(["No equipment data available"])
        
        # Auto-size columns
        for column in ws_equipment.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws_equipment.column_dimensions[column_letter].width = adjusted_width
        
        # ========================================
        # Sheet 3: Rankings
        # ========================================
        ws_rankings = wb.create_sheet("Performance Rankings")
        rank_headers = ["Rank", "Equipment", "Type", "Overall Score", "Efficiency Rank", "Performance Rank"]
        ws_rankings.append(rank_headers)
        
        # Style headers
        for col_num, cell in enumerate(ws_rankings[1], 1):
            cell.fill = header_fill
            cell.font = header_font
            cell.border = border
            cell.alignment = Alignment(horizontal="center")
        
        # Get rankings
        rankings = EquipmentRanking.objects.all()[:20]
        
        if rankings.exists():
            for i, ranking in enumerate(rankings, start=1):
                rank_data = [
                    i,
                    ranking.equipment_name,
                    ranking.equipment_type,
                    round(ranking.overall_score, 2),
                    ranking.efficiency_rank,
                    ranking.performance_rank
                ]
                ws_rankings.append(rank_data)
                
                # Add borders
                for cell in ws_rankings[ws_rankings.max_row]:
                    cell.border = border
                
                # Highlight top 3
                if i <= 3:
                    for cell in ws_rankings[ws_rankings.max_row]:
                        if i == 1:
                            cell.fill = PatternFill(start_color="FFD700", end_color="FFD700", fill_type="solid")
                        elif i == 2:
                            cell.fill = PatternFill(start_color="C0C0C0", end_color="C0C0C0", fill_type="solid")
                        elif i == 3:
                            cell.fill = PatternFill(start_color="CD7F32", end_color="CD7F32", fill_type="solid")
        else:
            ws_rankings.append(["No ranking data available"])
        
        # Auto-size columns
        for column in ws_rankings.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws_rankings.column_dimensions[column_letter].width = adjusted_width
        
        # ========================================
        # Sheet 4: Alerts
        # ========================================
        ws_alerts = wb.create_sheet("Active Alerts")
        alert_headers = ["Equipment", "Type", "Parameter", "Value", "Threshold", "Message", "Created"]
        ws_alerts.append(alert_headers)
        
        # Style headers
        for col_num, cell in enumerate(ws_alerts[1], 1):
            cell.fill = header_fill
            cell.font = header_font
            cell.border = border
            cell.alignment = Alignment(horizontal="center")
        
        # Get active alerts
        alerts = EquipmentAlert.objects.filter(resolved=False).order_by('-created_at')[:50]
        
        if alerts.exists():
            for alert in alerts:
                alert_data = [
                    alert.equipment_name,
                    alert.alert_type,
                    alert.parameter,
                    round(alert.value, 2),
                    round(alert.threshold, 2),
                    alert.message,
                    alert.created_at.strftime('%Y-%m-%d %H:%M')
                ]
                ws_alerts.append(alert_data)
                
                # Add borders
                for cell in ws_alerts[ws_alerts.max_row]:
                    cell.border = border
                
                # Color code by type
                if alert.alert_type == 'CRITICAL':
                    for cell in ws_alerts[ws_alerts.max_row]:
                        cell.fill = PatternFill(start_color="FFCCCC", end_color="FFCCCC", fill_type="solid")
                elif alert.alert_type == 'WARNING':
                    for cell in ws_alerts[ws_alerts.max_row]:
                        cell.fill = PatternFill(start_color="FFFFCC", end_color="FFFFCC", fill_type="solid")
        else:
            ws_alerts.append(["No active alerts"])
        
        # Auto-size columns
        for column in ws_alerts.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws_alerts.column_dimensions[column_letter].width = adjusted_width
        
        # ========================================
        # Save and return
        # ========================================
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="equipment_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
        
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Excel export error: {error_details}")
        return Response({
            'error': f'Failed to generate Excel report: {str(e)}',
            'details': error_details
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_alerts(request):
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
            'resolved_at': alert.resolved_at,
            'predicted_failure_date': alert.predicted_failure_date,
            'confidence_score': alert.confidence_score
        })
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
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
    equipment_names = request.data.get('equipment_names', [])
    
    if len(equipment_names) < 2:
        return Response({'error': 'Select at least 2 equipment'}, status=400)
    
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
def get_maintenance_schedule(request):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_equipment_rankings(request):
    """Get equipment performance rankings"""
    rankings = EquipmentRanking.objects.all()[:20]
    
    data = []
    for i, ranking in enumerate(rankings, start=1):
        data.append({
            'rank': i,
            'equipment_name': ranking.equipment_name,
            'equipment_type': ranking.equipment_type,
            'overall_score': ranking.overall_score,
            'efficiency_rank': ranking.efficiency_rank,
            'reliability_rank': ranking.reliability_rank,
            'performance_rank': ranking.performance_rank
        })
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_email_report(request):
    """Schedule automated email reports"""
    EmailReportSchedule.objects.create(
        user=request.user,
        frequency=request.data.get('frequency'),
        email=request.data.get('email'),
        include_summary=request.data.get('include_summary', True),
        include_charts=request.data.get('include_charts', True),
        include_alerts=request.data.get('include_alerts', True),
        include_analytics=request.data.get('include_analytics', True)
    )
    
    return Response({'success': True, 'message': 'Email report scheduled'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_email_schedules(request):
    """Get user's email schedules"""
    schedules = EmailReportSchedule.objects.filter(user=request.user)
    
    data = []
    for schedule in schedules:
        data.append({
            'id': schedule.id,
            'frequency': schedule.frequency,
            'email': schedule.email,
            'include_summary': schedule.include_summary,
            'include_charts': schedule.include_charts,
            'include_alerts': schedule.include_alerts,
            'include_analytics': schedule.include_analytics,
            'active': schedule.active,
            'last_sent': schedule.last_sent
        })
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_email_schedule(request, schedule_id):
    """Update email schedule"""
    try:
        schedule = EmailReportSchedule.objects.get(id=schedule_id, user=request.user)
        schedule.active = request.data.get('active', schedule.active)
        schedule.frequency = request.data.get('frequency', schedule.frequency)
        schedule.email = request.data.get('email', schedule.email)
        schedule.save()
        
        return Response({'success': True})
    except EmailReportSchedule.DoesNotExist:
        return Response({'error': 'Schedule not found'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_email_schedule(request, schedule_id):
    """Delete email schedule"""
    try:
        schedule = EmailReportSchedule.objects.get(id=schedule_id, user=request.user)
        schedule.delete()
        return Response({'success': True})
    except EmailReportSchedule.DoesNotExist:
        return Response({'error': 'Schedule not found'}, status=404)