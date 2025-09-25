from neomodel import (
    StructuredNode, StringProperty, DateTimeProperty,
    RelationshipTo, RelationshipFrom
)
from datetime import datetime

class Game(StructuredNode):
    external_id = StringProperty(unique_index=True, required=True)
    title = StringProperty(required=True)
    description = StringProperty()
    cover_url = StringProperty()
    play_url = StringProperty()
    source = StringProperty(required=True)  # e.g. "GamePix" or "CrazyGames"
    created_at = DateTimeProperty(default_now=True)

class Server(StructuredNode):
    name = StringProperty(unique_index=True, required=True)
    description = StringProperty()
    channels = RelationshipTo('Channel', 'HAS_CHANNEL')
    members = RelationshipFrom('User', 'MEMBER_OF')  # <-- use string here too

class User(StructuredNode):
    username = StringProperty(unique_index=True, required=True)
    email = StringProperty(unique_index=True)
    password_hash = StringProperty()
    servers = RelationshipTo('Server', 'MEMBER_OF')


class Channel(StructuredNode):
    name = StringProperty(required=True)
    server = RelationshipFrom(Server, 'HAS_CHANNEL')
    messages = RelationshipTo('Message', 'HAS_MESSAGE')

class Message(StructuredNode):
    content = StringProperty(required=True)
    timestamp = DateTimeProperty(default_now=True)
    sender = RelationshipFrom(User, 'SENT')
    channel = RelationshipFrom(Channel, 'HAS_MESSAGE')
