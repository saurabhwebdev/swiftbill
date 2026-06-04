from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DemandRequestViewSet

router = DefaultRouter()
router.register(r'requests', DemandRequestViewSet, basename='demand-request')

urlpatterns = [
    path('', include(router.urls)),
]
