from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, DeliveryProvider, DeliveryAgentProfile, Shipment, ShipmentStatusHistory


class ShipSyncApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create sample providers
        self.provider = DeliveryProvider.objects.create(
            name='SwiftLogistics Express',
            code='SWIFT',
            description='30 min courier',
            service_tier='Express',
            base_fee=8.00,
            per_km_rate=1.50,
            rating=4.95,
            estimated_delivery_time='30 mins',
            is_active=True
        )

        # Create User
        self.user = User.objects.create_user(
            username='testuser',
            email='user@test.com',
            password='TestPassword123',
            role='user',
            company_name='Test Roasters Ltd'
        )

        # Create Agent User
        self.agent = User.objects.create_user(
            username='testagent',
            email='agent@test.com',
            password='TestPassword123',
            role='agent'
        )
        self.agent_profile = DeliveryAgentProfile.objects.create(
            user=self.agent,
            provider=self.provider,
            vehicle_type='E-Bike',
            vehicle_number='TEST-01'
        )

    def test_user_login(self):
        url = reverse('auth_login')
        response = self.client.post(url, {
            'username': 'testuser',
            'password': 'TestPassword123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['role'], 'user')

    def test_user_registration(self):
        url = reverse('auth_register')
        payload = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'Password@123',
            'password_confirm': 'Password@123',
            'role': 'user',
            'phone_number': '+15551234567'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['username'], 'newuser')

    def test_provider_list(self):
        url = reverse('delivery_providers')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_user_create_delivery(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('shipment_list')
        payload = {
            'provider': self.provider.id,
            'recipient_name': 'Alice Wonderland',
            'recipient_phone': '+15550009999',
            'recipient_email': 'alice@example.com',
            'dropoff_address': '500 Market St, SF',
            'dropoff_lat': 37.7900,
            'dropoff_lng': -122.4000,
            'pickup_address': '101 Mission St, SF',
            'pickup_lat': 37.7700,
            'pickup_lng': -122.4100,
            'package_title': 'Specialty Organic Coffee Beans',
            'category': 'Food & Groceries',
            'weight_kg': 2.0,
            'is_fragile': False,
            'delivery_fee': 13.50
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tracking_number', response.data)
        self.assertEqual(response.data['status'], 'ORDER_PLACED')
        return response.data['id']

    def test_agent_claim_and_status_progression(self):
        # 1. User creates delivery
        shipment_id = self.test_user_create_delivery()

        # 2. Agent claims shipment
        self.client.force_authenticate(user=self.agent)
        assign_url = reverse('shipment_assign_agent', kwargs={'pk': shipment_id})
        assign_res = self.client.patch(assign_url, {}, format='json')
        self.assertEqual(assign_res.status_code, status.HTTP_200_OK)
        self.assertEqual(assign_res.data['status'], 'ASSIGNED_TO_AGENT')

        # 3. Agent updates to PICKED_UP
        status_url = reverse('shipment_update_status', kwargs={'pk': shipment_id})
        res_pickup = self.client.patch(status_url, {'status': 'PICKED_UP'}, format='json')
        self.assertEqual(res_pickup.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pickup.data['status'], 'PICKED_UP')

        # 4. Agent updates to IN_TRANSIT
        res_transit = self.client.patch(status_url, {'status': 'IN_TRANSIT'}, format='json')
        self.assertEqual(res_transit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_transit.data['status'], 'IN_TRANSIT')

        # 5. Agent updates live GPS location ping
        shipment = Shipment.objects.get(id=shipment_id)
        loc_url = reverse('shipment_live_location', kwargs={'identifier': shipment.tracking_number})
        loc_res = self.client.post(loc_url, {'lat': 37.7850, 'lng': -122.4050, 'speed': 25.0}, format='json')
        self.assertEqual(loc_res.status_code, status.HTTP_200_OK)

        # 6. Complete delivery with OTP
        otp = shipment.delivery_otp
        res_deliv = self.client.patch(status_url, {'status': 'DELIVERED', 'otp': otp}, format='json')
        self.assertEqual(res_deliv.status_code, status.HTTP_200_OK)
        self.assertEqual(res_deliv.data['status'], 'DELIVERED')
