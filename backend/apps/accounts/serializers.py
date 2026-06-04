from rest_framework import serializers
from .models import User, Store, Terminal, TaxSlab
from apps.utils.images import compress_image


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role', 'pin', 'first_name', 'last_name', 'is_active']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for managers/owners to create cashier accounts with role assignment."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'phone', 'role', 'pin', 'first_name', 'last_name']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = [
            'id', 'name', 'address', 'city', 'state', 'zip_code',
            'phone', 'email', 'logo', 'tax_rate', 'currency', 'owner',
            'is_setup_complete',
            'payment_cash', 'payment_card', 'payment_mobile', 'payment_store_credit',
            'receipt_header', 'receipt_footer', 'receipt_paper_size',
            'receipt_copies', 'receipt_show_logo', 'receipt_show_tax_breakdown',
            # Notifications
            'notify_low_stock', 'notify_daily_summary', 'notify_new_sale',
            'notify_refund', 'low_stock_threshold_default', 'notification_email',
            # Appearance
            'appearance_theme', 'appearance_accent_color',
            'appearance_compact_mode', 'appearance_sidebar_collapsed',
            # Regional
            'locale_language', 'locale_timezone', 'locale_date_format',
            'locale_time_format', 'locale_number_format',
            # GST
            'gst_enabled', 'gstin', 'gst_state_code', 'gst_state_name',
            'gst_business_name', 'gst_composition_scheme', 'gst_default_slab',
            'gst_inclusive_pricing',
            # Demand tracking
            'demand_tracking_enabled',
            'notify_demand_fulfilled',
            # Refund settings
            'refund_enabled',
            'refund_time_limit_days',
            'refund_require_reason',
            # UPI Payment settings
            'upi_id',
            'upi_payee_name',
            'upi_verification_mode',
            'oneupi_api_key',
            'oneupi_api_secret',
            # Printer settings
            'printer_type',
            'printer_address',
            'printer_auto_print',
            'printer_paper_width',
        ]
        read_only_fields = ['id', 'owner']

    def validate_logo(self, value):
        if value:
            return compress_image(value, max_width=512, max_height=512, quality=80)
        return value


class TaxSlabSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxSlab
        fields = ['id', 'store', 'name', 'rate', 'description', 'hsn_code', 'is_active', 'created_at']
        read_only_fields = ['id', 'store', 'created_at']


class TerminalSerializer(serializers.ModelSerializer):
    current_cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = Terminal
        fields = [
            'id', 'store', 'name', 'device_id', 'is_active',
            'current_cashier', 'current_cashier_name',
            'opened_at', 'closed_at',
            'opening_balance', 'closing_balance', 'cash_balance', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_current_cashier_name(self, obj):
        if obj.current_cashier:
            return obj.current_cashier.get_full_name() or obj.current_cashier.username
        return None
