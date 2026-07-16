# Lecture 5: Agent Harness Design — Control Loops, Validation, and Reliability
### AI Systems Engineering for Agentic Workflows — M1: Foundations

---

## Core Thesis

> **A harness does not make the model smarter. It makes the system more robust to the model's inherent unreliability. A well-designed LLM with a poorly designed harness will fail in production. A modest LLM with a well-designed harness will not.**

Lectures 1–4 covered what an agent knows (memory) and how it decides what to do next (planning). This lecture covers how the agent is held together as software — the scaffolding layer, called the **harness**, that sits around the LLM and turns its probabilistic output into reliable software behaviour.

---

## The Opening Problem: The LLM-to-Software Gap

Every agent sits between two very different worlds:

| The LLM | The rest of the software stack |
|---|---|
| Probabilistic — same input can produce different outputs | Deterministic — same input always produces same output |
| Unconstrained — can return any text, any format, any length | Typed and bounded — expects specific inputs in specific shapes |
| Expressive — will try to answer even when it shouldn't | Brittle — throws exceptions when inputs are wrong |

**The harness is the engineering layer that mediates between these two worlds.**

### A Real Failure to Start With

An agent is calling a tool that processes customer orders. The tool expects a JSON object:

```json
{"product_id": "laptop-pro", "quantity": 2, "customer_id": "C-1001"}
```

The LLM returns:

```
laptop-pro, 2, C-1001
```

A comma-separated string instead of JSON. The downstream Lambda function throws a 500 error. There is no retry. The order is lost. No alert fires. The engineering team discovers it the next morning from a customer complaint.

**What went wrong?** Not the model — this kind of format drift is normal. What was missing was a harness that:
1. Parsed and validated the output before passing it downstream
2. Retried the LLM call with an error message when parsing failed
3. Emitted an observable log event when the failure occurred

That gap — between what the model produces and what the software expects — is what the harness closes.

### Prompt Engineering vs. Harness Engineering

Students often ask: "Why not just write a better prompt?"

A better prompt reduces the *probability* of bad output. A harness handles bad output when it *inevitably* occurs. Both are necessary. Neither replaces the other.

```
Better prompt:   bad output happens 2% of the time instead of 5%
Harness:         when bad output happens, the system recovers gracefully

At 10,000 calls/day, 2% still means 200 failures per day.
Without a harness, all 200 are silent production failures.
```

---

## Part 1 — Harness Component Anatomy

A production harness has six components. Each one addresses a specific class of failure. Missing any one leaves a gap that will be discovered in production at the worst possible time.

```
┌─────────────────────────────────────────────────────────────┐
│                      AGENT HARNESS                          │
│                                                             │
│  ① INPUT VALIDATION                                         │
│       ↓                                                     │
│  ② GUARDRAIL (input)  ── block before LLM sees it         │
│       ↓                                                     │
│  ③ LLM CALL                                                │
│       ↓                                                     │
│  ④ GUARDRAIL (output) ── block before it leaves the agent  │
│       ↓                                                     │
│  ⑤ OUTPUT PARSING + TYPE ENFORCEMENT                       │
│       ↓                                                     │
│  ⑥ TOOL EXECUTION SAFETY WRAPPER                           │
│       ↓          ↑                                          │
│    [tool runs]   └── retry / fallback on failure           │
└─────────────────────────────────────────────────────────────┘
```

---

### Component 1 — Input Validation

**What it does:** checks everything *before* it reaches the LLM.

Think of it as a security guard at the front door. It checks IDs before anyone walks in.

**What to check:**
- **Schema** — does the input have the fields the agent expects?
- **Length limits** — is the input short enough that the context window won't overflow?
- **Token budget estimation** — given this input + system prompt + expected tool results, will we exceed the context limit partway through? Better to fail fast now than to crash on step 7.
- **Injection scanning** — does the input contain strings designed to manipulate the agent's behaviour? (e.g., "Ignore all previous instructions and...")

