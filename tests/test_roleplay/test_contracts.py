import json
from pathlib import Path

import pytest

from backend.roleplay.contracts import (
    RUBRIC_CRITERIA,
    RUBRIC_SCORE_MAX,
    RUBRIC_SCORE_MIN,
    ScenarioContract,
)
from backend.roleplay.state import RoleplayState

SCENARIOS = Path("data/scenarios/scenarios.json")

def test_all_gate1_scenarios_load_and_initialize_state():
    raw_scenarios = json.loads(SCENARIOS.read_text(encoding="utf-8"))
    assert len(raw_scenarios) == 3
    for raw_scenario in raw_scenarios:
        scenario = ScenarioContract.model_validate(raw_scenario)
        state = RoleplayState.from_scenario(f"session-{scenario.scenario_id}", scenario)
        assert state.scenario_id == scenario.scenario_id
        assert state.difficulty == scenario.difficulty
        assert state.persona == scenario.persona
        assert state.turn_count == 0
        assert state.active_objections == []
        assert state.unresolved_objections == [
            objection.objection_id for objection in scenario.objections
        ]

def test_customer_prompt_does_not_leak_unrevealed_hidden_facts():
    scenario = ScenarioContract.model_validate(json.loads(SCENARIOS.read_text(encoding="utf-8"))[0])
    state = RoleplayState.from_scenario("session-1", scenario)
    prompt_context = state.customer_prompt_context()
    assert "hidden_facts" not in prompt_context
    assert all(value not in str(prompt_context) for value in scenario.hidden_facts.values())
    assert prompt_context["difficulty"] == scenario.difficulty
    assert prompt_context["trust_level"] == state.trust_level
    assert prompt_context["interest_level"] == state.interest_level


def test_advisor_visible_context_excludes_private_customer_state():
    scenario = ScenarioContract.model_validate(json.loads(SCENARIOS.read_text(encoding="utf-8"))[0])
    state = RoleplayState.from_scenario("session-1", scenario)
    advisor_context = state.advisor_visible_context()

    private_keys = {
        "hidden_facts",
        "persona",
        "difficulty",
        "trust_level",
        "interest_level",
        "customer_goals",
        "current_intent",
        "active_objections",
        "resolved_objections",
        "unresolved_objections",
        "disclosure_rules",
        "rubric",
        "evaluator",
    }
    assert private_keys.isdisjoint(advisor_context)
    assert scenario.customer_goals not in str(advisor_context)
    assert scenario.buyer_intent not in str(advisor_context)
    assert all(value not in str(advisor_context) for value in scenario.hidden_facts.values())
    assert all(
        objection.objection_id not in str(advisor_context)
        for objection in scenario.objections
    )


def test_malformed_objection_is_rejected():
    raw_scenario = json.loads(SCENARIOS.read_text(encoding="utf-8"))[0]
    raw_scenario["objections"] = [{"objection_id": "OBJ_INCOMPLETE"}]

    with pytest.raises(ValueError):
        ScenarioContract.model_validate(raw_scenario)


@pytest.mark.parametrize("invalid_max_turns", [0, -1, "not-a-number"])
def test_invalid_max_turns_is_rejected(invalid_max_turns):
    raw_scenario = json.loads(SCENARIOS.read_text(encoding="utf-8"))[0]
    raw_scenario["termination_conditions"]["max_turns"] = invalid_max_turns

    with pytest.raises(ValueError):
        ScenarioContract.model_validate(raw_scenario)

def test_rubric_contract_uses_the_shared_one_to_five_scale():
    assert len(RUBRIC_CRITERIA) == 5
    assert (RUBRIC_SCORE_MIN, RUBRIC_SCORE_MAX) == (1, 5)
