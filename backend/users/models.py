from django.db import models
from django.contrib.auth.models import AbstractUser
from datetime import time

class User(AbstractUser):
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        EMPLOYEE = 'EMPLOYEE', 'Employee'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        TERMINATED = 'TERMINATED', 'Terminated'
        ON_LEAVE = 'ON_LEAVE', 'On Leave'

    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.EMPLOYEE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    employee_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    designation = models.CharField(max_length=100, default='Software Engineer', blank=True)
    department = models.CharField(max_length=100, default='Engineering', blank=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_joining = models.DateField(null=True, blank=True)
    bio = models.TextField(blank=True, default='')
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=50000.00)
    shift_start_time = models.TimeField(null=True, blank=True, help_text="Custom shift start time")
    shift_end_time = models.TimeField(null=True, blank=True, help_text="Custom shift end time")

    def get_shift_start_time(self) -> time:
        if self.shift_start_time:
            return self.shift_start_time
        if self.gender == self.Gender.FEMALE:
            return time(9, 30, 0)
        return time(10, 0, 0)

    def get_shift_end_time(self) -> time:
        if self.shift_end_time:
            return self.shift_end_time
        if self.gender == self.Gender.FEMALE:
            return time(17, 30, 0)
        return time(18, 0, 0)

    def get_scheduled_login_time(self) -> str:
        st = self.get_shift_start_time()
        return st.strftime("%I:%M %p")

    def get_scheduled_login_time_obj(self) -> time:
        return self.get_shift_start_time()

    @property
    def is_admin_role(self) -> bool:
        return self.role == self.Role.ADMIN or self.is_superuser

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.employee_id or 'N/A'})"


class Notification(models.Model):
    class Target(models.TextChoices):
        ALL = 'ALL', 'All Users'
        EMPLOYEE = 'EMPLOYEE', 'Employees Only'
        ADMIN = 'ADMIN', 'Admins Only'

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='received_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    target = models.CharField(max_length=20, choices=Target.choices, default=Target.ALL)
    link_tab = models.CharField(max_length=50, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_notifications')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    read_by = models.ManyToManyField(User, blank=True, related_name='read_notifications')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.target})"
