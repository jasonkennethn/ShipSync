from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomLoginView,
    UserProfileView,
    DeliveryProviderListView,
    DeliveryAgentListView,
    ShipmentListView,
    ShipmentDetailView,
    ShipmentAssignAgentView,
    ShipmentUpdateStatusView,
    ShipmentLiveLocationView,
    AnalyticsDashboardView,
    SeedDemoDataView,
    CloudObjectUploadView
)

urlpatterns = [
    # Authentication
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', CustomLoginView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='auth_profile'),

    # Cloud Object Storage
    path('upload/', CloudObjectUploadView.as_view(), name='cloud_upload'),

    # Delivery Providers & Agents
    path('providers/', DeliveryProviderListView.as_view(), name='delivery_providers'),
    path('agents/', DeliveryAgentListView.as_view(), name='delivery_agents'),

    # Shipments
    path('shipments/', ShipmentListView.as_view(), name='shipment_list'),
    path('shipments/<str:identifier>/', ShipmentDetailView.as_view(), name='shipment_detail'),
    path('shipments/<int:pk>/assign/', ShipmentAssignAgentView.as_view(), name='shipment_assign_agent'),
    path('shipments/<int:pk>/status/', ShipmentUpdateStatusView.as_view(), name='shipment_update_status'),
    path('shipments/<str:identifier>/location/', ShipmentLiveLocationView.as_view(), name='shipment_live_location'),

    # Analytics & Seeder
    path('analytics/', AnalyticsDashboardView.as_view(), name='analytics_dashboard'),
    path('seed/', SeedDemoDataView.as_view(), name='seed_demo_data'),
]

