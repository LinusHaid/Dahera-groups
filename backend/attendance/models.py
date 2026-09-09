from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import datetime, time

class Attendance(models.Model):
    class Status(models.TextChoices):
        ON_TIME = 'ON_TIME', 'On Time'
        LATE = 'LATE', 'Late'
        ABSENT = 'ABSENT', 'Absent'
        COMPLETED = 'COMPLETED', 'Completed'

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField(default=timezone.now)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ON_TIME
    )
    expected_login_time = models.CharField(
        max_length=20,
        blank=True,
        help_text="Expected login time based on gender schedule (10:00 AM Male / 09:30 AM Female)"
    )
    working_hours = models.FloatField(default=0.0)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-date', '-check_in']
        unique_together = ('employee', 'date')

    def save(self, *args, **kwargs):
        if not self.expected_login_time and self.employee:
            self.expected_login_time = self.employee.get_scheduled_login_time()

        if self.check_in and (not self.status or self.status in [self.Status.ON_TIME, self.Status.LATE]):
            self.evaluate_late_status()


        if self.check_in and self.check_out:
            delta = self.check_out - self.check_in
            self.working_hours = round(delta.total_seconds() / 3600.0, 2)
            if self.status != self.Status.LATE:
                self.status = self.Status.COMPLETED

        super().save(*args, **kwargs)

    def evaluate_late_status(self):
       
        if not self.check_in or not self.employee:
            return
        
        local_check_in = timezone.localtime(self.check_in)
        check_in_time = local_check_in.time()
        scheduled_time = self.employee.get_scheduled_login_time_obj()

        cutoff_seconds = (scheduled_time.hour * 3600) + (scheduled_time.minute * 60) + 300
        actual_seconds = (check_in_time.hour * 3600) + (check_in_time.minute * 60) + check_in_time.second

        if actual_seconds > cutoff_seconds:
            self.status = self.Status.LATE
        else:
            self.status = self.Status.ON_TIME

    @classmethod
    def auto_checkout_unclosed_records(cls):
        """
        Auto checks-out unclosed records (check_in set, check_out null)
        when local time reaches or passes 8:00 PM (20:00 IST) on that shift day,
        or for any past dates.
        """
        now_local = timezone.localtime(timezone.now())
        today_local = now_local.date()
        current_hour = now_local.hour

        unclosed = cls.objects.filter(check_in__isnull=False, check_out__isnull=True)
        updated_count = 0

        for att in unclosed:
            att_local_checkin = timezone.localtime(att.check_in)
            att_date = att_local_checkin.date()

            if att_date < today_local or (att_date == today_local and current_hour >= 20):
                auto_checkout_dt = datetime.combine(
                    att_date,
                    time(20, 0, 0),
                    tzinfo=now_local.tzinfo
                )
                if auto_checkout_dt <= att.check_in:
                    auto_checkout_dt = att.check_in + timezone.timedelta(minutes=1)

                att.check_out = auto_checkout_dt
                if not att.notes:
                    att.notes = "Auto checked-out at 8:00 PM shift cutoff."
                att.save()
                updated_count += 1

        return updated_count

    def __str__(self):
        return f"{self.employee.get_full_name()} - {self.date} ({self.status})"
