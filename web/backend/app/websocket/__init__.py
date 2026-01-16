"""
WebSocket handler for real-time updates.
"""

import asyncio
import json
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# Connection Manager
# ============================================================================

class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.subscriptions: dict[str, set[str]] = {}  # client_id -> set of topics

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = set()
        logger.info(f"Client connected: {client_id}")

    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        logger.info(f"Client disconnected: {client_id}")

    async def send_personal(self, client_id: str, message: dict):
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to {client_id}: {e}")

    async def broadcast(self, message: dict, topic: Optional[str] = None):
        """Broadcast a message to all clients (optionally filtered by topic)."""
        for client_id, websocket in self.active_connections.items():
            if topic and topic not in self.subscriptions.get(client_id, set()):
                continue
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Broadcast failed for {client_id}: {e}")

    def subscribe(self, client_id: str, topic: str):
        """Subscribe a client to a topic."""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].add(topic)

    def unsubscribe(self, client_id: str, topic: str):
        """Unsubscribe a client from a topic."""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].discard(topic)


manager = ConnectionManager()


# ============================================================================
# Event Broadcaster (for use by services)
# ============================================================================

class EventBroadcaster:
    """Utility for broadcasting events from services."""

    @staticmethod
    async def research_started(task_id: str):
        """Broadcast research started event."""
        await manager.broadcast({
            "type": "research:started",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat(),
        })

    @staticmethod
    async def research_progress(task_id: str, stage: str, message: str):
        """Broadcast research progress event."""
        await manager.broadcast({
            "type": "research:progress",
            "task_id": task_id,
            "stage": stage,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }, topic=f"research:{task_id}")

    @staticmethod
    async def agent_status(agent_id: str, status: str, task: Optional[str] = None):
        """Broadcast agent status change."""
        await manager.broadcast({
            "type": "agent:status",
            "agent_id": agent_id,
            "status": status,
            "task": task,
            "timestamp": datetime.now().isoformat(),
        }, topic=f"agent:{agent_id}")

    @staticmethod
    async def agent_output(agent_id: str, output: str, streaming: bool = False):
        """Broadcast agent output."""
        await manager.broadcast({
            "type": "agent:output",
            "agent_id": agent_id,
            "output": output,
            "streaming": streaming,
            "timestamp": datetime.now().isoformat(),
        }, topic=f"agent:{agent_id}")

    @staticmethod
    async def research_completed(task_id: str, result: dict):
        """Broadcast research completed event."""
        await manager.broadcast({
            "type": "research:completed",
            "task_id": task_id,
            "result": result,
            "timestamp": datetime.now().isoformat(),
        }, topic=f"research:{task_id}")


broadcaster = EventBroadcaster()


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time updates."""
    # Generate client ID
    client_id = f"client_{datetime.now().strftime('%H%M%S')}_{id(websocket)}"
    
    await manager.connect(websocket, client_id)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "client_id": client_id,
            "message": "Connected to NEXEN Web",
        })
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_client_message(client_id, message)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON",
                })
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)


async def handle_client_message(client_id: str, message: dict):
    """Handle incoming client messages."""
    msg_type = message.get("type", "")
    
    if msg_type == "subscribe":
        # Subscribe to a topic (e.g., "research:task_id" or "agent:explorer")
        topic = message.get("topic", "")
        manager.subscribe(client_id, topic)
        await manager.send_personal(client_id, {
            "type": "subscribed",
            "topic": topic,
        })
        
    elif msg_type == "unsubscribe":
        topic = message.get("topic", "")
        manager.unsubscribe(client_id, topic)
        await manager.send_personal(client_id, {
            "type": "unsubscribed",
            "topic": topic,
        })
        
    elif msg_type == "ping":
        await manager.send_personal(client_id, {
            "type": "pong",
            "timestamp": datetime.now().isoformat(),
        })
        
    else:
        await manager.send_personal(client_id, {
            "type": "error",
            "message": f"Unknown message type: {msg_type}",
        })
