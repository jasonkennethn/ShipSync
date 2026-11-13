from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_health(request):
    return JsonResponse({
        'application': 'ShipSync API',
        'version': '1.0.0',
        'status': 'healthy',
        'endpoints': {
            'auth': '/api/auth/',
            'providers': '/api/providers/',
            'shipments': '/api/shipments/',
            'analytics': '/api/analytics/',
            'seed_demo': '/api/seed/'
        }
    })

urlpatterns = [
    path('', api_health, name='api_health'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
