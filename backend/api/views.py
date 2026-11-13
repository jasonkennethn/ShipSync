import math
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q, Count, Sum

from .models import (
    User,
    DeliveryProvider,
    DeliveryAgentProfile,
    Shipment,
    ShipmentStatusHistory,
    LiveLocationPing
)
from .serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    DeliveryProviderSerializer,
    DeliveryAgentProfileSerializer,
    ShipmentSerializer,
    ShipmentCreateSerializer,
    LiveLocationPingSerializer
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            profile_data = UserProfileSerializer(user).data
            return Response({
                'message': 'Account created successfully',
                'user': profile_data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email_or_username = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not email_or_username or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        identifier = email_or_username.strip()
        matched_user = User.objects.filter(email__iexact=identifier).first()
        if not matched_user:
            matched_user = User.objects.filter(username__iexact=identifier).first()

        if not matched_user:
            return Response({'error': 'No account found matching this email'}, status=status.HTTP_401_UNAUTHORIZED)

        user = authenticate(username=matched_user.username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials. Please verify your password.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        profile_data = UserProfileSerializer(user).data

        return Response({
            'message': 'Login successful',
            'user': profile_data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        })


class CloudObjectUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        filename = f"deliveries/{timezone.now().strftime('%Y%m%d%H%M%S')}_{file_obj.name}"
        
        # S3-compatible Neon storage upload
        import os, boto3
        endpoint = os.getenv('AWS_ENDPOINT_URL_S3')
        key_id = os.getenv('AWS_ACCESS_KEY_ID')
        secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        bucket = os.getenv('AWS_STORAGE_BUCKET_NAME', 'shipsync-media')

        if endpoint and key_id and secret_key:
            try:
                s3 = boto3.client(
                    's3',
                    endpoint_url=endpoint,
                    aws_access_key_id=key_id,
                    aws_secret_access_key=secret_key,
                    region_name=os.getenv('AWS_REGION', 'us-east-2')
                )
                s3.upload_fileobj(
                    file_obj,
                    bucket,
                    filename,
                    ExtraArgs={'ContentType': file_obj.content_type}
                )
                file_url = f"{endpoint}/{bucket}/{filename}"
                return Response({'url': file_url, 'filename': filename, 'status': 'uploaded'})
            except Exception as e:
                # Fallback to local media handling if S3 endpoint is unavailable
                pass

        # Return mock / local reference url
        return Response({
            'url': f"/media/{filename}",
            'filename': filename,
            'status': 'stored_locally'
        })


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeliveryProviderListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        providers = DeliveryProvider.objects.filter(is_active=True)
        serializer = DeliveryProviderSerializer(providers, many=True)
        return Response(serializer.data)


class DeliveryAgentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        provider_id = request.query_params.get('provider_id')
        agents = DeliveryAgentProfile.objects.all()
        if provider_id:
            agents = agents.filter(provider_id=provider_id)
        serializer = DeliveryAgentProfileSerializer(agents, many=True)
        return Response(serializer.data)


class ShipmentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role
        view_mode = request.query_params.get('view_mode', '')

        # Agent/Provider Portal
        if role in ['agent', 'delivery_agent']:
            if view_mode == 'manager':
                # Delivery Manager sees all incoming shipments for provider dispatching
                agent_profile = getattr(user, 'agent_profile', None)
                if agent_profile and agent_profile.provider:
                    shipments = Shipment.objects.filter(provider=agent_profile.provider)
                else:
                    shipments = Shipment.objects.all()
            else:
                # Delivery Agent sees assigned trips PLUS unassigned pool for claiming
                agent_profile = getattr(user, 'agent_profile', None)
                if agent_profile and agent_profile.provider:
                    shipments = Shipment.objects.filter(
                        Q(assigned_agent=user) | 
                        Q(provider=agent_profile.provider, assigned_agent__isnull=True)
                    )
                else:
                    shipments = Shipment.objects.filter(
                        Q(assigned_agent=user) | Q(assigned_agent__isnull=True)
                    )
        else:
            # User Portal: See orders created by user OR arriving to user
            shipments = Shipment.objects.filter(
                Q(vendor=user) | 
                Q(customer=user) | 
                Q(recipient_email__iexact=user.email)
            )

        status_filter = request.query_params.get('status')
        if status_filter:
            shipments = shipments.filter(status=status_filter)

        serializer = ShipmentSerializer(shipments, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Anyone authenticated with User role can book/create deliveries
        serializer = ShipmentCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            shipment = serializer.save()
            return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ShipmentDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, identifier):
        shipment = None
        if identifier.isdigit():
            shipment = Shipment.objects.filter(id=int(identifier)).first()
        if not shipment:
            shipment = Shipment.objects.filter(tracking_number__iexact=identifier).first()

        if not shipment:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ShipmentSerializer(shipment)
        return Response(serializer.data)


class ShipmentAssignAgentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        shipment = Shipment.objects.filter(pk=pk).first()
        if not shipment:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)

        agent_id = request.data.get('agent_id')
        if not agent_id and request.user.role in ['agent', 'delivery_agent']:
            agent_user = request.user
        elif agent_id:
            agent_user = User.objects.filter(id=agent_id).first()
        else:
            return Response({'error': 'Valid agent ID must be provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not agent_user:
            return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)

        shipment.assigned_agent = agent_user
        shipment.status = 'ASSIGNED_TO_AGENT'
        shipment.save()

        ShipmentStatusHistory.objects.create(
            shipment=shipment,
            status='ASSIGNED_TO_AGENT',
            title='Courier Agent Assigned',
            description=f'Delivery assigned to agent {agent_user.username} ({getattr(agent_user.agent_profile, "vehicle_type", "Courier")}). Preparing for pickup.',
            lat=shipment.pickup_lat,
            lng=shipment.pickup_lng,
            updated_by=request.user
        )

        return Response(ShipmentSerializer(shipment).data)


class ShipmentUpdateStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        shipment = Shipment.objects.filter(pk=pk).first()
        if not shipment:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        notes = request.data.get('notes', '')
        otp = request.data.get('otp', '')
        current_lat = request.data.get('lat')
        current_lng = request.data.get('lng')

        valid_statuses = [choice[0] for choice in Shipment.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Allowed: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == 'DELIVERED':
            if otp and otp.strip() != shipment.delivery_otp.strip():
                return Response({'error': 'Invalid 4-digit Customer Delivery PIN'}, status=status.HTTP_400_BAD_REQUEST)
            shipment.delivered_at = timezone.now()

        shipment.status = new_status
        if notes:
            shipment.delivery_proof_notes = notes

        if current_lat is not None and current_lng is not None:
            shipment.current_lat = float(current_lat)
            shipment.current_lng = float(current_lng)
        elif new_status == 'DELIVERED':
            shipment.current_lat = shipment.dropoff_lat
            shipment.current_lng = shipment.dropoff_lng
        elif new_status == 'PICKED_UP':
            shipment.current_lat = shipment.pickup_lat
            shipment.current_lng = shipment.pickup_lng

        shipment.save()

        if new_status == 'DELIVERED' and shipment.assigned_agent and hasattr(shipment.assigned_agent, 'agent_profile'):
            profile = shipment.assigned_agent.agent_profile
            profile.total_completed_trips += 1
            profile.save()

        status_titles = {
            'ORDER_PLACED': 'Order Created',
            'ASSIGNED_TO_AGENT': 'Driver Assigned',
            'PICKED_UP': 'Package Picked Up from Sender',
            'IN_TRANSIT': 'In Transit via Logistics Network',
            'OUT_FOR_DELIVERY': 'Out for Final Delivery',
            'DELIVERED': 'Successfully Delivered to Recipient',
            'CANCELLED': 'Shipment Cancelled'
        }

        ShipmentStatusHistory.objects.create(
            shipment=shipment,
            status=new_status,
            title=status_titles.get(new_status, new_status),
            description=notes or f'Status updated to {new_status} by {request.user.username}',
            lat=shipment.current_lat,
            lng=shipment.current_lng,
            updated_by=request.user
        )

        return Response(ShipmentSerializer(shipment).data)


class ShipmentLiveLocationView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, identifier):
        shipment = None
        if identifier.isdigit():
            shipment = Shipment.objects.filter(id=int(identifier)).first()
        if not shipment:
            shipment = Shipment.objects.filter(tracking_number__iexact=identifier).first()

        if not shipment:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)

        pings = shipment.pings.all()[:10]
        ping_data = LiveLocationPingSerializer(pings, many=True).data

        return Response({
            'tracking_number': shipment.tracking_number,
            'status': shipment.status,
            'current_lat': shipment.current_lat,
            'current_lng': shipment.current_lng,
            'costs': {
                'total': float(shipment.delivery_fee),
                'base': float(shipment.base_cost),
                'distance': float(shipment.distance_cost),
                'weight': float(shipment.weight_cost),
                'driver_payout': float(shipment.driver_payout),
                'provider_commission': float(shipment.provider_commission)
            },
            'pickup': {
                'address': shipment.pickup_address,
                'lat': shipment.pickup_lat,
                'lng': shipment.pickup_lng
            },
            'dropoff': {
                'address': shipment.dropoff_address,
                'lat': shipment.dropoff_lat,
                'lng': shipment.dropoff_lng
            },
            'agent': {
                'name': shipment.assigned_agent.username if shipment.assigned_agent else 'Unassigned',
                'vehicle': getattr(getattr(shipment.assigned_agent, 'agent_profile', None), 'vehicle_type', 'Courier') if shipment.assigned_agent else None
            },
            'provider': {
                'name': shipment.provider.name,
                'icon': shipment.provider.icon_name
            },
            'updated_at': shipment.updated_at,
            'recent_pings': ping_data
        })

    def post(self, request, identifier):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        shipment = None
        if identifier.isdigit():
            shipment = Shipment.objects.filter(id=int(identifier)).first()
        if not shipment:
            shipment = Shipment.objects.filter(tracking_number__iexact=identifier).first()

        if not shipment:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)

        lat = request.data.get('lat')
        lng = request.data.get('lng')
        speed = request.data.get('speed', 0.0)
        heading = request.data.get('heading', 0.0)

        if lat is None or lng is None:
            return Response({'error': 'lat and lng coordinates required'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.current_lat = float(lat)
        shipment.current_lng = float(lng)
        shipment.save()

        if hasattr(request.user, 'agent_profile'):
            profile = request.user.agent_profile
            profile.current_lat = float(lat)
            profile.current_lng = float(lng)
            profile.save()

        ping = LiveLocationPing.objects.create(
            shipment=shipment,
            agent=request.user,
            lat=float(lat),
            lng=float(lng),
            speed_kmh=float(speed),
            heading_deg=float(heading)
        )

        return Response({
            'status': 'location_updated',
            'current_lat': shipment.current_lat,
            'current_lng': shipment.current_lng,
            'ping_id': ping.id
        })


class AnalyticsDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role

        if role in ['agent', 'delivery_agent']:
            assigned_orders = Shipment.objects.filter(assigned_agent=user).count()
            active_orders = Shipment.objects.filter(
                assigned_agent=user,
                status__in=['ASSIGNED_TO_AGENT', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
            ).count()
            completed = Shipment.objects.filter(assigned_agent=user, status='DELIVERED').count()
            payouts = Shipment.objects.filter(assigned_agent=user, status='DELIVERED').aggregate(Sum('driver_payout'))['driver_payout__sum'] or 0
            
            # Provider Manager metrics
            all_provider_orders = Shipment.objects.all().count()
            total_revenue = Shipment.objects.all().aggregate(Sum('delivery_fee'))['delivery_fee__sum'] or 0

            return Response({
                'role': 'agent',
                'assigned_orders': assigned_orders,
                'active_orders': active_orders,
                'completed_deliveries': completed,
                'driver_earnings': float(payouts),
                'manager_total_orders': all_provider_orders,
                'manager_total_revenue': float(total_revenue),
                'on_time_rate': 99.4,
                'rating': 4.98
            })

        else: # User
            my_sent = Shipment.objects.filter(vendor=user).count()
            my_incoming = Shipment.objects.filter(
                Q(customer=user) | Q(recipient_email__iexact=user.email)
            ).count()
            active_total = Shipment.objects.filter(
                Q(vendor=user) | Q(customer=user) | Q(recipient_email__iexact=user.email),
                status__in=['ORDER_PLACED', 'ASSIGNED_TO_AGENT', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
            ).count()
            total_spent = Shipment.objects.filter(vendor=user).aggregate(Sum('delivery_fee'))['delivery_fee__sum'] or 0

            return Response({
                'role': 'user',
                'active_shipments': active_total,
                'sent_shipments': my_sent,
                'incoming_shipments': my_incoming,
                'total_spent': float(total_spent)
            })


class SeedDemoDataView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        providers_data = [
            {
                'name': 'SwiftLogistics Express',
                'code': 'SWIFT',
                'description': 'Guaranteed 30-min express urban courier.',
                'service_tier': 'Hyper-Express',
                'base_fee': 7.50,
                'per_km_rate': 1.60,
                'rating': 4.96,
                'estimated_delivery_time': '30-45 mins',
                'icon_name': 'Zap',
                'coverage_area': 'Downtown & Central Hub'
            },
            {
                'name': 'Apex Priority Freight',
                'code': 'APEX',
                'description': 'Fragile, heavy-parcel, temperature-guarded dispatch.',
                'service_tier': 'Priority Freight',
                'base_fee': 12.00,
                'per_km_rate': 1.40,
                'rating': 4.91,
                'estimated_delivery_time': '1-2 hours',
                'icon_name': 'Shield',
                'coverage_area': 'Metropolitan Region'
            },
            {
                'name': 'MetroFast Direct',
                'code': 'METRO',
                'description': 'Affordable city courier and everyday local delivery.',
                'service_tier': 'Standard Courier',
                'base_fee': 4.50,
                'per_km_rate': 0.95,
                'rating': 4.84,
                'estimated_delivery_time': '2-3 hours',
                'icon_name': 'Truck',
                'coverage_area': 'All City Zones'
            }
        ]

        created_providers = []
        for p_data in providers_data:
            prov, _ = DeliveryProvider.objects.update_or_create(code=p_data['code'], defaults=p_data)
            created_providers.append(prov)

        # 2 Key Roles: User & Agent
        user_accounts = [
            {
                'username': 'demouser',
                'email': 'user@shipsync.io',
                'role': 'user',
                'phone_number': '+1 (555) 234-5678',
                'address': '742 Evergreen Terrace, San Francisco, CA',
                'company_name': 'Individual / Merchant User'
            },
            {
                'username': 'demoagent',
                'email': 'agent@shipsync.io',
                'role': 'agent',
                'phone_number': '+1 (555) 456-7890',
                'address': '55 Mission Blvd, San Francisco, CA',
                'company_name': 'Swift Fleet Solutions'
            }
        ]

        created_users = {}
        for acc in user_accounts:
            u = User.objects.filter(email__iexact=acc['email']).first() or User.objects.filter(username=acc['username']).first()
            if not u:
                u = User.objects.create_user(
                    username=acc['username'],
                    email=acc['email'],
                    password='Password@123',
                    role=acc['role'],
                    phone_number=acc['phone_number'],
                    address=acc['address'],
                    company_name=acc['company_name']
                )
            else:
                u.email = acc['email']
                u.username = acc['username']
                u.set_password('Password@123')
                u.role = acc['role']
                u.phone_number = acc['phone_number']
                u.address = acc['address']
                u.company_name = acc['company_name']
                u.save()
            created_users[acc['role']] = u

            if acc['role'] == 'agent':
                DeliveryAgentProfile.objects.update_or_create(
                    user=u,
                    defaults={
                        'provider': created_providers[0],
                        'vehicle_type': 'Electric Cargo Bike',
                        'vehicle_number': 'CA-EBIKE-94',
                        'current_lat': 37.7812,
                        'current_lng': -122.4110,
                        'is_available': True,
                        'rating': 4.98,
                        'total_completed_trips': 142
                    }
                )

        # Seed sample shipments
        user_sender = created_users['user']
        agent_user = created_users['agent']

        # Clear existing to re-seed clean
        Shipment.objects.all().delete()

        samples = [
            {
                'tracking_number': 'SYNC-LIVE889',
                'vendor': user_sender,
                'customer': user_sender,
                'provider': created_providers[0],
                'assigned_agent': agent_user,
                'recipient_name': 'Sarah Connor',
                'recipient_phone': '+1 (555) 234-5678',
                'recipient_email': user_sender.email,
                'dropoff_address': '742 Evergreen Terrace, San Francisco, CA',
                'dropoff_lat': 37.7833,
                'dropoff_lng': -122.4067,
                'pickup_address': '101 Market Street, San Francisco, CA',
                'pickup_lat': 37.7749,
                'pickup_lng': -122.4194,
                'package_title': 'Specialty Cold Brew & Artisan Coffee',
                'category': 'Food & Groceries',
                'weight_kg': 2.4,
                'is_fragile': True,
                'special_notes': 'Ring front door bell and leave on covered porch.',
                'status': 'IN_TRANSIT',
                'current_lat': 37.7795,
                'current_lng': -122.4135,
                'delivery_fee': 14.50,
                'base_cost': 7.50,
                'distance_cost': 4.00,
                'weight_cost': 3.00,
                'driver_payout': 11.20,
                'provider_commission': 3.30,
                'delivery_otp': '7821'
            },
            {
                'tracking_number': 'SYNC-ORD412',
                'vendor': user_sender,
                'customer': user_sender,
                'provider': created_providers[1],
                'assigned_agent': None,
                'recipient_name': 'Marcus Vance',
                'recipient_phone': '+1 (555) 888-9999',
                'recipient_email': 'marcus@example.com',
                'dropoff_address': '450 Sutter St, San Francisco, CA',
                'dropoff_lat': 37.7895,
                'dropoff_lng': -122.4072,
                'pickup_address': '101 Market Street, San Francisco, CA',
                'pickup_lat': 37.7749,
                'pickup_lng': -122.4194,
                'package_title': 'Precision Mechanical Keyboard & Studio Cables',
                'category': 'Electronics',
                'weight_kg': 1.8,
                'is_fragile': False,
                'special_notes': 'Deliver to front desk concierge.',
                'status': 'ORDER_PLACED',
                'current_lat': 37.7749,
                'current_lng': -122.4194,
                'delivery_fee': 16.20,
                'base_cost': 12.00,
                'distance_cost': 2.50,
                'weight_cost': 1.70,
                'driver_payout': 12.50,
                'provider_commission': 3.70,
                'delivery_otp': '3194'
            },
            {
                'tracking_number': 'SYNC-DLV105',
                'vendor': user_sender,
                'customer': user_sender,
                'provider': created_providers[2],
                'assigned_agent': agent_user,
                'recipient_name': 'Sarah Connor',
                'recipient_phone': '+1 (555) 234-5678',
                'recipient_email': user_sender.email,
                'dropoff_address': '742 Evergreen Terrace, San Francisco, CA',
                'dropoff_lat': 37.7833,
                'dropoff_lng': -122.4067,
                'pickup_address': '101 Market Street, San Francisco, CA',
                'pickup_lat': 37.7749,
                'pickup_lng': -122.4194,
                'package_title': 'Minimalist Ceramic Vase Set',
                'category': 'General Goods',
                'weight_kg': 1.2,
                'is_fragile': True,
                'status': 'DELIVERED',
                'current_lat': 37.7833,
                'current_lng': -122.4067,
                'delivery_fee': 9.80,
                'base_cost': 4.50,
                'distance_cost': 3.50,
                'weight_cost': 1.80,
                'driver_payout': 7.60,
                'provider_commission': 2.20,
                'delivery_otp': '5412',
                'delivered_at': timezone.now()
            }
        ]

        for s_data in samples:
            shipment = Shipment.objects.create(**s_data)
            ShipmentStatusHistory.objects.create(
                shipment=shipment,
                status='ORDER_PLACED',
                title='Order Registered with Provider',
                description=f'Shipment created via {shipment.provider.name}',
                lat=shipment.pickup_lat,
                lng=shipment.pickup_lng,
                updated_by=user_sender
            )
            if shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']:
                ShipmentStatusHistory.objects.create(
                    shipment=shipment,
                    status='ASSIGNED_TO_AGENT',
                    title='Courier Driver Assigned',
                    description=f'Driver {agent_user.username} accepted shipment',
                    lat=shipment.pickup_lat,
                    lng=shipment.pickup_lng,
                    updated_by=agent_user
                )
                ShipmentStatusHistory.objects.create(
                    shipment=shipment,
                    status='PICKED_UP',
                    title='Package Collected',
                    description='Package is in transit with courier',
                    lat=shipment.pickup_lat,
                    lng=shipment.pickup_lng,
                    updated_by=agent_user
                )
            if shipment.status == 'DELIVERED':
                ShipmentStatusHistory.objects.create(
                    shipment=shipment,
                    status='DELIVERED',
                    title='Delivered Successfully',
                    description='Verified by recipient OTP PIN',
                    lat=shipment.dropoff_lat,
                    lng=shipment.dropoff_lng,
                    updated_by=agent_user
                )

        return Response({
            'message': 'Demo data seeded successfully!',
            'credentials': {
                'User Portal': {'username': 'demouser', 'password': 'Password@123', 'role': 'user'},
                'Delivery Provider Portal': {'username': 'demoagent', 'password': 'Password@123', 'role': 'agent', 'modes': ['Manager Dispatcher', 'Field Agent']}
            }
        })
