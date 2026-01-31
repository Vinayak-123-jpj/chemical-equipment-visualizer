import pandas as pd
from rest_framework.decorators import api_view, permission_classes

from rest_framework.response import Response
from .models import Dataset


from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_csv(request):

    file = request.FILES.get('file')

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    df = pd.read_csv(file)

    summary = {
        "total_records": len(df),
        "avg_flowrate": df["Flowrate"].mean(),
        "avg_pressure": df["Pressure"].mean(),
        "avg_temperature": df["Temperature"].mean(),
        "type_distribution": df["Type"].value_counts().to_dict()
    }

    Dataset.objects.create(
        total_records=summary["total_records"],
        avg_flowrate=summary["avg_flowrate"],
        avg_pressure=summary["avg_pressure"],
        avg_temperature=summary["avg_temperature"],
    )

    return Response(summary)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history(request):

    datasets = Dataset.objects.order_by('-uploaded_at')[:5]

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
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from django.http import HttpResponse
from io import BytesIO
from .models import Dataset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):

    dataset = Dataset.objects.order_by('-uploaded_at').first()

    if not dataset:
        return Response({"error": "No data available"}, status=400)

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)

    p.setFont("Helvetica", 14)
    p.drawString(50, 800, "Chemical Equipment Analysis Report")

    p.setFont("Helvetica", 11)
    p.drawString(50, 760, f"Total Records: {dataset.total_records}")
    p.drawString(50, 740, f"Average Flowrate: {dataset.avg_flowrate:.2f}")
    p.drawString(50, 720, f"Average Pressure: {dataset.avg_pressure:.2f}")
    p.drawString(50, 700, f"Average Temperature: {dataset.avg_temperature:.2f}")
    p.drawString(50, 670, f"Uploaded At: {dataset.uploaded_at}")

    p.showPage()
    p.save()

    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="equipment_report.pdf"'

    return response
