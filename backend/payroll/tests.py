from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import datetime
from decimal import Decimal
import zoneinfo

from attendance.models import Attendance
from payroll.models import SalarySlip
from payroll.utils import generate_salary_slip_pdf

User = get_user_model()

class SalarySlipLateDeductionTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='emp_test@thahira.com',
            email='emp_test@thahira.com',
            password='Password123',
            gender=User.Gender.MALE,
            role=User.Role.EMPLOYEE,
            employee_id='THG-TEST-01',
            base_salary=30000.00
        )
        self.tz = zoneinfo.ZoneInfo('Asia/Kolkata')

        # Record 1: 1 hour late (11:00 AM) -> late_deduction = 144.23
        dt1 = datetime(2026, 9, 1, 11, 0, 0, tzinfo=self.tz)
        Attendance.objects.create(employee=self.user, date=dt1.date(), check_in=dt1)

        # Record 2: 2 hours late (12:00 PM) -> late_deduction = 288.46
        dt2 = datetime(2026, 9, 2, 12, 0, 0, tzinfo=self.tz)
        Attendance.objects.create(employee=self.user, date=dt2.date(), check_in=dt2)

        # Record 3: Exactly 4 hours late (2:00 PM) -> late_deduction = 576.92
        dt3 = datetime(2026, 9, 3, 14, 0, 0, tzinfo=self.tz)
        Attendance.objects.create(employee=self.user, date=dt3.date(), check_in=dt3)

    def test_automatic_salary_slip_late_deduction_calculation(self):
        slip = SalarySlip.objects.create(
            employee=self.user,
            month=9,
            year=2026,
            basic_salary=Decimal('30000.00'),
            allowances=Decimal('2000.00'),
            deductions=Decimal('500.00')
        )

        slip.refresh_from_db()

        self.assertEqual(slip.late_days, 3)
        self.assertEqual(slip.total_late_hours, 7)
        self.assertEqual(slip.total_late_minutes, 0)
        
        # 144.23 + 288.46 + 576.92 = 1009.61
        self.assertEqual(slip.late_salary_deduction, Decimal('1009.61'))

        # Net salary = basic(30000) + allowances(2000) - (leave_ded(0) + late_ded(1009.61) + other_ded(500))
        # 32000 - 1509.61 = 30490.39
        self.assertEqual(slip.net_salary, Decimal('30490.39'))

    def test_salary_slip_pdf_generation(self):
        slip = SalarySlip.objects.create(
            employee=self.user,
            month=9,
            year=2026,
            basic_salary=Decimal('30000.00'),
            allowances=Decimal('2000.00'),
            deductions=Decimal('500.00')
        )
        pdf_bytes = generate_salary_slip_pdf(slip)
        self.assertIsNotNone(pdf_bytes)
        self.assertGreater(len(pdf_bytes), 1000)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))
