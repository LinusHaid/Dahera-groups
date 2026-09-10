from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
import calendar

User = get_user_model()

class SalarySlip(models.Model):
    MONTH_CHOICES = [
        (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
        (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
        (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December')
    ]

    STATUS_CHOICES = [
        ('PAID', 'Paid'),
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing')
    ]

    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='salary_slips'
    )
    month = models.IntegerField(choices=MONTH_CHOICES)
    year = models.IntegerField(default=2026)
    
    days_in_month = models.IntegerField(default=30)
    working_days = models.IntegerField(default=26)
    present_days = models.IntegerField(default=0)
    absent_days = models.IntegerField(default=0)
    late_days = models.IntegerField(default=0)
    half_days = models.IntegerField(default=0)
    total_late_hours = models.IntegerField(default=0)
    total_late_minutes = models.IntegerField(default=0)
    late_salary_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    leave_days_deducted = models.DecimalField(max_digits=5, decimal_places=1, default=0.0)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    leave_deduction_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, help_text="Other deductions")
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PAID')
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month']
        unique_together = ['employee', 'month', 'year']

    def calculate_salary_details(self):
        try:
            self.days_in_month = calendar.monthrange(int(self.year), int(self.month))[1]
        except Exception:
            self.days_in_month = 30

        if not self.working_days or self.working_days <= 0:
            self.working_days = 26

        if self.working_days > 0 and self.basic_salary:
            self.daily_rate = round(Decimal(str(self.basic_salary)) / Decimal(str(self.working_days)), 2)
        else:
            self.daily_rate = Decimal('0.00')

        # Auto aggregate monthly attendance records and approved unpaid leaves if employee is set
        if self.employee_id and self.month and self.year:
            try:
                from attendance.models import Attendance
                from leaves.models import LeaveRequest

                # Auto fetch approved unpaid leaves if leave_days_deducted is not manually set
                if not self.leave_days_deducted or float(self.leave_days_deducted) == 0.0:
                    approved_leaves = LeaveRequest.objects.filter(
                        employee=self.employee,
                        status=LeaveRequest.Status.APPROVED,
                        leave_type=LeaveRequest.LeaveType.UNPAID,
                        start_date__year=self.year,
                        start_date__month=self.month
                    )
                    tot_leave_days = sum(l.total_days for l in approved_leaves)
                    self.leave_days_deducted = Decimal(str(tot_leave_days))

                att_qs = Attendance.objects.filter(
                    employee=self.employee,
                    date__year=self.year,
                    date__month=self.month
                )
                p_count = 0
                l_count = 0
                h_count = 0
                sum_late_mins = 0
                sum_late_ded = Decimal('0.00')

                for att in att_qs:
                    if att.status in [Attendance.Status.ON_TIME, Attendance.Status.LATE, Attendance.Status.COMPLETED]:
                        p_count += 1
                    if att.status == Attendance.Status.LATE or att.late_deduction > 0:
                        l_count += 1
                        sum_late_mins += (att.late_hours * 60 + att.late_minutes)
                        sum_late_ded += Decimal(str(att.late_deduction or 0))
                    # Half-day check (late hours >= 4 and < 8)
                    if att.late_hours >= 4 and att.late_hours < 8:
                        h_count += 1

                self.present_days = p_count
                self.late_days = l_count
                self.half_days = h_count
                self.total_late_hours = sum_late_mins // 60
                self.total_late_minutes = sum_late_mins % 60
                self.late_salary_deduction = round(sum_late_ded, 2)
                self.absent_days = max(0, self.working_days - self.present_days)
            except Exception:
                pass

        self.leave_deduction_amount = round(Decimal(str(self.leave_days_deducted or 0)) * self.daily_rate, 2)

        total_ded = self.leave_deduction_amount + Decimal(str(self.late_salary_deduction or 0)) + Decimal(str(self.deductions or 0))
        gross_salary = Decimal(str(self.basic_salary or 0)) + Decimal(str(self.allowances or 0))
        
        calc_net = gross_salary - total_ded
        if calc_net < Decimal('0.00'):
            calc_net = Decimal('0.00')

        self.net_salary = round(calc_net, 2)

    def save(self, *args, **kwargs):
        self.calculate_salary_details()
        super().save(*args, **kwargs)

    def get_month_name(self) -> str:
        return dict(self.MONTH_CHOICES).get(self.month, '')

    def __str__(self):
        return f"Payslip {self.get_month_name()} {self.year} - {self.employee.get_full_name()} ({self.employee.employee_id})"
