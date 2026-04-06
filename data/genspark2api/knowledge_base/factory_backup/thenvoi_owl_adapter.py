# thenvoi_owl_adapter.py
import asyncio
from typing import AsyncGenerator, List, Optional
from thenvoi import Agent
from thenvoi.adapters import BaseAdapter
from thenvoi.models import Message, MessagePart
from camel.societies import Workforce
from camel.tasks.task import Task

class OWLWorkforceAdapter(BaseAdapter):
    """
    Adapter for CAMEL-AI / OWL Workforce.
    Allows a multi-agent workforce to participate in Thenvoi chatrooms.
    """
    def __init__(self, workforce: Workforce):
        self.workforce = workforce

    async def run_turn(self, messages: List[Message]) -> AsyncGenerator[dict, None]:
        # Extract the last message from the chatroom
        last_msg = messages[-1]
        user_input = ""
        for part in last_msg.parts:
            if part.type == "text":
                user_input += part.content

        # Initialize OWL Task
        task = Task(content=user_input)
        
        # Process using OWL Workforce
        # Note: process_task is synchronous in current OWL version
        # We run it in a thread to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        processed_task = await loop.run_in_executor(None, self.workforce.process_task, task)

        # Map OWL result back to Thenvoi format
        yield {
            "role": "assistant",
            "parts": [{"type": "text", "content": processed_task.result}]
        }

def create_owl_thenvoi_agent(agent_id: str, api_key: str, workforce: Workforce):
    adapter = OWLWorkforceAdapter(workforce)
    return Agent.create(
        adapter=adapter,
        agent_id=agent_id,
        api_key=api_key
    )
