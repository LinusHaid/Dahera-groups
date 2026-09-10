from rest_framework import serializers
from .models import Attendance
from users.serializers import UserSerializer

class AttendanceSerializer(serializers.ModelSerializer):
    employee_details = UserSerializer(source='employee', read_only=True)
    employee_name = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    shift_start = serializers.SerializerMethodField()
    shift_end = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_id', 'employee_details',
            'date', 'check_in', 'check_out', 'status', 'expected_login_time',
            'shift_start', 'shift_end', 'late_hours', 'late_minutes',
            'late_deduction', 'working_hours', 'notes'
        ]
        read_only_fields = [
            'id', 'employee', 'employee_name', 'employee_id', 'expected_login_time',
            'shift_start', 'shift_end', 'late_hours', 'late_minutes',
            'late_deduction', 'working_hours'
        ]

    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.get_full_name() or obj.employee.username
        return "N/A"

    def get_employee_id(self, obj):
        if obj.employee:
            return obj.employee.employee_id or "N/A"
        return "N/A"

    def get_shift_start(self, obj):
        if obj.shift_start:
            return obj.shift_start.strftime("%I:%M %p")
        if obj.employee:
            return obj.employee.get_shift_start_time().strftime("%I:%M %p")
        return "10:00 AM"

    def get_shift_end(self, obj):
        if obj.shift_end:
            return obj.shift_end.strftime("%I:%M %p")
        if obj.employee:
            return obj.employee.get_shift_end_time().strftime("%I:%M %p")
        return "06:00 PM"
