from pathlib import Path

import pytest

from backend.roleplay.scenario_loader import ScenarioRepository
from backend.services.practice_service import PracticeService

SCENARIOS = Path("data/scenarios/scenarios.json")


class RecordingGraph:
    def __init__(self, response):
        self.response = response
        self.start_calls = []
        self.continue_calls = []

    async def start(self, session_id, scenario_id):
        self.start_calls.append((session_id, scenario_id))
        return {**self.response, "session_id": session_id, "scenario_id": scenario_id}

    async def continue_session(self, session_id, advisor_message):
        self.continue_calls.append((session_id, advisor_message))
        return {**self.response, "session_id": session_id}


def session_response():
    return {
        "session_id": "ignored",
        "scenario_id": "SCENARIO_01_VF5_TAXI",
        "difficulty": "Medium",
        "sales_channel": "Fanpage",
        "training_objective": "Practice discovery",
        "conversation_stage": "opening",
        "turn_count": 0,
        "visible_context": "A customer asks about switching cars.",
        "termination_status": "active",
        "termination_reason": None,
        "messages": [],
    }


def build_service():
    graph = RecordingGraph(session_response())
    service = PracticeService(
        graph,
        ScenarioRepository(SCENARIOS),
        session_id_factory=lambda: "generated-session-id",
    )
    return service, graph


def test_list_scenarios_returns_only_public_summaries():
    service, _ = build_service()

    summaries = [summary.model_dump() for summary in service.list_scenarios()]

    assert len(summaries) == 3
    assert all("hidden_facts" not in summary for summary in summaries)


@pytest.mark.asyncio
async def test_start_session_generates_identifier_and_validates_response():
    service, graph = build_service()

    result = await service.start_session("SCENARIO_01_VF5_TAXI")

    assert result.session_id == "generated-session-id"
    assert graph.start_calls == [("generated-session-id", "SCENARIO_01_VF5_TAXI")]


@pytest.mark.asyncio
async def test_send_message_keeps_session_identifier():
    service, graph = build_service()

    result = await service.send_message("session-1", "Xin chào anh")

    assert result.session_id == "session-1"
    assert graph.continue_calls == [("session-1", "Xin chào anh")]
