"""
Re-index all existing records into LanceDB from the configured medical sources.
Usage: python manage.py reindex
Works for tables whose model has a char/int PK accessible as `id`.
"""

from django.core.management.base import BaseCommand
from django.apps import apps

from api.rag.indexer import _SOURCES, index_record, _table


class Command(BaseCommand):
    help = "Full re-index of all configured sources into LanceDB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--table", type=str, default=None,
            help="Only re-index one source table, e.g. api_activemedication",
        )

    def handle(self, *args, **options):
        table_filter = options["table"]
        table = _table()
        if table is not None:
            table.delete("source_table <> ''")

        total = 0
        for db_table, source in _SOURCES.items():
            if table_filter and db_table != table_filter:
                continue
            model = apps.get_model("api", source.table.replace("api_", "", 1))
            for instance in model.objects.all().iterator():
                index_record(model, instance)
                total += 1
            self.stdout.write(f"  {db_table}: {model.objects.count()} records")

        self.stdout.write(self.style.SUCCESS(f"Re-indexed {total} records"))