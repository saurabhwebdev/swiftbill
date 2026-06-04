from django.db import models
from django.conf import settings
from apps.accounts.models import Store
from apps.products.models import Product, Category


class DemandRequest(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('fulfilled', 'Fulfilled'),
        ('dismissed', 'Dismissed'),
    )
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='demand_requests')
    query = models.CharField(max_length=255, help_text='What the customer asked for')
    query_normalized = models.CharField(max_length=255, db_index=True, help_text='Lowercase trimmed version for grouping')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='demand_requests', help_text='Linked product if it exists in catalog')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    logged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='demand_logs')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='new')
    notes = models.TextField(blank=True)
    customer_name = models.CharField(max_length=255, blank=True, help_text='Customer name')
    customer_phone = models.CharField(max_length=20, blank=True, help_text='Customer phone number')
    customer_email = models.EmailField(blank=True, help_text='Customer email for notification')
    notify_customer = models.BooleanField(default=False, help_text='Send email when product arrives')
    notified_at = models.DateTimeField(null=True, blank=True, help_text='When the customer was notified')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.query_normalized = self.query.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.query} ({self.status})"
