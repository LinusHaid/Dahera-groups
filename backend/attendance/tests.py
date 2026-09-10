from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime
from decimal import Decimal
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
            employee_id='THG-F-01',
            base_salary=30000.00
        )

        self.male_user = User.objects.create_user(
            username='male_emp@thahira.com',
            email='male_emp@thahira.com',
            password='Password123',
            gender=User.Gender.MALE,
            role=User.Role.EMPLOYEE,
            employee_id='THG-M-01',
            base_salary=30000.00
        )
        self.tz = zoneinfo.ZoneInfo('Asia/Kolkata')

    def test_female_on_time_check_in(self):
        dt = datetime(2026, 9, 5, 9, 30, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.female_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.ON_TIME)
        self.assertEqual(att.late_hours, 0)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('0.00'))

    def test_male_on_time_check_in(self):
        dt = datetime(2026, 9, 5, 10, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.ON_TIME)
        self.assertEqual(att.late_hours, 0)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('0.00'))

    def test_1_hour_late(self):
        # Male expected 10:00 AM, arrives 11:00 AM -> 1 hr late
        # Monthly 30000 / 26 = 1153.846... daily, hourly = 144.2307...
        dt = datetime(2026, 9, 5, 11, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.LATE)
        self.assertEqual(att.late_hours, 1)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('144.23'))

    def test_2_hours_late(self):
        # Male arrives 12:00 PM -> 2 hrs late -> 288.46 deduction
        dt = datetime(2026, 9, 5, 12, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.LATE)
        self.assertEqual(att.late_hours, 2)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('288.46'))

    def test_3_hours_late(self):
        # Male arrives 1:00 PM -> 3 hrs late -> 432.69 deduction
        dt = datetime(2026, 9, 5, 13, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.LATE)
        self.assertEqual(att.late_hours, 3)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('432.69'))

    def test_exactly_4_hours_late(self):
        # Male arrives 2:00 PM -> 4 hrs late -> HALF DAY (50% of 1153.846...) = 576.92
        dt = datetime(2026, 9, 5, 14, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.HALF_DAY)
        self.assertEqual(att.late_hours, 4)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('576.92'))

    def test_4_hours_30_minutes_late(self):
        # Male arrives 2:30 PM -> 4 hrs 30 mins late -> Half day + 30 mins
        dt = datetime(2026, 9, 5, 14, 30, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.HALF_DAY)
        self.assertEqual(att.late_hours, 4)
        self.assertEqual(att.late_minutes, 30)
        self.assertEqual(att.late_deduction, Decimal('649.04'))

    def test_5_hours_late(self):
        # Male arrives 3:00 PM -> 5 hrs late -> Half day + 1 hr = 721.15
        dt = datetime(2026, 9, 5, 15, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.HALF_DAY)
        self.assertEqual(att.late_hours, 5)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('721.15'))

    def test_6_hours_late(self):
        # Male arrives 4:00 PM -> 6 hrs late -> Half day + 2 hrs = 865.38
        dt = datetime(2026, 9, 5, 16, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.HALF_DAY)
        self.assertEqual(att.late_hours, 6)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('865.38'))

    def test_8_hours_late_shift_end(self):
        # Male arrives 6:00 PM (Shift End) -> Full-day deduction = 1153.85
        dt = datetime(2026, 9, 5, 18, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.LATE)
        self.assertEqual(att.late_hours, 8)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('1153.85'))

    def test_after_shift_end_capped(self):
        # Male arrives 7:00 PM (1 hr AFTER Shift End) -> MUST STAY CAPPED AT 1 full day (1153.85)
        dt = datetime(2026, 9, 5, 19, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.male_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.LATE)
        self.assertEqual(att.late_hours, 8)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('1153.85'))

    def test_minute_level_precision(self):
        # 15 mins late (10:15 AM male) -> 36.06
        dt15 = datetime(2026, 9, 5, 10, 15, 0, tzinfo=self.tz)
        att15 = Attendance.objects.create(employee=self.male_user, date=dt15.date(), check_in=dt15)
        self.assertEqual(att15.late_hours, 0)
        self.assertEqual(att15.late_minutes, 15)
        self.assertEqual(att15.late_deduction, Decimal('36.06'))

        # 1 hr 45 mins late (11:45 AM male) -> 252.40
        dt105 = datetime(2026, 9, 6, 11, 45, 0, tzinfo=self.tz)
        att105 = Attendance.objects.create(employee=self.male_user, date=dt105.date(), check_in=dt105)
        self.assertEqual(att105.late_hours, 1)
        self.assertEqual(att105.late_minutes, 45)
        self.assertEqual(att105.late_deduction, Decimal('252.40'))

    def test_female_shift_timing(self):
        # Female start is 9:30 AM. Arrives 10:30 AM -> 1 hr late
        dt = datetime(2026, 9, 5, 10, 30, 0, tzinfo=self.tz)
        att = Attendance.objects.create(employee=self.female_user, date=dt.date(), check_in=dt)
        self.assertEqual(att.status, Attendance.Status.LATE)
        self.assertEqual(att.late_hours, 1)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('144.23'))

    def test_early_checkout_at_3pm(self):
        # Male shift 10:00 AM - 6:00 PM.
        # Checks in on time (10:00 AM) and checks out early at 3:00 PM (15:00).
        # Unworked time = 3 hours (3:00 PM to 6:00 PM) -> deduction = 432.69
        dt_in = datetime(2026, 9, 5, 10, 0, 0, tzinfo=self.tz)
        dt_out = datetime(2026, 9, 5, 15, 0, 0, tzinfo=self.tz)
        att = Attendance.objects.create(
            employee=self.male_user,
            date=dt_in.date(),
            check_in=dt_in,
            check_out=dt_out
        )
        self.assertEqual(att.late_hours, 3)
        self.assertEqual(att.late_minutes, 0)
        self.assertEqual(att.late_deduction, Decimal('432.69'))

    def test_arbitrary_early_checkout_times(self):
        # 1. Male checks out at 2:30 PM (3 hours 30 mins unworked = 210 mins) -> 504.81 deduction
        dt_in1 = datetime(2026, 9, 6, 10, 0, 0, tzinfo=self.tz)
        dt_out1 = datetime(2026, 9, 6, 14, 30, 0, tzinfo=self.tz)
        att1 = Attendance.objects.create(employee=self.male_user, date=dt_in1.date(), check_in=dt_in1, check_out=dt_out1)
        self.assertEqual(att1.late_hours, 3)
        self.assertEqual(att1.late_minutes, 30)
        self.assertEqual(att1.late_deduction, Decimal('504.81'))

        # 2. Female shift 9:30 AM - 5:30 PM. Checks out at 4:15 PM (1 hr 15 mins unworked = 75 mins) -> 180.29 deduction
        dt_in2 = datetime(2026, 9, 7, 9, 30, 0, tzinfo=self.tz)
        dt_out2 = datetime(2026, 9, 7, 16, 15, 0, tzinfo=self.tz)
        att2 = Attendance.objects.create(employee=self.female_user, date=dt_in2.date(), check_in=dt_in2, check_out=dt_out2)
        self.assertEqual(att2.late_hours, 1)
        self.assertEqual(att2.late_minutes, 15)
        self.assertEqual(att2.late_deduction, Decimal('180.29'))

    def test_auto_checkout_unclosed_records(self):
        past_checkin = datetime(2026, 9, 1, 9, 30, 0, tzinfo=self.tz)
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

