from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def send_demand_fulfilled_email(demand_request):
    """Send email to customer when their requested product is now available."""
    if not demand_request.customer_email or not demand_request.notify_customer:
        return False

    if demand_request.notified_at:
        return False  # Already notified

    store = demand_request.store

    subject = f"Great news! {demand_request.query} is now available at {store.name}"

    message = f"""Hi {demand_request.customer_name or 'Valued Customer'},

Great news! The item you asked about is now available at {store.name}.

Item: {demand_request.query}
{f"Notes: {demand_request.notes}" if demand_request.notes else ""}

We'd love to see you! Visit us at:
{store.address}
{', '.join(filter(None, [store.city, store.state, store.zip_code]))}

{f"Call us: {store.phone}" if store.phone else ""}

Thank you for your patience!

Best regards,
{store.name}
"""

    try:
        from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
        if not from_email:
            logger.warning("No email configured. Skipping notification.")
            return False

        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[demand_request.customer_email],
            fail_silently=False,
        )

        demand_request.notified_at = timezone.now()
        demand_request.save(update_fields=['notified_at'])

        logger.info(f"Notification sent to {demand_request.customer_email} for '{demand_request.query}'")
        return True
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")
        return False


def send_bulk_demand_fulfilled(query_normalized, store):
    """Notify all customers who asked for a specific item."""
    from .models import DemandRequest

    requests = DemandRequest.objects.filter(
        store=store,
        query_normalized=query_normalized,
        status='new',
        notify_customer=True,
        customer_email__gt='',
        notified_at__isnull=True,
    )

    notified = 0
    for req in requests:
        if send_demand_fulfilled_email(req):
            notified += 1

    return notified
