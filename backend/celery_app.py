import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "civicsense_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def process_prediction_async(report_id: str, image_url: str):
    """
    Placeholder task to run image processing asynchronously.
    AI processing will be mapped here in a later phase to unblock the API.
    """
    pass
