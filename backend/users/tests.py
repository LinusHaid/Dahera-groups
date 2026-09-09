from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import time
from attendance.models import Attendance

User = get_user_model()

class UserTerminationAndPasswordTestCase(TestCase):
    def setUp(self):
        self.male_user = User.objects.create_user(
            username='male_test@thahira.com',
            email='male_test@thahira.com',
            password='9876543210',
            gender=User.Gender.MALE,
            role=User.Role.EMPLOYEE,
            phone='9876543210',
            employee_id='THG-M-99'
        )

    def test_scheduled_login_times(self):
        self.assertEqual(self.male_user.get_scheduled_login_time(), "10:00 AM")
        self.assertEqual(self.male_user.get_scheduled_login_time_obj(), time(10, 0, 0))

    def test_termination_status(self):
        self.assertTrue(self.male_user.is_active)
        self.assertEqual(self.male_user.status, User.Status.ACTIVE)
        
        # Terminate employee
        self.male_user.is_active = False
        self.male_user.status = User.Status.TERMINATED
        self.male_user.save()

        self.assertFalse(self.male_user.is_active)
        self.assertEqual(self.male_user.status, User.Status.TERMINATED)

    def test_password_change(self):
        self.assertTrue(self.male_user.check_password('9876543210'))
        self.male_user.set_password('NewSecurePass@2026')
        self.male_user.save()
        self.assertTrue(self.male_user.check_password('NewSecurePass@2026'))

class NotificationReadTestCase(TestCase):
    def setUp(self):
        from users.models import Notification
        self.user = User.objects.create_user(
            username='emp_notif@thahira.com',
            email='emp_notif@thahira.com',
            password='Password123',
            role=User.Role.EMPLOYEE
        )
        self.notification = Notification.objects.create(
            title='Test Broadcast',
            message='Test message',
            target='ALL'
        )

    def test_notification_mark_read(self):
        from users.serializers import NotificationSerializer
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = self.user

        serializer = NotificationSerializer(self.notification, context={'request': request})
        self.assertFalse(serializer.data['is_read'])

        self.notification.read_by.add(self.user)

        serializer_after = NotificationSerializer(self.notification, context={'request': request})
        self.assertTrue(serializer_after.data['is_read'])

    def test_mark_all_read_endpoint(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        response = client.post('/api/users/notifications/mark-all-read/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.notification.read_by.filter(id=self.user.id).exists())

    def test_backup_db_endpoint(self):
        from rest_framework.test import APIClient
        admin_user = User.objects.create_user(
            username='admin_test@thahira.com',
            email='admin_test@thahira.com',
            password='Password123',
            role=User.Role.ADMIN
        )
        client = APIClient()
        client.force_authenticate(user=admin_user)
        
        response = client.get('/api/users/employees/backup-db/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/x-sqlite3')


