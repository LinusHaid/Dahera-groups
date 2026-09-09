from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, time

from .models import Attendance
from .serializers import AttendanceSerializer
from .utils import generate_attendance_report_pdf
from users.permissions import IsSelfOrAdmin, IsAdminUserRole

class CheckInView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        today = timezone.now().date()
        attendance, created = Attendance.objects.get_or_create(
            employee=request.user,
            date=today,
            defaults={
                'expected_login_time': request.user.get_scheduled_login_time()
            }
        )

        if attendance.check_in and not created:
            return Response(
                {'detail': 'You have already checked in for today.', 'data': AttendanceSerializer(attendance).data},
                status=status.HTTP_400_BAD_REQUEST
            )

        attendance.check_in = timezone.now()
        attendance.expected_login_time = request.user.get_scheduled_login_time()
        attendance.evaluate_late_status()
        attendance.save()

        return Response(
            {'message': 'Check-in successful!', 'data': AttendanceSerializer(attendance).data},
            status=status.HTTP_200_OK
        )

class CheckOutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        today = timezone.now().date()
        try:
            attendance = Attendance.objects.get(employee=request.user, date=today)
        except Attendance.DoesNotExist:
            return Response(
                {'detail': 'No check-in record found for today. Please check in first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not attendance.check_in:
            return Response(
                {'detail': 'You must check in before checking out.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if attendance.check_out:
            return Response(
                {'detail': 'You have already checked out for today.', 'data': AttendanceSerializer(attendance).data},
                status=status.HTTP_400_BAD_REQUEST
            )

        now_local = timezone.localtime(timezone.now())
        if now_local.hour >= 20:
            auto_checkout_dt = datetime.combine(
                now_local.date(),
                time(20, 0, 0),
                tzinfo=now_local.tzinfo
            )
            if auto_checkout_dt <= attendance.check_in:
                auto_checkout_dt = attendance.check_in + timezone.timedelta(minutes=1)
            attendance.check_out = auto_checkout_dt
            if not attendance.notes:
                attendance.notes = "Auto checked-out at 8:00 PM shift cutoff."
            msg = 'Shift cutoff reached at 8:00 PM. Checked out at 8:00 PM.'
        else:
            attendance.check_out = timezone.now()
            msg = 'Check-out successful!'

        attendance.save()

        return Response(
            {'message': msg, 'data': AttendanceSerializer(attendance).data},
            status=status.HTTP_200_OK
        )

class TodayAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        Attendance.auto_checkout_unclosed_records()
        today = timezone.now().date()
        attendance = Attendance.objects.filter(employee=request.user, date=today).first()
        if not attendance:
            return Response({'attendance': None, 'scheduled_login_time': request.user.get_scheduled_login_time()})
        return Response({'attendance': AttendanceSerializer(attendance).data, 'scheduled_login_time': request.user.get_scheduled_login_time()})

class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsSelfOrAdmin]

    def get_queryset(self):
        Attendance.auto_checkout_unclosed_records()
        user = self.request.user
        qs = Attendance.objects.all().select_related('employee').order_by('-date', '-check_in') if user.is_admin_role else Attendance.objects.filter(employee=user).order_by('-date')
        
        # Query param filters
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        status_param = self.request.query_params.get('status')
        emp_param = self.request.query_params.get('employee')

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)
        if emp_param and emp_param != 'ALL' and user.is_admin_role:
            qs = qs.filter(employee__employee_id=emp_param)

        return qs

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminUserRole])
    def download_pdf(self, request):
        qs = self.get_queryset()
        
        records = []
        for att in qs:
            records.append({
                'date': str(att.date),
                'employee_name': att.employee.get_full_name() or att.employee.username,
                'employee_id': att.employee.employee_id or 'N/A',
                'expected_login_time': att.expected_login_time or att.employee.get_scheduled_login_time(),
                'check_in_formatted': att.check_in.strftime('%I:%M %p') if att.check_in else '-',
                'check_out_formatted': att.check_out.strftime('%I:%M %p') if att.check_out else '-',
                'status': att.status,
                'working_hours': att.working_hours,
            })

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status_filter = request.query_params.get('status', 'ALL')
        emp_filter = request.query_params.get('employee', 'ALL')

        pdf_bytes = generate_attendance_report_pdf(
            records=records,
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            employee_filter=emp_filter
        )

        filename = f"Thahira_Attendance_Report_{start_date or 'All'}_to_{end_date or 'Today'}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
