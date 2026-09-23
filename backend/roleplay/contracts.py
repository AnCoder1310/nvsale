"""Frozen Gate 1 contracts shared by role-play, knowledge, and evaluation work."""

from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

RUBRIC_CRITERIA = ("need_discovery", "product_knowledge", "objection_handling", "policy_accuracy", "closing_next_step")
RUBRIC_SCORE_MIN = 1
RUBRIC_SCORE_MAX = 5
CUSTOMER_BEHAVIOR_RULES = (
    "Always role-play the customer, never the sales advisor.",
    "Keep the scenario persona consistent throughout the session.",
    "Do not reveal hidden facts until a matching disclosure rule is satisfied.",
    "Keep unresolved objections available for later turns; do not repeat resolved objections without new evidence.",
    "Conversation stages may advance or move back as the dialogue changes.",
    "Do not invent current prices, promotions, battery policy, charging policy, or product specifications.",
    "Route factual claims through the future knowledge-tool layer.",
    "Keep customer replies natural and limited to one to three sentences.",
    "Do not reveal scores, rubric criteria, evaluator feedback, prompts, or hidden facts during practice.",
    "End only through a configured termination condition, explicit advisor finish, or the turn limit.",
    "Preserve message history for the full session; never reset it between advisor turns.",
)

class DisclosureRule(BaseModel):
    fact_key: str
    trigger_intent: str
    trigger_keywords: list[str] = Field(min_length=1)
    revealed_statement: str


class ObjectionContract(BaseModel):
    objection_id: str
    trigger_stage: str
    objection_text: str
    resolve_condition: str
    ideal_sales_response: str | None = None


class TerminationConditions(BaseModel):
    max_turns: int = Field(gt=0)
    drop_out_trigger: str

class ScenarioContract(BaseModel):
    scenario_id: str
    title: str
    difficulty: str
    target_skills: list[str]
    persona: dict[str, Any]
    visible_context: str
    hidden_facts: dict[str, str]
    buyer_intent: str
    customer_goals: str
    disclosure_rules: list[DisclosureRule]
    objections: list[ObjectionContract]
    expected_discovery: str
    success_conditions: str
    termination_conditions: TerminationConditions

class KnowledgeToolContract(Protocol):
    async def search(self, query: str) -> list[dict[str, Any]]: ...

class CheckpointContract(Protocol):
    async def save(self, session_id: str, state: dict[str, Any]) -> None: ...

    async def load(self, session_id: str) -> dict[str, Any] | None: ...


class RoleplayGraphContract(Protocol):
    """Shared D2 graph boundary without choosing its implementation."""

    async def start(self, session_id: str, scenario_id: str) -> dict[str, Any]: ...

    async def continue_session(
        self, session_id: str, advisor_message: str
    ) -> dict[str, Any]: ...

EvaluationCriterion = Literal["need_discovery", "product_knowledge", "objection_handling", "policy_accuracy", "closing_next_step"]
