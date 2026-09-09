import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone

class Command(BaseCommand):
    help = 'Creates a timestamped backup copy of the SQLite database in the backups directory.'

    def handle(self, *args, **options):
        db_path = settings.DATABASES['default']['NAME']
        if not os.path.exists(db_path):
            self.stderr.write(self.style.ERROR(f'Database file at {db_path} does not exist.'))
            return

        backups_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backups_dir, exist_ok=True)

        timestamp = timezone.localtime(timezone.now()).strftime('%Y%m%d_%H%M%S')
        backup_filename = f"Thahira_ERP_Database_Backup_{timestamp}.sqlite3"
        backup_filepath = os.path.join(backups_dir, backup_filename)

        shutil.copy2(db_path, backup_filepath)
        self.stdout.write(self.style.SUCCESS(f'Database backup created successfully: {backup_filepath}'))
