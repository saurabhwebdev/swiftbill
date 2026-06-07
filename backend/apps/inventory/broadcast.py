from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def broadcast_stock_update(store_id, product_stock_list):
    """
    Broadcast stock changes to all connected terminals of a store.
    product_stock_list: list of {'product_id': int, 'quantity': int}
    """
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'stock_{store_id}',
        {
            'type': 'stock_update',
            'products': product_stock_list,
        }
    )