**Why it matters:** without input validation, garbage enters the pipeline and produces unpredictable output at unpredictable times — and you cannot tell whether the problem was the model or the input.

---

### Component 2 — Output Parsing and Type Enforcement

**What it does:** takes the LLM's raw text output and converts it into the typed, structured format the rest of the system expects.

This is the most commonly missed component. Teams assume the LLM will always return valid JSON because it usually does. "Usually" is not good enough for production.

**Two approaches:**

**Post-hoc validation (parse and reject):**

```
LLM returns output
    ↓
Try to parse it as JSON
    ↓
If valid → pass it downstream
If invalid → retry the LLM call with error message:
             "Your last response was not valid JSON.
              Return ONLY a JSON object with keys:
              product_id, quantity, customer_id."
```

Simple, works with any model. The LLM gets a second chance with clear error feedback.

**Constrained decoding (make bad output structurally impossible):**

Some frameworks (e.g. CRANE) apply grammar-guided generation — the LLM's token sampling is restricted at generation time so it *cannot produce* output that violates the schema. It is not post-hoc rejection; it is prevention.

```
Standard generation:  model can produce any token → may produce invalid JSON
Constrained decoding: model can only sample tokens that keep output valid JSON
                      → invalid output is structurally impossible
```

The tradeoff: constrained decoding guarantees format compliance but can slightly reduce reasoning quality on complex tasks, because restricting which tokens the model can generate also constrains how it thinks. Use it for high-volume, simple-structured outputs (classification labels, structured slots). Use post-hoc validation for complex reasoning tasks where you want full generation freedom.

**Key rule:** never pass LLM output directly to a downstream system without parsing and type-checking it first.

---

### Component 3 — Retry Logic with Exponential Backoff

**What it does:** when a call fails transiently, waits and tries again — with increasing wait times and a cap on total attempts.

**Not all failures should be retried.** This is critical:

| Error type | Retry? | Why |
|---|---|---|
| Rate limit (429) | ✓ Yes | Transient — will resolve |
| Network timeout | ✓ Yes | Transient — will resolve |
| Malformed LLM output | ✓ Yes | Model can produce better output on retry |
| Authentication failure (401) | ✗ No | Retrying won't fix a bad API key |
| Context window exceeded | ✗ No | Retrying with the same input will fail again |
| Tool permission denied | ✗ No | Retrying won't grant new permissions |

**Exponential backoff with jitter — the formula:**

```
wait_time = min(max_wait, base_delay × 2^attempt) + random_jitter

Example with base=1s, max=30s:
  Attempt 1: wait = min(30, 1 × 2¹) + jitter ≈ 2–3 seconds
  Attempt 2: wait = min(30, 1 × 2²) + jitter ≈ 4–6 seconds
  Attempt 3: wait = min(30, 1 × 2³) + jitter ≈ 8–12 seconds
  Attempt 4: wait = min(30, 1 × 2⁴) + jitter ≈ 16–20 seconds
  Attempt 5: stop — max retries reached
```

**Why jitter matters:** without jitter, all agents that fail at the same moment retry at the same moment — flooding the downstream service with a synchronised surge. Jitter spreads the retries out. In a multi-agent system with hundreds of concurrent agents, this is not optional.

**The retry budget is mandatory:** every retry loop must have a hard maximum. An uncapped retry loop is an infinite loop waiting to happen.

```python
# Required parameters for any retry loop
MAX_RETRIES = 3       # absolute ceiling
BASE_DELAY  = 1.0     # seconds
MAX_DELAY   = 30.0    # seconds
```

---

### Component 4 — Fallback Chains

**What it does:** defines what the system does when retries are exhausted — not crash, but gracefully degrade.

A fallback chain is an ordered list of alternatives. The harness tries each one in sequence until something works.

