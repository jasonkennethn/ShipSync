import random
import string
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import (
    User,
    DeliveryProvider,
    DeliveryAgentProfile,
    Shipment,
    ShipmentStatusHistory,
    LiveLocationPing
)


class UserRegistrationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    provider_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    vehicle_type = serializers.CharField(write_only=True, required=False, default='Motorcycle')
    vehicle_number = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password',
            'password_confirm',
            'role',
            'phone_number',
            'address',
            'company_name',
            'provider_id',
            'vehicle_type',
            'vehicle_number'
        ]

    def validate(self, attrs):
        pw_confirm = attrs.get('password_confirm')
        if pw_confirm and attrs.get('password') != pw_confirm:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        provider_id = validated_data.pop('provider_id', None)
        vehicle_type = validated_data.pop('vehicle_type', 'Motorcycle')
        vehicle_number = validated_data.pop('vehicle_number', '')

        email = validated_data.get('email', '').strip().lower()
        username = validated_data.get('username', '').strip()
        
        if not username:
            # Generate username from email
            base_name = email.split('@')[0]
            username = base_name
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_name}_{counter}"
                counter += 1

        raw_role = validated_data.get('role', 'user')
        if raw_role in ['delivery_agent', 'agent']:
            user_role = 'agent'
        else:
            user_role = 'user'

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            role=user_role,
            phone_number=validated_data.get('phone_number', ''),
            address=validated_data.get('address', ''),
            company_name=validated_data.get('company_name', '')
        )

        if user.role == 'agent':
            provider = None
            if provider_id:
                provider = DeliveryProvider.objects.filter(id=provider_id).first()
            if not provider:
                provider = DeliveryProvider.objects.first()

            DeliveryAgentProfile.objects.create(
                user=user,
                provider=provider,
                vehicle_type=vehicle_type,
                vehicle_number=vehicle_number
            )

        return user


class DeliveryProviderSerializer(serializers.ModelSerializer):
    agent_count = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryProvider
        fields = '__all__'

    def get_agent_count(self, obj):
        return obj.agents.count()


class DeliveryAgentProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, default='Independent')

    class Meta:
        model = DeliveryAgentProfile
        fields = [
            'id',
            'username',
            'email',
            'phone_number',
            'provider',
            'provider_name',
            'vehicle_type',
            'vehicle_number',
            'current_lat',
            'current_lng',
            'is_available',
            'rating',
            'total_completed_trips'
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    agent_profile = DeliveryAgentProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'role',
            'phone_number',
            'address',
            'company_name',
            'avatar_url',
            'agent_profile',
            'created_at'
        ]


class ShipmentStatusHistorySerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, default='System')

    class Meta:
        model = ShipmentStatusHistory
        fields = [
            'id',
            'status',
            'title',
            'description',
            'lat',
            'lng',
            'updated_by_name',
            'created_at'
        ]


class LiveLocationPingSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveLocationPing
        fields = ['id', 'lat', 'lng', 'speed_kmh', 'heading_deg', 'timestamp']


class ShipmentSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.username', read_only=True)
    vendor_company = serializers.CharField(source='vendor.company_name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True, default='')
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    provider_icon = serializers.CharField(source='provider.icon_name', read_only=True)
    provider_tier = serializers.CharField(source='provider.service_tier', read_only=True)
    agent_name = serializers.CharField(source='assigned_agent.username', read_only=True, default='Unassigned')
    agent_phone = serializers.CharField(source='assigned_agent.phone_number', read_only=True, default='')
    agent_vehicle = serializers.SerializerMethodField()
    timeline = ShipmentStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = [
            'id',
            'tracking_number',
            'vendor',
            'vendor_name',
            'vendor_company',
            'customer',
            'customer_username',
            'provider',
            'provider_name',
            'provider_icon',
            'provider_tier',
            'assigned_agent',
            'agent_name',
            'agent_phone',
            'agent_vehicle',
            'recipient_name',
            'recipient_phone',
            'recipient_email',
            'dropoff_address',
            'dropoff_lat',
            'dropoff_lng',
            'pickup_address',
            'pickup_lat',
            'pickup_lng',
            'package_title',
            'category',
            'weight_kg',
            'is_fragile',
            'special_notes',
            'status',
            'current_lat',
            'current_lng',
            'delivery_fee',
            'base_cost',
            'distance_cost',
            'weight_cost',
            'driver_payout',
            'provider_commission',
            'delivery_otp',
            'delivery_proof_notes',
            'estimated_delivery_time',
            'delivered_at',
            'timeline',
            'created_at',
            'updated_at'
        ]

    def get_agent_vehicle(self, obj):
        if obj.assigned_agent and hasattr(obj.assigned_agent, 'agent_profile'):
            return f"{obj.assigned_agent.agent_profile.vehicle_type} ({obj.assigned_agent.agent_profile.vehicle_number or 'Standard'})"
        return 'Standard'


class ShipmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = [
            'provider',
            'recipient_name',
            'recipient_phone',
            'recipient_email',
            'dropoff_address',
            'dropoff_lat',
            'dropoff_lng',
            'pickup_address',
            'pickup_lat',
            'pickup_lng',
            'package_title',
            'category',
            'weight_kg',
            'is_fragile',
            'special_notes',
            'delivery_fee',
            'base_cost',
            'distance_cost',
            'weight_cost',
            'driver_payout',
            'provider_commission'
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['vendor'] = user

        recipient_email = validated_data.get('recipient_email')
        if recipient_email:
            matched_user = User.objects.filter(email__iexact=recipient_email).first()
            if matched_user:
                validated_data['customer'] = matched_user

        pickup_lat = validated_data.get('pickup_lat', 37.7749)
        pickup_lng = validated_data.get('pickup_lng', -122.4194)
        validated_data['current_lat'] = pickup_lat
        validated_data['current_lng'] = pickup_lng

        total_fee = validated_data.get('delivery_fee')
        if not total_fee:
            base = 6.00
            weight = float(validated_data.get('weight_kg', 1.5))
            dist = 4.50
            total_fee = base + dist + (weight * 1.5)
            validated_data['delivery_fee'] = total_fee
            validated_data['base_cost'] = base
            validated_data['distance_cost'] = dist
            validated_data['weight_cost'] = weight * 1.5
            validated_data['driver_payout'] = round(float(total_fee) * 0.78, 2)
            validated_data['provider_commission'] = round(float(total_fee) * 0.22, 2)

        shipment = Shipment.objects.create(**validated_data)

        ShipmentStatusHistory.objects.create(
            shipment=shipment,
            status='ORDER_PLACED',
            title='Order Registered with Provider',
            description=f'Delivery order booked via {shipment.provider.name}. Ready for courier assignment.',
            lat=pickup_lat,
            lng=pickup_lng,
            updated_by=user
        )

        return shipment
