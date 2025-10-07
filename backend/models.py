from neomodel import (
    StructuredNode, StringProperty, DateTimeProperty,
    RelationshipTo, RelationshipFrom, Relationship
)
from datetime import datetime

# Game model
class Game(StructuredNode):
    external_id = StringProperty(unique_index=True, required=True)
    title = StringProperty(required=True)
    description = StringProperty()
    cover_url = StringProperty()
    play_url = StringProperty()
    source = StringProperty(required=True)  # e.g. "GamePix" or "CrazyGames"
    created_at = DateTimeProperty(default_now=True)

# Server model
class Server(StructuredNode):
    name = StringProperty(unique_index=True, required=True)
    description = StringProperty()
    channels = RelationshipTo('Channel', 'HAS_CHANNEL')
    members = RelationshipFrom('User', 'MEMBER_OF')  # users linked to server

# User model
class User(StructuredNode):
    username = StringProperty(unique_index=True, required=True)
    email = StringProperty(unique_index=True)
    password_hash = StringProperty()
    profile_picture = StringProperty()  # URL to profile picture
    bio = StringProperty()  # Optional bio
    created_at = DateTimeProperty(default_now=True)
    servers = RelationshipTo('Server', 'MEMBER_OF')
    friends = Relationship('User', 'FRIEND_WITH')
    sent_requests = RelationshipTo('User', 'SENT_REQUEST')
    received_requests = RelationshipFrom('User', 'SENT_REQUEST')
    messages = RelationshipTo('Message', 'SENT')
    sent_dms = RelationshipTo('DirectMessage', 'SENT_DM')
    received_dms = RelationshipTo('DirectMessage', 'RECEIVED_DM')

# Channel model
class Channel(StructuredNode):
    name = StringProperty(required=True)
    type = StringProperty(
        choices={'text': 'text', 'voice': 'voice', 'video': 'video'}, 
        default='text'
    )
    server = RelationshipFrom('Server', 'HAS_CHANNEL')
    messages = RelationshipTo('Message', 'HAS_MESSAGE')

# Message model
class Message(StructuredNode):
    content = StringProperty(required=True)
    type = StringProperty(
        choices={'text': 'text', 'voice': 'voice', 'video': 'video'},
        default='text'
    )
    timestamp = DateTimeProperty(default_now=True)
    sender = RelationshipFrom('User', 'SENT')
    channel = RelationshipFrom('Channel', 'HAS_MESSAGE')

# Direct Message model
class DirectMessage(StructuredNode):
    content = StringProperty(required=True)
    timestamp = DateTimeProperty(default_now=True)
    sender = RelationshipFrom('User', 'SENT_DM')
    receiver = RelationshipFrom('User', 'RECEIVED_DM')