```
Primary path fails after MAX_RETRIES:
    ↓
Fallback 1: try a smaller, cheaper model with a simpler prompt
    ↓ (if still fails)
Fallback 2: return a cached response from a similar past query
    ↓ (if no cache hit)
Fallback 3: return a safe default response ("I'm unable to process
             this request right now — please try again later")
    ↓ (for high-stakes actions)
Fallback 4: escalate to human review queue
```

The key principle: **fallback chains must be explicit code, not implicit hope.** If you have not written the fallback, it does not exist. "The model usually works" is not a fallback chain.

---

### Component 5 — Guardrail Integration

**What it does:** inserts policy checks at specific points in the harness to block harmful or non-compliant content.

There are three places to put a guardrail — each catches different things:

```
User input arrives
    ↓
[INPUT GUARDRAIL]    ← catch: injection attacks, off-topic requests,
    ↓                          PII in the input
LLM generates output
    ↓
[OUTPUT GUARDRAIL]   ← catch: harmful content, policy violations,
    ↓                          PII in the model's response
Tool is about to execute
    ↓
[ACTION GUARDRAIL]   ← catch: dangerous tool calls before they fire
    ↓                          (e.g., about to delete production data)
Tool executes
```

A guardrail that only runs on the output misses injection attacks in the input. A guardrail that only runs on the input misses policy violations the model produces on its own. In high-stakes systems, you need all three.

---

### Component 6 — Tool Execution Safety Wrapper

**What it does:** wraps every tool call with timeout enforcement, exception handling, and structured error returns.

Without this wrapper, an unhandled tool exception crashes the agent. With it, the exception is caught, formatted into a structured error object, and returned to the LLM so it can reason about what went wrong.

```
WITHOUT a safety wrapper:
  Agent calls get_customer("C-9999")
  Tool raises: KeyError: 'C-9999'
  Agent crashes. No response. No retry. No log.

WITH a safety wrapper:
  Agent calls get_customer("C-9999")
  Wrapper catches: KeyError: 'C-9999'
  Wrapper returns: {"error": "Customer C-9999 not found",
                    "tool": "get_customer",
                    "recoverable": true}
  LLM sees the structured error and can reason:
  "The customer ID is wrong. I should ask the user to confirm it."
```

The LLM can only recover from a tool failure if it receives a structured error. An unhandled exception tells the model nothing. **Always catch exceptions and return structured error objects.**

Also enforce **timeouts** on every tool call. A tool that hangs indefinitely hangs the entire agent.

---

## Part 2 — Retry, Recovery, and Transactions

### Idempotency: The Prerequisite for Safe Retries

Before retrying any tool call that has side effects, you must ask: **is this tool idempotent?**

An idempotent operation produces the same result whether it runs once or ten times. A read is always safe to retry. A write may not be.

| Tool | Idempotent? | Safe to retry? |
|---|---|---|
| `get_product("laptop-pro")` | ✓ Yes — read | ✓ Always |
| `search_documents("return policy")` | ✓ Yes — read | ✓ Always |
| `send_email(to="alice@...", body="...")` | ✗ No — write | ✗ Alice gets two emails |
| `charge_card(amount=1104.99)` | ✗ No — write | ✗ Alice gets charged twice |
| `update_order_status("shipped")` | Depends — idempotent if "set status", not if "increment" | Check the implementation |

**The rule:** classify every tool in your system as idempotent or not before writing retry logic. Non-idempotent tools must not be automatically retried by the harness. Instead: retry the *planning* step (ask the LLM to reason about what happened) without re-executing the tool.

---

### PALADIN: Two-Level Self-Correction

The **PALADIN model** (Vuddanti et al., ICLR 2026) describes a structured recovery architecture for handling tool failures. Instead of either crashing or blindly retrying, it defines two levels of recovery:

**Level 1 — Automatic correction (the harness tries to fix it):**

```
Tool fails → harness formats the error as structured context
           → re-prompts the LLM: "The tool returned this error: [error].
              Reason about what went wrong and try a different approach."
           → LLM attempts a corrected tool call
```

