from rest_framework import serializers
from .models import Category, Product
from apps.utils.images import compress_image


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image', 'store', 'is_active', 'product_count']
        read_only_fields = ['id', 'store']

    def get_product_count(self, obj):
        return obj.products.count()

    def validate_image(self, value):
        if value:
            return compress_image(value, max_width=512, max_height=512, quality=75)
        return value


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    current_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'barcode', 'description',
            'category', 'category_name', 'store',
            'price', 'cost_price', 'image',
            'hsn_code', 'gst_rate',
            'is_active', 'created_at', 'updated_at',
            'current_stock',
        ]
        read_only_fields = ['id', 'store', 'created_at', 'updated_at']

    def get_current_stock(self, obj):
        stock = getattr(obj, '_prefetched_stock', None)
        if stock is None:
            from apps.inventory.models import Stock
            stock_obj = Stock.objects.filter(product=obj).first()
            return stock_obj.quantity if stock_obj else 0
        return stock

    def validate_image(self, value):
        if value:
            return compress_image(value, max_width=800, max_height=800, quality=80)
        return value
