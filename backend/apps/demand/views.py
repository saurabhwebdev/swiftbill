from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Max, Min
from django.db.models.functions import TruncDate
from .models import DemandRequest
from .serializers import DemandRequestSerializer
from apps.accounts.models import Store


class DemandRequestViewSet(viewsets.ModelViewSet):
    serializer_class = DemandRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['query', 'notes']
    ordering_fields = ['created_at', 'query']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = DemandRequest.objects.select_related('product', 'category', 'logged_by').filter(
            store__owner=self.request.user
        )
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs

    def perform_create(self, serializer):
        store = Store.objects.filter(owner=self.request.user).first()
        if store:
            serializer.save(store=store, logged_by=self.request.user)

    @action(detail=True, methods=['post'])
    def fulfill(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'fulfilled'
        obj.save()

        # Send notification if enabled
        if obj.store.notify_demand_fulfilled:
            from .emails import send_demand_fulfilled_email
            send_demand_fulfilled_email(obj)

        return Response(DemandRequestSerializer(obj).data)

    @action(detail=False, methods=['post'])
    def fulfill_all(self, request):
        """Fulfill all requests for a specific query and notify customers."""
        query_normalized = request.data.get('query_normalized', '').strip().lower()
        if not query_normalized:
            return Response({'error': 'query_normalized is required.'}, status=status.HTTP_400_BAD_REQUEST)

        store = Store.objects.filter(owner=request.user).first()
        qs = self.get_queryset().filter(query_normalized=query_normalized, status='new')
        count = qs.count()
        qs.update(status='fulfilled')

        # Send notifications
        notified = 0
        if store and store.notify_demand_fulfilled:
            from .emails import send_bulk_demand_fulfilled
            notified = send_bulk_demand_fulfilled(query_normalized, store)

        return Response({
            'fulfilled': count,
            'notified': notified,
        })

    @action(detail=True, methods=['post'])
    def notify(self, request, pk=None):
        """Manually send notification email to customer."""
        obj = self.get_object()
        if not obj.customer_email:
            return Response({'error': 'No customer email on this request.'}, status=status.HTTP_400_BAD_REQUEST)

        from .emails import send_demand_fulfilled_email
        obj.notify_customer = True
        obj.save(update_fields=['notify_customer'])
        success = send_demand_fulfilled_email(obj)

        if success:
            return Response({'message': 'Notification sent successfully.'})
        return Response({'error': 'Failed to send notification.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'dismissed'
        obj.save()
        return Response(DemandRequestSerializer(obj).data)

    @action(detail=False, methods=['get'])
    def insights(self, request):
        """Aggregated demand insights -- top requested items, trends."""
        qs = self.get_queryset()

        # Top requested items (grouped by normalized query)
        top_items = qs.values('query_normalized').annotate(
            count=Count('id'),
            latest=Max('created_at'),
            first=Min('created_at'),
        ).order_by('-count')[:20]

        # Get the display query (original casing) for each normalized query
        result = []
        for item in top_items:
            sample = qs.filter(query_normalized=item['query_normalized']).first()
            # Count how many are new vs fulfilled vs dismissed
            statuses = qs.filter(query_normalized=item['query_normalized']).values('status').annotate(c=Count('id'))
            status_map = {s['status']: s['c'] for s in statuses}
            result.append({
                'query': sample.query if sample else item['query_normalized'],
                'query_normalized': item['query_normalized'],
                'count': item['count'],
                'new_count': status_map.get('new', 0),
                'fulfilled_count': status_map.get('fulfilled', 0),
                'dismissed_count': status_map.get('dismissed', 0),
                'latest': item['latest'].isoformat() if item['latest'] else None,
                'first': item['first'].isoformat() if item['first'] else None,
            })

        # Total stats
        total = qs.count()
        new_count = qs.filter(status='new').count()
        fulfilled_count = qs.filter(status='fulfilled').count()

        # Trend: requests per day for last 14 days
        from django.utils import timezone
        end = timezone.now().date()
        start = end - timezone.timedelta(days=13)
        daily = qs.filter(created_at__date__gte=start).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')

        daily_data = {str(d['date']): d['count'] for d in daily}
        trend = []
        for i in range(14):
            d = str(start + timezone.timedelta(days=i))
            trend.append({'date': d, 'count': daily_data.get(d, 0)})

        return Response({
            'total': total,
            'new_count': new_count,
            'fulfilled_count': fulfilled_count,
            'top_items': result,
            'trend': trend,
        })