The key insight: the error message itself is diagnostic information. If you format it correctly, the LLM can often diagnose and fix its own mistake.

**Level 2 — Escalation (human reviews):**

If automatic correction fails after N attempts, the harness:
- Pauses the workflow
- Surfaces the failure with full context to a human reviewer
- Waits for approval or correction before continuing

This is the production answer to "what happens when the agent can't fix itself?" The harness decides what gets automatic correction and what gets human review — that boundary is a design decision you make explicitly.

```
Tool failure
    ↓
Format error as structured context
    ↓
Re-prompt LLM with error ──► LLM corrects itself → continue
    ↓ (if still fails after N attempts)
Escalate to human review queue
    ↓
Human approves / corrects
    ↓
Resume workflow
```

---

### The Saga Pattern: What Happens When Step 5 of 7 Fails?

In a multi-step agent workflow, each step may have changed the real world — written to a database, sent a notification, reserved inventory. If step 5 fails, what happens to the work that steps 1–4 already did?

Without a plan: the world is left in an inconsistent state. Some actions happened. Some did not. Nobody knows which.

**The saga pattern** is borrowed from distributed systems and answers this directly. The idea:

> Every step that changes the world must register a **compensating action** — the reverse operation that undoes it if something goes wrong later.

```
Agent workflow (7 steps):

Step 1: Reserve inventory for order         ← compensating action: release reservation
Step 2: Apply customer discount             ← compensating action: remove discount
Step 3: Create order record                 ← compensating action: delete order record
Step 4: Charge payment                      ← compensating action: issue refund
Step 5: Send confirmation email  ← FAILS

Saga unwinds in reverse order:
  Step 4 compensation: issue refund
  Step 3 compensation: delete order record
  Step 2 compensation: remove discount
  Step 1 compensation: release reservation

World is restored to a consistent state.
(Step 5 — email — has no compensation needed; email was never sent.)
```

**Why this matters for the memory connection from Lecture 4:**

The saga rolls back real-world actions. But your agent's episodic memory may have already recorded "Step 4: payment charged — SUCCESS." When the saga unwinds and the payment is refunded, the episodic store still says success.

This inconsistency is a real production gap. The harness must decide: does it also update episodic memory as part of the compensating transaction? Most frameworks do not handle this automatically — it is a design decision you must make explicitly.

---

### Circuit Breaker: Stop Hammering a Broken Service

Retry logic handles transient failures — call failed, wait, try again. But what if the downstream service is genuinely degraded and will fail for the next 10 minutes? Retrying every second for 10 minutes makes the problem worse — your agents flood a struggling service with requests.

The **circuit breaker** solves this:

```
┌─────────────────────────────────────────────────────┐
│                  CIRCUIT BREAKER                    │
│                                                     │
│  CLOSED ──── (normal) ──── calls pass through      │
│     │                                               │
│     │ failure threshold exceeded                    │
│     ↓                                               │
│  OPEN ──── (tripped) ──── fail fast, no calls      │
│     │                                               │
│     │ timeout expires, test one call                │
│     ↓                                               │
│  HALF-OPEN ──── test call succeeds → CLOSED        │
│              ──── test call fails → OPEN again     │
└─────────────────────────────────────────────────────┘
```

- **Closed:** normal operation. Calls pass through. Failures are counted.
- **Open:** too many failures in a window. Stop sending calls entirely — fail fast. Let the service recover.
- **Half-open:** after a timeout, let one test call through. If it succeeds, close the circuit. If it fails, stay open.

In a multi-agent system where 50 agents might simultaneously retry the same failing tool, a circuit breaker prevents a cascading failure where one degraded service takes down the entire system.

---

### Observability: If You Can't See It, You Can't Fix It

Every harness component should emit a structured log event when something interesting happens. Not `print("retry")` — a structured object with context:

