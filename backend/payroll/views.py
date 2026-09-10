from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from .models import SalarySlip
from .serializers import SalarySlipSerializer
from .utils import generate_salary_slip_pdf
from users.permissions import IsAdminUserRole, IsSelfOrAdmin
from users.models import Notification

class SalarySlipViewSet(viewsets.ModelViewSet):
    serializer_class = SalarySlipSerializer
    permission_classes = [IsAuthenticated, IsSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_role:
            return SalarySlip.objects.all().select_related('employee').order_by('-year', '-month')
        return SalarySlip.objects.filter(employee=user).order_by('-year', '-month')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserRole()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        for field in ['allowances', 'deductions', 'leave_days_deducted', 'basic_salary']:
            val = data.get(field)
            if val is None or str(val).strip() == '':
                data[field] = '0'

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        emp = serializer.validated_data.get('employee')
        month = serializer.validated_data.get('month')
        year = serializer.validated_data.get('year')
        basic_salary = serializer.validated_data.get('basic_salary')
        
        if emp and (not basic_salary or float(basic_salary) == 0):
            basic_salary = emp.base_salary or 50000.00

        allowances = serializer.validated_data.get('allowances', 0) or 0
        deductions = serializer.validated_data.get('deductions', 0) or 0
        leave_days_deducted = serializer.validated_data.get('leave_days_deducted', 0) or 0

        slip, created = SalarySlip.objects.update_or_create(
            employee=emp,
            month=month,
            year=year,
            defaults={
                'basic_salary': basic_salary,
                'allowances': allowances,
                'deductions': deductions,
                'leave_days_deducted': leave_days_deducted,
                'status': 'PAID'
            }
        )
        # Re-trigger calculation to ensure late attendance and leave deductions auto-populate
        slip.calculate_salary_details()
        slip.save()

        try:
            Notification.objects.create(
                recipient=emp,
                title="Salary Slip Issued",
                message=f"Your salary slip for {slip.get_month_name()} {slip.year} has been issued. Net take-home: ₹{slip.net_salary:,.2f}.",
                target="EMPLOYEE",
                link_tab="payroll",
                created_by=request.user
            )
        except Exception:
            pass

        return Response(
            SalarySlipSerializer(slip).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsSelfOrAdmin])
    def download_pdf(self, request, pk=None):
        salary_slip = self.get_object()
        pdf_bytes = generate_salary_slip_pdf(salary_slip)
        filename = f"Salary_Slip_{salary_slip.employee.employee_id or salary_slip.employee.id}_{salary_slip.get_month_name()}_{salary_slip.year}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
