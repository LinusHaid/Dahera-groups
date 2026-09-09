from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db.models import Q
import uuid

from .models import Notification

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    scheduled_login_time = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'gender', 'role', 'status', 'employee_id', 'designation', 'department',
            'phone', 'date_of_joining', 'bio', 'base_salary', 'scheduled_login_time',
            'is_active'
        ]
        read_only_fields = ['id', 'scheduled_login_time', 'full_name']

    def get_scheduled_login_time(self, obj):
        return obj.get_scheduled_login_time()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

class NotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'title', 'message', 'target', 'link_tab', 'created_by', 'created_by_name', 'created_at', 'is_active', 'is_read']
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'System'

    def get_is_read(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.read_by.filter(id=request.user.id).exists()
        return False

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    first_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    employee_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'password',
            'gender', 'role', 'status', 'employee_id', 'designation', 'department',
            'phone', 'date_of_joining', 'bio', 'base_salary'
        ]

    def validate(self, attrs):
        email_val = (attrs.get('email') or '').strip()
        username_val = (attrs.get('username') or '').strip()

        if not username_val and email_val:
            username_val = email_val
        elif not username_val:
            first = (attrs.get('first_name') or 'emp').strip().lower()
            username_val = f"{first}_{uuid.uuid4().hex[:6]}"

        if not email_val:
            if '@' in username_val:
                email_val = username_val
            else:
                email_val = f"{username_val}@thahira.com"

        attrs['username'] = username_val
        attrs['email'] = email_val

        if not attrs.get('first_name'):
            attrs['first_name'] = username_val.split('@')[0].capitalize()

        return attrs

    def create(self, validated_data):
        provided_password = validated_data.pop('password', None)
        phone_number = (validated_data.get('phone') or '').strip()
        gender = validated_data.get('gender', 'MALE')

        prefix = 'THG-F-' if gender == 'FEMALE' else 'THG-M-'
        count = User.objects.filter(gender=gender).exclude(role='ADMIN').count() + 1
        
        while True:
            candidate_id = f"{prefix}{count:02d}"
            if not User.objects.filter(employee_id=candidate_id).exists():
                validated_data['employee_id'] = candidate_id
                break
            count += 1

        initial_password = (provided_password or '').strip() or phone_number or '9876543210'

        user = User.objects.create(**validated_data)
        user.set_password(initial_password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password and password.strip():
            instance.set_password(password.strip())
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_input = attrs.get('username', '').strip()
        if login_input:
            user_obj = User.objects.filter(
                Q(employee_id__iexact=login_input) | 
                Q(email__iexact=login_input) | 
                Q(username__iexact=login_input)
            ).first()
            
            if user_obj:
                if not user_obj.is_active or user_obj.status == 'TERMINATED':
                    raise serializers.ValidationError({
                        'detail': 'Account is terminated. Please contact admin.'
                    })
                attrs['username'] = user_obj.username

        data = super().validate(attrs)
        
        if not self.user.is_active or self.user.status == 'TERMINATED':
            raise serializers.ValidationError({
                'detail': 'Account is terminated. Please contact admin.'
            })

        from django.utils import timezone
        now_local = timezone.localtime(timezone.now())
        if self.user.role == 'EMPLOYEE' and now_local.hour >= 20:
            raise serializers.ValidationError({
                'detail': 'Employee portal is closed after 8:00 PM shift cutoff. Please log in tomorrow during shift hours.'
            })

        data['user'] = UserSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['gender'] = user.gender
        token['scheduled_login_time'] = user.get_scheduled_login_time()
        token['name'] = user.get_full_name() or user.username
        token['employee_id'] = user.employee_id or ""
        token['status'] = user.status
        return token
