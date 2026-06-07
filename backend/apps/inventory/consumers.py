import json
from channels.generic.websocket import AsyncWebsocketConsumer


class StockSyncConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.store_id = self.scope['url_route']['kwargs']['store_id']
        self.group_name = f'stock_{self.store_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def stock_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'stock_update',
            'products': event['products'],
        }))
