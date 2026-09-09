from django.core.management.base import BaseCommand
from attendance.models import Attendance

class Command(BaseCommand):
    help = 'Auto check-out unclosed attendance records at 8:00 PM (20:00 IST) shift cutoff.'

    def handle(self, *args, **options):
        count = Attendance.auto_checkout_unclosed_records()
        self.stdout.write(self.style.SUCCESS(f'Successfully auto checked-out {count} unclosed attendance record(s).'))
