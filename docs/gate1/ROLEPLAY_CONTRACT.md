# Gate 1 Role-play Contract

## Scope

D1 freezes business contracts only: no graph runtime, LLM customer, API, persistence,
retrieval, or evaluator implementation.

## State and session lifecycle

`RoleplayState` is initialized from `ScenarioContract` with a `session_id`. It keeps
scenario identity, difficulty, persona, stages, turn count, trust/interest, visible
and hidden facts, objections, discoveries, termination state, and message history.
Objections and termination conditions are nested typed contracts. All scenario
objections start as unresolved. They are not active until D2 checks `trigger_stage`.
D2 will load a scenario, create state, append turns, checkpoint it, then evaluate
after termination.

## Context boundaries

`customer_prompt_context()` is server-only input for the AI customer. It includes
difficulty, persona, trust/interest levels, customer goals, current intent, revealed
facts, active objections, and chat history. It never includes unrevealed
`hidden_facts`.

`advisor_visible_context()` is the frontend/trainee contract. It exposes only session
identity, stage, turn count, visible context, termination status, and chat history. It
does not expose hidden facts, difficulty, persona, trust/interest levels, customer
goals, current intent, any objection state, disclosure rules, rubric data, or
evaluator feedback.

## Customer behavior

The AI is always the customer. It keeps persona/history, reveals hidden facts only by
disclosure rule, can revisit unresolved objections, and never reveals rubric/evaluator
feedback. Replies should be one to three natural sentences. Current price, promotion,
battery, charging, and product facts must use the future knowledge tool, not scenario
data or code.

## Stages and termination

Stages are `opening`, `discovery`, `presentation`, `objection_handling`, `closing`, and
`finished`. D2 can move them forward or backward based on dialogue. Termination is
active, completed, advisor-ended, dropped-out, or max-turns.

## Integration boundary

`RoleplayGraphContract.start(session_id, scenario_id)` and
`continue_session(session_id, advisor_message)` are the frozen D2 graph boundary.
Chuong supplies checkpoint/knowledge implementations. Duy owns state semantics and
customer behavior. An receives `advisor_visible_context()` only. Evaluation later
uses the shared five criteria and 1–5 scale from
`backend/knowledge/metadata.py`.
