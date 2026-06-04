from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from apps.accounts.models import Store


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(
            store__owner=self.request.user
        ).order_by('name')

    def perform_create(self, serializer):
        store = Store.objects.filter(owner=self.request.user).first()
        if store:
            serializer.save(store=store)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'barcode', 'description']
    ordering_fields = ['name', 'price', 'created_at', 'sku']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Product.objects.select_related('category').filter(
            store__owner=self.request.user
        )
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        # Filter by active status
        active = self.request.query_params.get('is_active')
        if active is not None:
            qs = qs.filter(is_active=active.lower() == 'true')
        return qs

    def perform_create(self, serializer):
        store = Store.objects.filter(owner=self.request.user).first()
        if store:
            serializer.save(store=store)