```json
{
  "event": "harness.retry",
  "attempt": 2,
  "reason": "malformed_json_output",
  "agent_id": "support-agent-07",
  "session_id": "S-4421",
  "tool": "get_customer",
  "timestamp": "2026-07-10T14:23:05Z"
}
```

The harness is the **primary observability point** for an agent system. If your harness does not emit structured logs, you are flying blind in production. Silent failures — the harness catches an error, handles it, and moves on without recording it — are the hardest failures to debug because they leave no trace.

**Instrument everything:**
- Every retry (with attempt number and reason)
- Every fallback chain activation (with which level triggered)
- Every guardrail trigger (input, output, or action)
- Every validation failure (what was wrong, what was expected)
- Every tool timeout or exception (structured, not stack trace)

---

## Part 3 — Multi-Agent Harnesses

When you have multiple agents, the harness problem extends. The orchestrator — the agent that coordinates the others — becomes a harness over the entire agent network.

### The Orchestrator-as-Harness Pattern

```
┌──────────────────────────────────────────────────────┐
│              ORCHESTRATOR HARNESS                    │
│                                                      │
│  Validate task before delegating to subagent         │
│       ↓                                              │
│  Delegate to Subagent A                              │
│  Delegate to Subagent B  (parallel if independent)  │
│       ↓                                              │
│  Validate subagent outputs before using them         │
│       ↓                                              │
│  Retry failed delegations (within budget)           │
│       ↓                                              │
│  Enforce context budget per subagent                 │
│       ↓                                              │
│  Maintain saga log for transactional integrity      │
└──────────────────────────────────────────────────────┘
```

Key principle: **the orchestrator's harness responsibilities do not replace subagent harnesses.** Each subagent still needs its own harness. The orchestrator adds a layer on top.

**New failure modes that only appear in multi-agent harnesses:**

**Budget exhaustion across agents:** each subagent may retry up to 3 times. With 5 subagents, the orchestrator could be waiting for up to 15 retries. The orchestrator must set a total wall-clock timeout independent of individual retry budgets.

**Idempotency across delegation boundaries:** if the orchestrator re-delegates a task to a subagent (because it timed out), and the subagent actually completed the task on the first delegation but the response was lost in transit — the task executes twice. Subagent tasks that write to the world must be idempotent, or the orchestrator must track which delegations actually completed.

---

### AWS AgentCore Managed Harness

AWS AgentCore provides a managed harness via `CreateHarness` and `InvokeHarness` APIs. Instead of writing harness code yourself, you configure a harness object and invoke agents through it.

**What the managed harness gives you out of the box:**
- Automatic retry with configurable backoff
- Structured invocation with input/output schema enforcement
- Observability integration (CloudWatch logs, X-Ray tracing)
- Credential scoping per invocation

**What it leaves to you:**
- Fallback chain logic
- Saga/compensating transaction registration
- Custom guardrail hooks
- Circuit breaker for specific downstream tools

**The escape hatch:** if the managed abstraction's constraints are too restrictive, AgentCore provides an "export to Strands code" feature that generates the equivalent harness as editable Python — you can start managed and graduate to custom when needed.

**The honest tradeoff:**

| | Managed harness (AgentCore) | Custom harness |
|---|---|---|
| Time to production | Fast | Slow |
| Control | Limited | Full |
| Visibility into internals | Low | High |
| Failure mode surface | Hidden in managed layer | Explicit in your code |
| Escape hatch? | Yes (export to code) | N/A |

---

### LangGraph v1.1 Middleware

LangGraph implements the harness as a **middleware stack** — a chain of decorators that wrap the LLM call. Each middleware layer handles one concern.

```
User message
    ↓
[Content Moderation Middleware]   ← input guardrail
    ↓
[Token Budget Middleware]         ← input validation
    ↓
LLM Call
    ↓
[Model Retry Middleware]          ← retry with exponential backoff
    ↓
[Output Validation Middleware]    ← output parsing + type enforcement
    ↓
Response
```

