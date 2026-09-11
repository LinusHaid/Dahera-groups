from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from attendance.models import Attendance
from leaves.models import LeaveRequest
from payroll.models import SalarySlip

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial Admin account thahira_admin for Thahira Groups.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Setting up Thahira Groups ERP System..."))

        # Clean old records
        Attendance.objects.all().delete()
        LeaveRequest.objects.all().delete()
        SalarySlip.objects.all().delete()

        # Delete any previous admin accounts to ensure clean setup
        User.objects.filter(role=User.Role.ADMIN).delete()

        # Admin User: thahira_admin
        admin_user = User.objects.create(
            username='thahira_admin',
            email='admin@thahira.com',
            first_name='Thahira',
            last_name='Admin',
            gender=User.Gender.FEMALE,
            role=User.Role.ADMIN,
            employee_id='THG-ADM-01',
            designation='Executive Director',
            department='Executive Board',
            phone='9876543210',
            bio='Executive Administrator for Thahira Groups.',
            base_salary=150000.00,
            is_staff=True,
            is_superuser=True
        )
        
        admin_user.set_password('Admin@2026')
        admin_user.save()

        # Clean out any old non-admin users
        User.objects.filter(role='EMPLOYEE').delete()

        self.stdout.write(self.style.SUCCESS("Thahira Groups Admin account thahira_admin set up successfully with password: Admin@2026!"))
