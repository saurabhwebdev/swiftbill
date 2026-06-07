from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('manager', 'Manager'),
        ('cashier', 'Cashier'),
        ('admin', 'Admin'),
    )
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='cashier')
    pin = models.CharField(max_length=6, blank=True, null=True, help_text='Quick PIN for terminal login')

    def __str__(self):
        return f"{self.username} ({self.role})"


class Store(models.Model):
    PAPER_SIZE_CHOICES = (
        ('80mm', '80mm'),
        ('58mm', '58mm'),
        ('a4', 'A4'),
    )

    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to='store_logos/', blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='USD')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stores')
    is_setup_complete = models.BooleanField(default=False, help_text='Whether initial setup wizard is done')

    # Payment methods
    payment_cash = models.BooleanField(default=True)
    payment_card = models.BooleanField(default=False)
    payment_mobile = models.BooleanField(default=False)
    payment_store_credit = models.BooleanField(default=False)

    # Receipt settings
    receipt_header = models.CharField(max_length=255, blank=True, default='Thank you for shopping with us!')
    receipt_footer = models.CharField(max_length=255, blank=True, default='Visit us again!')
    receipt_paper_size = models.CharField(max_length=10, default='80mm', choices=PAPER_SIZE_CHOICES)
    receipt_copies = models.PositiveIntegerField(default=1)
    receipt_show_logo = models.BooleanField(default=True)
    receipt_show_tax_breakdown = models.BooleanField(default=True)

    # Notification settings
    notify_low_stock = models.BooleanField(default=True)
    notify_daily_summary = models.BooleanField(default=False)
    notify_new_sale = models.BooleanField(default=False)
    notify_refund = models.BooleanField(default=True)
    low_stock_threshold_default = models.PositiveIntegerField(default=10)
    notification_email = models.CharField(max_length=255, blank=True)

    # Appearance settings
    THEME_CHOICES = (
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    )
    ACCENT_COLOR_CHOICES = (
        ('indigo', 'Indigo'),
        ('blue', 'Blue'),
        ('violet', 'Violet'),
        ('emerald', 'Emerald'),
        ('rose', 'Rose'),
        ('amber', 'Amber'),
        ('slate', 'Slate'),
    )
    appearance_theme = models.CharField(max_length=20, default='light', choices=THEME_CHOICES)
    appearance_accent_color = models.CharField(max_length=20, default='indigo')
    appearance_compact_mode = models.BooleanField(default=False)
    appearance_sidebar_collapsed = models.BooleanField(default=False)

    # Regional / locale settings
    DATE_FORMAT_CHOICES = (
        ('MM/DD/YYYY', 'MM/DD/YYYY'),
        ('DD/MM/YYYY', 'DD/MM/YYYY'),
        ('YYYY-MM-DD', 'YYYY-MM-DD'),
    )
    TIME_FORMAT_CHOICES = (
        ('12h', '12 Hour'),
        ('24h', '24 Hour'),
    )
    NUMBER_FORMAT_CHOICES = (
        ('1,234.56', '1,234.56'),
        ('1.234,56', '1.234,56'),
        ('1 234.56', '1 234.56'),
    )
    locale_language = models.CharField(max_length=10, default='en')
    locale_timezone = models.CharField(max_length=50, default='UTC')
    locale_date_format = models.CharField(max_length=20, default='MM/DD/YYYY', choices=DATE_FORMAT_CHOICES)
    locale_time_format = models.CharField(max_length=10, default='12h', choices=TIME_FORMAT_CHOICES)
    locale_number_format = models.CharField(max_length=20, default='1,234.56', choices=NUMBER_FORMAT_CHOICES)

    # GST Configuration
    gst_enabled = models.BooleanField(default=False)
    gstin = models.CharField(max_length=15, blank=True, help_text='15-character GSTIN number')
    gst_state_code = models.CharField(max_length=2, blank=True, help_text='2-digit state code')
    gst_state_name = models.CharField(max_length=100, blank=True)
    gst_business_name = models.CharField(max_length=255, blank=True, help_text='Legal business name as per GST registration')
    gst_composition_scheme = models.BooleanField(default=False, help_text='Whether registered under composition scheme')
    gst_default_slab = models.CharField(max_length=10, default='18', choices=[
        ('0', '0% - Exempt'),
        ('5', '5% GST'),
        ('12', '12% GST'),
        ('18', '18% GST'),
        ('28', '28% GST'),
    ], help_text='Default GST slab for new products')
    gst_inclusive_pricing = models.BooleanField(default=False, help_text='Product prices include GST')

    # Demand tracking
    demand_tracking_enabled = models.BooleanField(default=True, help_text='Enable customer demand tracking')
    notify_demand_fulfilled = models.BooleanField(default=True, help_text='Send email to customers when requested product arrives')

    # Discount settings
    discount_enabled = models.BooleanField(default=True, help_text='Allow discounts on sales')
    discount_max_percent_cashier = models.DecimalField(max_digits=5, decimal_places=2, default=10, help_text='Max discount % a cashier can give')
    discount_max_percent_manager = models.DecimalField(max_digits=5, decimal_places=2, default=50, help_text='Max discount % a manager can give')
    discount_require_reason = models.BooleanField(default=False, help_text='Require reason for discounts')
    discount_require_approval = models.BooleanField(default=False, help_text='Cashier discounts need manager approval')

    # Refund settings
    refund_enabled = models.BooleanField(default=True, help_text='Allow refunds')
    refund_time_limit_days = models.PositiveIntegerField(default=30, help_text='Days after sale within which refund is allowed, 0 for unlimited')
    refund_require_reason = models.BooleanField(default=True, help_text='Require reason for refunds')

    # UPI Payment settings
    UPI_VERIFICATION_CHOICES = (
        ('manual', 'Manual Confirmation'),
        ('oneupi', 'OneUPI (Auto-verify)'),
    )
    upi_id = models.CharField(max_length=100, blank=True, help_text='UPI VPA e.g. store@upi')
    upi_payee_name = models.CharField(max_length=100, blank=True, help_text='Display name for UPI payments')
    upi_verification_mode = models.CharField(max_length=10, choices=UPI_VERIFICATION_CHOICES, default='manual')
    oneupi_api_key = models.CharField(max_length=255, blank=True)
    oneupi_api_secret = models.CharField(max_length=255, blank=True)

    # Printer settings
    PRINTER_TYPE_CHOICES = (
        ('none', 'None'),
        ('test', 'Test (Dummy)'),
        ('usb', 'USB'),
        ('network', 'Network'),
        ('serial', 'Serial'),
    )
    printer_type = models.CharField(max_length=10, choices=PRINTER_TYPE_CHOICES, default='none')
    printer_address = models.CharField(max_length=255, blank=True, help_text='IP:port for network, vendor:product for USB, /dev/path for serial')
    printer_auto_print = models.BooleanField(default=False, help_text='Auto-print receipt after every sale')
    printer_paper_width = models.PositiveIntegerField(default=48, help_text='Characters per line (32 for 58mm, 48 for 80mm)')

    def __str__(self):
        return self.name


class TaxSlab(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='tax_slabs')
    name = models.CharField(max_length=100, help_text='e.g. Standard Rate, Reduced Rate')
    rate = models.DecimalField(max_digits=5, decimal_places=2, help_text='Tax rate percentage')
    description = models.CharField(max_length=255, blank=True)
    hsn_code = models.CharField(max_length=20, blank=True, help_text='Associated HSN/SAC code')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rate']

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class Terminal(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='terminals')
    name = models.CharField(max_length=100, help_text='e.g. Terminal 1, Counter A')
    device_id = models.CharField(max_length=255, unique=True, blank=True, default='',
                                 help_text='Identifier for the physical device')
    is_active = models.BooleanField(default=True)
    current_cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='current_terminal'
    )
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cash_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Current cash in drawer')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.store.name})"
