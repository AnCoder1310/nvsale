# Role-play Contract

## Scope

This document is the living business contract for the role-play vertical slice. D1
created the initial schema; later build changes must keep this document, typed
contracts, consumers, tests, and UI semantics aligned.

## State and session lifecycle

`RoleplayState` is initialized from `ScenarioContract` with a `session_id`. It keeps
scenario identity, difficulty, persona, stages, turn count, trust/interest, visible
and hidden facts, objections, discoveries, termination state, and message history.
Objections and termination conditions are nested typed contracts. All scenario
objections start as unresolved. They are not active until D2 checks `trigger_stage`.
D2 loads a scenario, creates state, persists every turn, and checkpoints it. On
termination it persists the final turn, freezes the transcript, then starts the
recoverable evaluation job. A provider/evaluator failure must not lose the session.

Difficulty is selected before the session and remains fixed for that attempt.
Adaptive difficulty inside an attempt is out of MVP scope; later attempts may use a
different configured difficulty.

## Context boundaries

`customer_prompt_context()` is server-only input for the AI customer. It includes
difficulty, persona, trust/interest levels, customer goals, current intent, revealed
facts, active objections, and chat history. It never includes unrevealed
`hidden_facts`.

`advisor_visible_context()` is the frontend/trainee contract. It exposes session
identity, stage, turn count, chosen difficulty, sales channel/training objective when
configured, visible context, termination status, and chat history. It does not expose
hidden facts, private persona controls, trust/interest levels, customer goals, current
intent, objection state, disclosure rules, rubric internals, or evaluator feedback.

Visible context contains only information the advisor can reasonably know before the
conversation. A fact shown there cannot later be treated as successful discovery.

## Customer behavior

The AI is always the customer. It keeps persona/history, reveals hidden facts only
after an allowed semantic disclosure intent is detected, can revisit unresolved
objections, and never reveals rubric/evaluator feedback. `trigger_keywords` are test
examples and fallback hints, not exact phrases the advisor must say. Broad questions
may reveal a partial clue; a single prompt must not dump all hidden facts.

Turn analysis proposes known intent/fact/objection IDs and application code validates
them against scenario state before updating it. The customer model receives only facts
already revealed or explicitly allowed for the current turn. Replies should normally
be one to three natural sentences. Current price, promotion, battery, charging, and
product facts must use the knowledge tool, not scenario data or code.

## Stages and termination

Stages are `opening`, `discovery`, `presentation`, `objection_handling`, `closing`, and
`finished`. D2 can move them forward or backward based on dialogue. Termination is
active, completed, advisor-ended, dropped-out, or max-turns.

## Integration boundary

`RoleplayGraphContract.start(session_id, scenario_id)` and
`continue_session(session_id, advisor_message)` are the stable D2 graph boundary.
The session lifecycle additionally needs idempotent finish and selected-attempt submit
operations at the service/API layer. Finishing creates a provisional AI result; it
does not automatically enter Manager review. Only an advisor-submitted attempt enters
the queue and only Manager approval makes it official.

Duy owns the complete practice lifecycle and role-play graph semantics. Chương
supplies checkpoint, persistence, knowledge and platform integrations. An consumes
public scenario/session DTOs only. Evaluation uses the shared five criteria and 1–5
scale from `backend/knowledge/metadata.py`, supports `ASSESSED`, `NOT_OBSERVED`, and
`INSUFFICIENT_EVIDENCE`, and requires verified transcript evidence for every assessed
score.
