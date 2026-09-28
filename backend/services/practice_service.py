"""Application service for advisor-facing role-play operations."""

from __future__ import annotations

from collections.abc import Callable
from uuid import uuid4

from pydantic import BaseModel, ConfigDict

from backend.roleplay.contracts import RoleplayGraphContract
from backend.roleplay.scenario_loader import ScenarioRepository, ScenarioSummary
from backend.roleplay.state import (
    ConversationStage,
    RoleplayMessage,
    TerminationStatus,
)


class PracticeSessionView(BaseModel):
    """Public session shape consumed by the Practice Room frontend."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    scenario_id: str
    difficulty: str
    sales_channel: str | None = None
    training_objective: str | None = None
    conversation_stage: ConversationStage
    turn_count: int
    visible_context: str
    termination_status: TerminationStatus
    termination_reason: str | None = None
    messages: list[RoleplayMessage]


class PracticeService:
    """Keep HTTP handlers independent from graph and persistence details."""

    def __init__(
        self,
        graph: RoleplayGraphContract,
        scenarios: ScenarioRepository,
        *,
        session_id_factory: Callable[[], str] | None = None,
    ) -> None:
        self._graph = graph
        self._scenarios = scenarios
        self._session_id_factory = session_id_factory or (lambda: str(uuid4()))

    def list_scenarios(self) -> list[ScenarioSummary]:
        return self._scenarios.list_public()

    async def start_session(self, scenario_id: str) -> PracticeSessionView:
        session_id = self._session_id_factory()
        result = await self._graph.start(session_id, scenario_id)
        return PracticeSessionView.model_validate(result)

    async def send_message(
        self,
        session_id: str,
        advisor_message: str,
    ) -> PracticeSessionView:
        result = await self._graph.continue_session(session_id, advisor_message)
        return PracticeSessionView.model_validate(result)
