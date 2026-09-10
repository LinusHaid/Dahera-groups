from rest_framework import serializers
from .models import SalarySlip
from users.serializers import UserSerializer

class SalarySlipSerializer(serializers.ModelSerializer):
    employee_details = UserSerializer(source='employee', read_only=True)
    month_name = serializers.SerializerMethodField()
    scheduled_login_time = serializers.SerializerMethodField()
    other_deductions = serializers.DecimalField(source='deductions', max_digits=10, decimal_places=2, required=False, allow_null=True)
    total_deductions = serializers.SerializerMethodField()
    basic_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    allowances = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    deductions = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    leave_days_deducted = serializers.DecimalField(max_digits=5, decimal_places=1, required=False, allow_null=True)

    class Meta:
        model = SalarySlip
        fields = [
            'id', 'employee', 'employee_details', 'month', 'month_name', 'year',
            'days_in_month', 'working_days', 'present_days', 'absent_days',
            'late_days', 'half_days', 'total_late_hours', 'total_late_minutes',
            'leave_days_deducted', 'daily_rate', 'leave_deduction_amount',
            'late_salary_deduction', 'basic_salary', 'allowances',
            'deductions', 'other_deductions', 'total_deductions', 'net_salary',
            'status', 'scheduled_login_time', 'generated_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'days_in_month', 'working_days', 'present_days', 'absent_days',
            'late_days', 'half_days', 'total_late_hours', 'total_late_minutes',
            'daily_rate', 'leave_deduction_amount', 'late_salary_deduction',
            'total_deductions', 'net_salary', 'generated_at', 'updated_at'
        ]

    def get_month_name(self, obj):
        return obj.get_month_name()

    def get_scheduled_login_time(self, obj):
        if obj.employee:
            return obj.employee.get_scheduled_login_time()
        return "10:00 AM"

    def get_total_deductions(self, obj):
        leave_ded = obj.leave_deduction_amount or 0
        late_ded = obj.late_salary_deduction or 0
        other_ded = obj.deductions or 0
        return round(leave_ded + late_ded + other_ded, 2)
