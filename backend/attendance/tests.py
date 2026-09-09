from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime
import zoneinfo

from .models import Attendance

User = get_user_model()

class AttendanceLateStatusTestCase(TestCase):
    def setUp(self):
        self.female_user = User.objects.create_user(
            username='female_emp@thahira.com',
            email='female_emp@thahira.com',
            password='Password123',
            gender=User.Gender.FEMALE,
            role=User.Role.EMPLOYEE,
            employee_id='THG-F-01'
        )

        self.male_user = User.objects.create_user(
            username='male_emp@thahira.com',
            email='male_emp@thahira.com',
            password='Password123',
            gender=User.Gender.MALE,
            role=User.Role.EMPLOYEE,
            employee_id='THG-M-01'
        )

    def test_female_late_check_in(self):
        tz = zoneinfo.ZoneInfo('Asia/Kolkata')
        dt_late = datetime(2026, 9, 5, 10, 14, 0, tzinfo=tz)
        
        att = Attendance.objects.create(
            employee=self.female_user,
            date=dt_late.date(),
            check_in=dt_late
        )
        self.assertEqual(att.status, Attendance.Status.LATE)

    def test_female_on_time_check_in(self):
        tz = zoneinfo.ZoneInfo('Asia/Kolkata')
        dt_ontime = datetime(2026, 9, 5, 9, 28, 0, tzinfo=tz)
        
        att = Attendance.objects.create(
            employee=self.female_user,
            date=dt_ontime.date(),
            check_in=dt_ontime
        )
        self.assertEqual(att.status, Attendance.Status.ON_TIME)

    def test_male_late_check_in(self):
        tz = zoneinfo.ZoneInfo('Asia/Kolkata')
        dt_late = datetime(2026, 9, 5, 10, 14, 0, tzinfo=tz)
        
        att = Attendance.objects.create(
            employee=self.male_user,
            date=dt_late.date(),
            check_in=dt_late
        )
        self.assertEqual(att.status, Attendance.Status.LATE)

    def test_auto_checkout_unclosed_records(self):
        tz = zoneinfo.ZoneInfo('Asia/Kolkata')
        past_checkin = datetime(2026, 9, 1, 9, 30, 0, tzinfo=tz)
        
        att = Attendance.objects.create(
            employee=self.female_user,
            date=past_checkin.date(),
            check_in=past_checkin
        )
        self.assertIsNone(att.check_out)

        count = Attendance.auto_checkout_unclosed_records()
        self.assertGreaterEqual(count, 1)

        att.refresh_from_db()
        self.assertIsNotNone(att.check_out)
        local_checkout = timezone.localtime(att.check_out)
        self.assertEqual(local_checkout.hour, 20)
        self.assertEqual(local_checkout.minute, 0)
        self.assertGreater(att.working_hours, 0.0)