**Model retry middleware** wraps the LLM call with configurable exponential backoff. It is decoupled from the graph logic — you can add or swap retry behaviour without touching the agent's planning code.

**Content moderation middleware** inserts a pluggable guardrail hook at the model call boundary. You provide the guardrail function; LangGraph calls it at the right moment.

**The key insight:** LangGraph's middleware model is the same harness architecture from Section 1, implemented as composable decorators. Understanding the harness from first principles means you understand what each LangGraph middleware layer is doing — and what it is not doing.

---

## Part 4 — The Six Harness Failure Modes

These are the failure modes that appear most frequently in production. For each one: what goes wrong, why it is hard to detect, and how to prevent it.

---

### Failure Mode 1 — The Infinite Retry Storm

**What happens:** a retry loop has no maximum. An error that cannot be resolved by retrying (e.g., the model cannot produce valid output for this particular input) triggers retries indefinitely. The agent runs forever or until an external timeout kills it.

**Why it is hard to detect:** the agent looks "busy" rather than "broken." If you are only monitoring for exceptions, this failure is invisible.

**Prevention:** every retry loop must have a hard `MAX_RETRIES` ceiling. No exceptions.

---

### Failure Mode 2 — Silent Type Coercion

**What happens:** the harness detects malformed output, tries to "fix" it automatically (e.g., strips trailing commas from JSON, fills in missing fields with defaults), and passes the coerced output downstream. The downstream system receives data that looks valid but is semantically wrong.

**Example:**
```
LLM returns: {"product_id": "laptop", "quantity": null}
Harness "fixes": {"product_id": "laptop", "quantity": 0}
Downstream: processes an order for 0 units — silent wrong behaviour
```

**Why it is hard to detect:** no exception is raised. The system runs normally with wrong data.

**Prevention:** reject malformed output and retry. Never silently fill in values the model failed to provide. The model should be told about the failure so it can try again with correct values.

---

### Failure Mode 3 — Guardrail Bypass via Output Indirection

**What happens:** the model produces output that passes the output guardrail but encodes harmful intent indirectly — through a tool call that the guardrail does not inspect, or through a structured data field that the downstream system interprets differently than the guardrail does.

**Example:**
```
Output guardrail checks: "does the response contain harmful instructions?"
Model responds: "Please execute this standard configuration script."
The script (passed as a tool argument) contains the harmful instructions.
Guardrail passes — it only checked the text, not the tool arguments.
```

**Why it is hard to detect:** the harmful content is not in the text the guardrail inspects.

**Prevention:** guardrails must inspect tool call arguments (the action guardrail), not just the text response (the output guardrail). Multi-layer guardrails are not redundant — they catch different things.

---

### Failure Mode 4 — Exception Swallowing

**What happens:** the tool execution wrapper catches exceptions but does not structure them into a useful error object. The LLM receives no feedback about what went wrong.

**Example:**
```python
try:
    result = get_customer(customer_id)
except Exception:
    return None   # ← swallowed — LLM sees None, has no idea what failed
```

The LLM cannot reason about `None`. It either hallucinates a customer record or produces a nonsensical response.

**Prevention:** always return a structured error object with `error`, `tool`, and `recoverable` fields. Give the model enough context to decide what to do next.

---

### Failure Mode 5 — Context Budget Exhaustion Under Retry

**What happens:** each retry appends error context and retry instructions to the message history. After several retries, the context window is full. The retry itself caused the failure.

```
Attempt 1: context = 20,000 tokens
Attempt 2: context = 28,000 tokens (+ error context)
Attempt 3: context = 36,000 tokens (+ error context)
Attempt 4: context window exceeded — agent crashes
```

**Why it is hard to detect:** the failure looks like a context window error, not a retry design error.

**Prevention:** estimate token budget before each retry and include the retry overhead in the estimate. If retrying would push the context over the limit, trigger the fallback chain instead.

---

