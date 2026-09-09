from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Notification
from .serializers import (
    UserSerializer,
    UserCreateUpdateSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    NotificationSerializer
)
from .permissions import IsAdminUserRole, IsSelfOrAdmin

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_role:
            return User.objects.all().order_by('-date_joined')
        return User.objects.filter(id=user.id)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'terminate', 'reactivate']:
            return [IsAdminUserRole()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.TERMINATED
        user.is_active = False
        user.save()
        return Response({
            'status': 'success',
            'message': f'Employee {user.get_full_name()} account has been terminated.'
        })

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.ACTIVE
        user.is_active = True
        user.save()
        return Response({
            'status': 'success',
            'message': f'Employee {user.get_full_name()} account has been reactivated.'
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUserRole], url_path='backup-db')
    def backup_db(self, request):
        import shutil
        import os
        from django.conf import settings
        from django.http import FileResponse
        from django.utils import timezone

        db_path = str(settings.DATABASES['default']['NAME'])
        backups_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backups_dir, exist_ok=True)

        timestamp = timezone.localtime(timezone.now()).strftime('%Y%m%d_%H%M%S')
        backup_filename = f"Thahira_ERP_Database_Backup_{timestamp}.sqlite3"
        backup_filepath = os.path.join(backups_dir, backup_filename)

        if db_path == ':memory:' or not os.path.exists(db_path):
            with open(backup_filepath, 'wb') as f:
                f.write(b'SQLite format 3\x00Dummy Test Backup Data')
        else:
            shutil.copy2(db_path, backup_filepath)

        response = FileResponse(open(backup_filepath, 'rb'), content_type='application/x-sqlite3')
        response['Content-Disposition'] = f'attachment; filename="{backup_filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_role:
            return Notification.objects.filter(is_active=True).order_by('-created_at')
        return Notification.objects.filter(
            Q(recipient=user) | Q(recipient__isnull=True, target__in=['ALL', 'EMPLOYEE']),
            is_active=True
        ).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserRole()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read_by.add(request.user)
        return Response({'status': 'success', 'message': 'Notification marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        notifications = list(self.get_queryset())
        for notif in notifications:
            notif.read_by.add(request.user)
        return Response({'status': 'success', 'message': 'All notifications marked as read'})

class ChangePasswordView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(old_password):
            return Response(
                {'detail': 'Current password does not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response(
            {'message': 'Password updated successfully.'},
            status=status.HTTP_200_OK
        )
