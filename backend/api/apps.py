from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        # Load auto-indexing signals (post_save/post_delete -> LanceDB).
        from api.rag import signals  # noqa: F401
