from rest_framework import serializers
from .models import Stock, StockMovement


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_category = serializers.CharField(source='product.category.name', read_only=True, default='')
    product_price = serializers.DecimalField(source='product.price', read_only=True, max_digits=10, decimal_places=2)
    product_gst_rate = serializers.DecimalField(source='product.gst_rate', read_only=True, max_digits=5, decimal_places=2, default=None)
    product_hsn_code = serializers.CharField(source='product.hsn_code', read_only=True, default='')
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = ['id', 'product', 'product_name', 'product_sku', 'product_category', 'product_price',
                  'product_gst_rate', 'product_hsn_code',
                  'quantity', 'low_stock_threshold', 'last_restocked', 'is_low_stock']
        read_only_fields = ['id']

    def get_is_low_stock(self, obj):
        return obj.quantity <= obj.low_stock_threshold


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'product_name', 'quantity_change', 'movement_type', 'notes',
                  'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_at', 'created_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''
