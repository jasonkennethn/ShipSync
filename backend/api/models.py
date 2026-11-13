import random
import string
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


def generate_tracking_number():
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"SYNC-{random_str}"


def generate_delivery_otp():
    return ''.join(random.choices(string.digits, k=4))


class User(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('agent', 'Delivery Agent'),
        # Backward compatibility aliases
        ('customer', 'User'),
        ('vendor', 'User'),
        ('delivery_agent', 'Delivery Agent'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    phone_number = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    company_name = models.CharField(max_length=150, blank=True, default='')
    avatar_url = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class DeliveryProvider(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, default='')
    service_tier = models.CharField(max_length=50, default='Standard Delivery')
    base_fee = models.DecimalField(max_digits=8, decimal_places=2, default=5.00)
    per_km_rate = models.DecimalField(max_digits=8, decimal_places=2, default=1.20)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=4.90)
    estimated_delivery_time = models.CharField(max_length=50, default='30-60 mins')
    is_active = models.BooleanField(default=True)
    icon_name = models.CharField(max_length=50, default='Truck')
    coverage_area = models.CharField(max_length=100, default='Metro Region')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.service_tier})"


class DeliveryAgentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    provider = models.ForeignKey(
        DeliveryProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agents'
    )
    vehicle_type = models.CharField(max_length=50, default='Motorcycle')
    vehicle_number = models.CharField(max_length=30, blank=True, default='')
    current_lat = models.FloatField(default=37.7749)
    current_lng = models.FloatField(default=-122.4194)
    is_available = models.BooleanField(default=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=4.95)
    total_completed_trips = models.PositiveIntegerField(default=0)

    def __str__(self):
        provider_name = self.provider.name if self.provider else 'Freelance / Direct'
        return f"Agent: {self.user.username} - {provider_name}"


class Shipment(models.Model):
    STATUS_CHOICES = (
        ('ORDER_PLACED', 'Order Placed'),
        ('ASSIGNED_TO_AGENT', 'Assigned to Agent'),
        ('PICKED_UP', 'Picked Up'),
        ('IN_TRANSIT', 'In Transit'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    )

    tracking_number = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        default=generate_tracking_number
    )
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_shipments')
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customer_orders'
    )
    provider = models.ForeignKey(
        DeliveryProvider,
        on_delete=models.PROTECT,
        related_name='shipments'
    )
    assigned_agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries_assigned'
    )

    # Recipient / Dropoff Info
    recipient_name = models.CharField(max_length=120)
    recipient_phone = models.CharField(max_length=30)
    recipient_email = models.EmailField(blank=True, default='')
    dropoff_address = models.TextField()
    dropoff_lat = models.FloatField(default=37.7833)
    dropoff_lng = models.FloatField(default=-122.4067)

    # Pickup Info
    pickup_address = models.TextField()
    pickup_lat = models.FloatField(default=37.7749)
    pickup_lng = models.FloatField(default=-122.4194)

    # Package Info
    package_title = models.CharField(max_length=200)
    category = models.CharField(max_length=60, default='General Goods')
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=1.50)
    is_fragile = models.BooleanField(default=False)
    special_notes = models.TextField(blank=True, default='')

    # Status & Live Tracking
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='ORDER_PLACED')
    current_lat = models.FloatField(default=37.7749)
    current_lng = models.FloatField(default=-122.4194)
    
    # Cost & Pricing breakdown
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=12.50)
    base_cost = models.DecimalField(max_digits=8, decimal_places=2, default=6.00)
    distance_cost = models.DecimalField(max_digits=8, decimal_places=2, default=4.50)
    weight_cost = models.DecimalField(max_digits=8, decimal_places=2, default=2.00)
    driver_payout = models.DecimalField(max_digits=8, decimal_places=2, default=9.50)
    provider_commission = models.DecimalField(max_digits=8, decimal_places=2, default=3.00)

    delivery_otp = models.CharField(max_length=6, default=generate_delivery_otp)
    delivery_proof_notes = models.TextField(blank=True, default='')

    estimated_delivery_time = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tracking_number} - {self.package_title} ({self.status})"


class ShipmentStatusHistory(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='timeline')
    status = models.CharField(max_length=30)
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.shipment.tracking_number} -> {self.status} at {self.created_at}"


class LiveLocationPing(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='pings')
    agent = models.ForeignKey(User, on_delete=models.CASCADE)
    lat = models.FloatField()
    lng = models.FloatField()
    speed_kmh = models.FloatField(default=0.0)
    heading_deg = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Ping for {self.shipment.tracking_number}: ({self.lat}, {self.lng})"
