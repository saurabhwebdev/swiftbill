from rest_framework import serializers
from .models import DemandRequest


class DemandRequestSerializer(serializers.ModelSerializer):
    logged_by_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    product_name = serializers.CharField(source='product.name', read_only=True, default='')

    class Meta:
        model = DemandRequest
        fields = [
            'id', 'store', 'query', 'query_normalized', 'product', 'product_name',
            'category', 'category_name', 'logged_by', 'logged_by_name',
            'status', 'notes',
            'customer_name', 'customer_phone', 'customer_email',
            'notify_customer', 'notified_at',
            'created_at',
        ]
        read_only_fields = ['id', 'store', 'query_normalized', 'logged_by', 'created_at', 'notified_at']

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            return obj.logged_by.get_full_name() or obj.logged_by.username
        return ''
