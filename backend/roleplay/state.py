"""Business state only. Runtime graph, persistence, and LLM behavior begin in D2."""

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field

from .contracts import ScenarioContract


class ConversationStage(StrEnum):
    OPENING = "opening"
    DISCOVERY = "discovery"
    PRESENTATION = "presentation"
    OBJECTION_HANDLING = "objection_handling"
    CLOSING = "closing"
    FINISHED = "finished"

class TerminationStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ADVISOR_ENDED = "advisor_ended"
    DROPPED_OUT = "dropped_out"
    MAX_TURNS = "max_turns"

class RoleplayMessage(BaseModel):
    role: Literal["customer", "advisor"]
    content: str = Field(min_length=1)

class RoleplayState(BaseModel):
    session_id: str
    scenario_id: str
    difficulty: str
    persona: dict[str, Any] = Field(default_factory=dict)
    conversation_stage: ConversationStage = ConversationStage.OPENING
    turn_count: int = Field(default=0, ge=0)
    trust_level: int = Field(default=3, ge=1, le=5)
    interest_level: int = Field(default=3, ge=1, le=5)
    visible_context: str
    hidden_facts: dict[str, str] = Field(default_factory=dict)
    revealed_facts: list[str] = Field(default_factory=list)
    advisor_discoveries: list[str] = Field(default_factory=list)
    active_objections: list[str] = Field(default_factory=list)
    resolved_objections: list[str] = Field(default_factory=list)
    unresolved_objections: list[str] = Field(default_factory=list)
    customer_goals: str
    current_intent: str
    current_topic: str | None = None
    termination_status: TerminationStatus = TerminationStatus.ACTIVE
    termination_reason: str | None = None
    messages: list[RoleplayMessage] = Field(default_factory=list)

    @classmethod
    def from_scenario(cls, session_id: str, scenario: ScenarioContract) -> "RoleplayState":
        objection_ids = [item.objection_id for item in scenario.objections]
        return cls(
            session_id=session_id,
            scenario_id=scenario.scenario_id,
            difficulty=scenario.difficulty,
            persona=scenario.persona,
            visible_context=scenario.visible_context,
            hidden_facts=scenario.hidden_facts,
            unresolved_objections=objection_ids,
            customer_goals=scenario.customer_goals,
            current_intent=scenario.buyer_intent,
        )

    def customer_prompt_context(self) -> dict[str, Any]:
        """Server-only context for the customer model; unrevealed facts stay private."""
        return {
            "scenario_id": self.scenario_id,
            "difficulty": self.difficulty,
            "persona": self.persona,
            "conversation_stage": self.conversation_stage.value,
            "trust_level": self.trust_level,
            "interest_level": self.interest_level,
            "visible_context": self.visible_context,
            "customer_goals": self.customer_goals,
            "current_intent": self.current_intent,
            "revealed_facts": self.revealed_facts,
            "active_objections": self.active_objections,
            "messages": [message.model_dump() for message in self.messages],
        }

    def advisor_visible_context(self) -> dict[str, Any]:
        """Frontend context for the trainee; it excludes private customer state."""
        return {
            "session_id": self.session_id,
            "scenario_id": self.scenario_id,
            "conversation_stage": self.conversation_stage.value,
            "turn_count": self.turn_count,
            "visible_context": self.visible_context,
            "termination_status": self.termination_status.value,
            "termination_reason": self.termination_reason,
            "messages": [message.model_dump() for message in self.messages],
        }