### Failure Mode 6 — Idempotency Violation Under Retry

**What happens:** the harness retries a non-idempotent tool call after a network timeout. The tool actually completed on the first call but the response was lost. The retry executes the tool a second time.

**Example:**
```
Agent calls send_email("alice@...")   ← email is sent
Network timeout — agent never receives confirmation
Harness retries send_email("alice@...") ← email is sent again
Alice receives two identical emails
```

**Why it is hard to detect:** from the agent's perspective, the first call "failed" (no response received). The retry looks correct.

**Prevention:** classify all tools before writing retry logic. Non-idempotent tools must not be retried by the harness. Handle them through saga compensating actions or idempotency keys (a unique transaction ID that the tool uses to detect and deduplicate repeated calls).

---

## The Harness Design Checklist

Use this when reviewing or designing any agent harness:

```
INPUT
  □ Schema validation before the LLM call fires?
  □ Length / token budget check before the LLM call fires?
  □ Injection scanning for adversarial inputs?

OUTPUT
  □ JSON / structured output parsing with rejection on failure?
  □ Type enforcement on all fields passed downstream?
  □ Constrained decoding for high-volume simple-structure outputs?

RETRY
  □ Retryable vs. non-retryable errors classified?
  □ Exponential backoff with jitter?
  □ Hard MAX_RETRIES ceiling?
  □ Token budget check before each retry?
  □ Idempotency verified before retrying side-effecting tools?

FALLBACK
  □ Explicit fallback chain defined (not implicit)?
  □ Final fallback is a safe graceful degradation (not a crash)?
  □ High-stakes actions escalate to human review?

GUARDRAILS
  □ Input guardrail (injection, off-topic, PII in input)?
  □ Output guardrail (harmful content, policy violations)?
  □ Action guardrail (dangerous tool arguments before execution)?

TOOLS
  □ Every tool call wrapped in a safety wrapper?
  □ Timeout enforced on every tool call?
  □ Exceptions caught and structured (never swallowed)?

SAGA
  □ Each side-effecting step has a compensating action registered?
  □ Unwind order is reverse of execution order?
  □ Memory state updated as part of saga unwind?

OBSERVABILITY
  □ Every retry logged with attempt number and reason?
  □ Every fallback activation logged?
  □ Every guardrail trigger logged?
  □ Every validation failure logged?
  □ No silent error swallowing anywhere in the harness?
```

---

## Key Concepts Glossary

**Agent harness** — the scaffolding layer surrounding an LLM that enforces input validation, output parsing, retry logic, fallback behaviour, and guardrail checks; converts probabilistic model output into dependable software behaviour.

**Input validation** — checking schema, length, token budget, and injection patterns before the LLM call fires.

**Output parsing and type enforcement** — converting the LLM's raw text output into the typed structure the downstream system expects; rejection and retry on failure.

**Post-hoc validation** — parsing and rejecting invalid output after generation; the LLM gets a retry with error feedback.

**Constrained decoding** — restricting the LLM's token sampling at generation time so invalid output is structurally impossible; trades some reasoning flexibility for guaranteed format compliance.

**Exponential backoff with jitter** — retry wait times grow exponentially per attempt; jitter randomises the delay to prevent synchronised retry storms in multi-agent systems.

**Retry budget** — the hard maximum number of retry attempts; prevents infinite loops.

**Fallback chain** — an ordered list of alternative strategies the harness tries in sequence when retries are exhausted; must be explicit code, not implicit hope.

**Guardrail integration point** — a specific hook in the harness where content moderation, PII detection, or policy enforcement runs; three locations: pre-LLM (input), post-LLM (output), pre-tool (action).

**Tool execution safety wrapper** — catches tool exceptions and returns structured error objects the LLM can reason about; enforces timeouts on every tool call.

**Idempotency** — a tool operation that produces the same result whether called once or ten times; prerequisite for safe harness-level retry of side-effecting tools.

