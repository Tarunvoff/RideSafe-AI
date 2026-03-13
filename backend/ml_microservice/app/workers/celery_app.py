from celery import Celery
import os

# RabbitMQ / Redis logic usually goes here. Mocking for redis on localhost by default.
redis_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "gigshield_workers",
    broker=redis_url,
    backend=redis_url,
    include=['app.workers.tasks']
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        'fetch-environment-data-every-10-mins': {
            'task': 'app.workers.tasks.fetch_and_evaluate_triggers',
            'schedule': 600.0, # 10 minutes
        },
    }
)
