from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Stock, StockMovement
from .serializers import StockSerializer, StockMovementSerializer
from apps.accounts.models import Store


class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product__name', 'product__sku']
    ordering_fields = ['quantity', 'product__name', 'last_restocked']
    ordering = ['product__name']

    def get_queryset(self):
        qs = Stock.objects.select_related('product', 'product__category').filter(
            product__store__owner=self.request.user
        )
        # Filter low stock
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            from django.db.models import F
            qs = qs.filter(quantity__lte=F('low_stock_threshold'))
        return qs

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """Quick stock adjustment: add or subtract quantity."""
        stock = self.get_object()
        quantity = request.data.get('quantity')
        movement_type = request.data.get('movement_type', 'adjustment')
        notes = request.data.get('notes', '')

        if quantity is None:
            return Response({'error': 'Quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

        quantity = int(quantity)
        stock.quantity += quantity
        if stock.quantity < 0:
            stock.quantity = 0
        if movement_type == 'in':
            stock.last_restocked = timezone.now()
        stock.save()

        StockMovement.objects.create(
            product=stock.product,
            quantity_change=quantity,
            movement_type=movement_type,
            notes=notes,
            created_by=request.user,
        )

        return Response(StockSerializer(stock).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return inventory summary stats."""
        qs = self.get_queryset()
        from django.db.models import F, Sum
        total = qs.count()
        low_stock = qs.filter(quantity__lte=F('low_stock_threshold')).count()
        out_of_stock = qs.filter(quantity=0).count()
        total_value = sum(
            float(s.product.price) * s.quantity for s in qs.select_related('product')
        )
        total_movements = StockMovement.objects.filter(
            product__store__owner=request.user
        ).count()

        return Response({
            'total_products': total,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'total_value': round(total_value, 2),
            'total_movements': total_movements,
        })


class StockMovementViewSet(viewsets.ModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product__name', 'notes']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = StockMovement.objects.select_related('product', 'created_by').filter(
            product__store__owner=self.request.user
        ).order_by('-created_at')
        # Filter by product
        product = self.request.query_params.get('product')
        if product:
            qs = qs.filter(product_id=product)
        # Filter by movement type
        movement_type = self.request.query_params.get('movement_type')
        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        return qs

    def perform_create(self, serializer):
        movement = serializer.save(created_by=self.request.user)
        # Auto-update stock
        stock, _ = Stock.objects.get_or_create(product=movement.product)
        stock.quantity += movement.quantity_change
        if stock.quantity < 0:
            stock.quantity = 0
        if movement.movement_type == 'in':
            stock.last_restocked = timezone.now()
        stock.save()