**Saga pattern** — each step in a multi-step workflow registers a compensating action; if a later step fails, the harness unwinds completed steps in reverse order to restore a consistent world state.

**Compensating transaction** — the reverse operation that undoes a completed step when the saga unwinds; e.g., "issue refund" compensates "charge payment."

**Circuit breaker** — a higher-order retry primitive with three states (Closed / Open / Half-Open); prevents agents from flooding a degraded downstream service with retries.

**PALADIN model** — a two-level self-correction architecture: Level 1 (automatic re-prompt with structured error context), Level 2 (escalate to human review when automatic correction fails).

**Orchestrator-as-harness** — in multi-agent systems, the orchestrating agent functions as a harness over the subagent network, enforcing validation, retry budgets, and transactional integrity across delegation boundaries.

**Exception swallowing** — catching a tool exception without returning a structured error to the LLM; one of the six canonical harness failure modes.

**Observability hook** — a structured log event emitted by the harness when something notable happens (retry, fallback, guardrail trigger, validation failure); the primary mechanism for detecting silent production failures.

---

## Discussion Questions

1. Of the six harness failure modes, which single missing component would cause the most severe and hardest-to-debug production failure? Make the case for your answer — consider both the severity of the failure and how long it would take to find the root cause.

2. An agent completes a 5-step workflow. The saga log records all 5 steps as succeeded. Then a database constraint violation causes step 3's write to be rolled back silently — but the harness never knew. The episodic memory store still shows step 3 as successful. How do you design a harness that catches this? Is this fully solvable today, or is it an open production gap?

3. LangGraph v1.1 middleware and AWS AgentCore both reduce harness boilerplate. Looking at the six failure modes: which ones are still entirely the developer's responsibility in each of these frameworks? What does that tell you about the limits of managed harness abstractions?

4. An agent has "minimum necessary autonomy" — it can read data and draft outputs, but all writes require human approval. Which harness components are non-negotiable for this agent? Which ones could you safely omit? Now compare: a fully autonomous research agent that can read, write, and send communications. What changes in the harness specification?

---

## Key Takeaways

- **The harness is the reliability contract of an agentic system.** It does not make the model smarter — it makes the system robust to the model's inherent unreliability. A missing harness component does not fail at design time; it fails silently in production.

- **Every component addresses a specific failure class.** Input validation catches garbage in. Output parsing prevents type mismatches downstream. Retry logic with jitter handles transient failures safely. Fallback chains prevent crashes. Guardrails enforce policy. Tool wrappers turn exceptions into recoverable errors.

- **Idempotency is a prerequisite for safe retry.** Every tool must be classified as idempotent or not before retry logic is written. Non-idempotent tools must not be automatically retried.

- **The saga pattern is the production answer to multi-step workflow failure.** Every step that changes the world must register a compensating action. When something fails, the harness unwinds completed steps in reverse order. The consistency between saga state and memory state is an open engineering problem most frameworks do not yet solve.

- **Observability is not optional.** The harness is the primary instrumentation point for the entire agent system. Without structured logs at every component, silent failures are invisible until a customer complaint surfaces them.

---

## Pre-Reading Reference Map

| Reading | What to focus on |
|---|---|
| Anthropic, "Building Effective Agents" (Dec 2024) | Agent design principles; tool execution patterns; minimum necessary autonomy |
| Chip Huyen, "Agents" (Jan 2025) — tool categories section | Write action governance; the idempotency concern in tool design |
| "Externalization in LLM Agents" (arXiv:2604.08224) — harness section | Cross-framework harness component taxonomy; the closest thing to a reference architecture currently available |

---

## Bridge to Lecture 6

Lecture 6 moves to **Tools and Function Calling** — where the harness's tool execution safety wrapper becomes the central design concern. We examine tool schema design, the Model Context Protocol (MCP) and its structural security considerations, and the empirical principle that tool description quality is the single largest driver of agentic tool-use reliability.
