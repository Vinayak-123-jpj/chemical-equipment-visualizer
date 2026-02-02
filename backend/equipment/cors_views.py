from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['OPTIONS', 'POST'])
@permission_classes([AllowAny])
def upload_csv_wrapper(request):
    """
    Wrapper to handle CORS preflight requests
    """
    if request.method == 'OPTIONS':
        return Response(status=200)
    
    # Import the actual upload function
    from .views import upload_csv
    return upload_csv(request)