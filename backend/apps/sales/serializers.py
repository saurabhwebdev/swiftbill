from rest_framework import serializers
from .models import Sale, SaleItem, Refund, RefundItem, UpiPayment


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'discount', 'tax_amount', 'gst_rate', 'subtotal']
        read_only_fields = ['id']


class RefundItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = RefundItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'tax_amount', 'gst_rate', 'subtotal']
        read_only_fields = ['id']


class RefundSerializer(serializers.ModelSerializer):
    items = RefundItemSerializer(many=True, read_only=True)
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = ['id', 'sale', 'refund_number', 'refund_amount', 'refund_tax', 'reason',
                  'processed_by', 'processed_by_name', 'created_at', 'items']
        read_only_fields = ['id', 'refund_number', 'created_at', 'processed_by']

    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return obj.processed_by.get_full_name() or obj.processed_by.username
        return ''


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    refunds = RefundSerializer(many=True, read_only=True)
    cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'receipt_number', 'store', 'terminal', 'cashier', 'cashier_name',
            'total_amount', 'discount_amount', 'tax_amount',
            'payment_method', 'status', 'notes', 'created_at', 'items', 'refunds',
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at', 'store', 'cashier']

    def get_cashier_name(self, obj):
        return obj.cashier.get_full_name() or obj.cashier.username


class UpiPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpiPayment
        fields = ['id', 'sale', 'amount', 'upi_id', 'transaction_ref', 'upi_link',
                  'status', 'verification_mode', 'oneupi_order_id', 'confirmed_at', 'created_at', 'expires_at']
        read_only_fields = ['id', 'created_at']


class CheckoutSerializer(serializers.Serializer):
    """Serializer for the checkout endpoint."""
    items = serializers.ListField(child=serializers.DictField())
    payment_method = serializers.ChoiceField(choices=['cash', 'card', 'mobile'])
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, default='', allow_blank=True)
    terminal = serializers.IntegerField(required=False, allow_null=True, default=None)
