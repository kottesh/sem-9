# Lecture 1: LLMs vs Agents vs Multi-Agent Systems
### AI Systems Engineering for Agentic Workflows — M1: Foundations

---

## Core Thesis

> **Adding agentic complexity is not a capability upgrade — it is an architectural tradeoff with measurable costs and specific enabling conditions.**

The architecture spectrum (LLM → Agent → Multi-Agent) is not a smooth continuum. Each step carries a qualitatively different cost structure, failure taxonomy, and operational burden. The goal of this lecture is to navigate that spectrum deliberately.

---

## Part 1 — What an LLM Actually Is

### Precise Definition
An LLM is a **stateless function**: tokens in → probability distribution over next tokens out. Nothing more.

- No goals
- No memory across API calls
- No capacity to act on the world

### The Illusion of Agency
System prompts, conversation history, and tool-calling APIs are **scaffolding around the model** — not the model itself. The model still runs a single forward pass.

### The Four Things an LLM Cannot Do Without External Scaffolding

| Capability | Requires |
|---|---|
| Remember prior conversations | External memory store |
| Execute code or call APIs | Tool execution layer |
| Break tasks into subtasks and track progress | Planning + state management |
| Revise output based on real-world feedback | Observation loop |

### Key Mental Model — The LLM as a Pure Function Box

```
┌─────────────────────────────┐
│           LLM               │
│  (parameters + forward pass)│
│                             │
│  INPUT: token sequence      │
│  OUTPUT: probability dist.  │
└─────────────────────────────┘

Everything outside the box:
  - State / Memory
  - Tool execution
  - Goal tracking
  - Conversation history
```

> **Token budget = working memory. It is consumed, not persistent. Every call starts fresh unless the caller manages state.**

---

## Part 2 — What Makes Something an Agent

### Minimal Agent Definition
An agent = **LLM + all four of the following**:

1. **Persistent state** — memory that survives across turns
2. **Tool execution loop** — ability to act on the world
3. **Goal specification** — objective that persists across turns
4. **Perception-Action-Observation cycle** — iterative reasoning

All four are necessary. None alone is sufficient.

### Anthropic's Categorical Distinction: Workflow vs. Agent

| | **Workflow** | **Agent** |
|---|---|---|
| Control flow determined by | Predefined code path | Model's own reasoning at runtime |
| LLM role | Fills slots at fixed decision points | Decides next step dynamically |
| Predictability | High | Low |
| Engineering complexity | Lower | Higher |

> This is **not a spectrum** — it is a categorical difference with engineering consequences.

### The Agent Loop

```
┌──────────────────────────────────────────────────┐
│                   AGENT LOOP                     │
│                                                  │
│  PERCEIVE context                                │
│      ↓                                           │
│  REASON about next action                        │
│      ↓                                           │
│  EXECUTE tool call                               │
│      ↓                                           │
│  OBSERVE result                                  │
│      ↓                                           │
│  UPDATE state  ──────────────► stopping          │
│      ↑                         condition met?    │
│      └─────── repeat ──────────────┘             │
└──────────────────────────────────────────────────┘
```

### Token Budget Accounting

Each loop turn re-sends: prior context + tool call history + tool outputs.

> **Rule of thumb: 3–10x token consumption vs. a single equivalent call for a 10-step task.**

Back-of-envelope estimate for any pipeline:
- `Total tokens ≈ (per-turn context size) × (number of turns) × (re-sent history factor)`

### The Three Core Agent Failure Modes

| Failure Mode | What Happens | Root Cause |
|---|---|---|
| **Stuck Loop** | Agent repeats the same action indefinitely without progress | Underspecified or unreachable stopping condition |
| **Hallucinated Tool Call** | Syntactically valid but semantically wrong tool invocation | Ambiguous tool schema; wrong parameters or tool name |
| **Cascading Error** | Incorrect intermediate output propagates undetected through all subsequent steps | No mechanism to detect or attribute the original error |

> These failure modes are **harder to detect and recover from** than failures in a simple LLM call because they compound silently across steps.

---

## Part 3 — When Multi-Agent Is the Right Answer

### Anthropic's Governing Principle
> *"Add agentic systems only when simpler solutions fall short."*

The **burden of proof is on complexity**. This is not conservatism — it is sound systems engineering.

### The Three Genuine Justifications for Multi-Agent Architecture

| Justification | Definition | Signal to look for |
|---|---|---|
| **Context Pollution** | Single agent's context window accumulates so much state that retrieval quality degrades and effective reasoning span contracts | Task requires more information than a single context window can hold without quality loss |
| **Parallelizable Work** | Subtasks are independent and time-to-completion is a binding constraint | Multiple independent workstreams that can run simultaneously |
| **Specialization** | Different subtasks require fundamentally different tool sets, personas, or fine-tuned models that cannot coexist without mutual interference | Clear domain separation between task components |

> If none of these three conditions apply → a single agent (or single LLM call) is the right answer.

### The Multi-Agent Cost Multiplier

```
Multi-agent cost ≠ sum of individual agent costs

Multi-agent cost = (sum of individual costs)
                + coordination overhead
                + inter-agent context passing
                + role negotiation latency
```

Teams consistently **underestimate** this until production load testing.

### Human-in-the-Loop Placement

HITL placement is an **architectural decision**, not an operational afterthought.

Ask: *"Is this action high-stakes or irreversible?"*
- Yes → checkpoint before execution
- No → autonomous execution acceptable

Irreversibility is the key test:
- Writing to a production database → checkpoint
- Generating a draft document → no checkpoint required

---

## Decision Framework: What Architecture Does This Problem Need?

```
                  ┌─────────────────────────────────┐
                  │ Can a single prompt solve this   │
                  │ reliably?                        │
                  └──────────────┬──────────────────┘
                                 │
                    YES ─────────┘─────────── NO
                     │                         │
              Single LLM call          Does it require
                                       multi-turn state,
                                       tools, or planning?
                                                │
                                   YES ─────────┴────── NO
                                    │               (back to
                              Single Agent         single call)
                                    │
                            Does it require
                            context pollution relief,
                            parallelism, or specialization?
                                    │
                          YES ──────┴──────── NO
                           │                  │
                    Multi-Agent          Single Agent
                    System               (don't escalate)
```

---

## Key Concepts Glossary

**LLM** — Stateless function; maps input tokens to a probability distribution over output tokens. No persistent memory, no capacity to act.

**Agent** — LLM + persistent state + tool execution loop + goal specification that survives across turns.

**Workflow** — LLM-based system where control flow is determined by predefined code. LLM fills in content at fixed points. Control = code.

**Agent (Anthropic definition)** — LLM-based system where the model dynamically determines the next step at runtime. Control = model reasoning.

**Tool execution loop** — The perceive → reason → act → observe cycle that repeats until a stopping condition is met.

**Token budget accounting** — Estimating total token consumption across all loop turns, including re-sent context and tool history. Typically 3–10x a single call.

**Stuck loop** — Agent repeats an action indefinitely. Caused by underspecified stopping condition.

**Hallucinated tool call** — Syntactically valid, semantically wrong tool invocation. Caused by ambiguous tool schema.

**Cascading error** — Incorrect intermediate output propagates undetected through subsequent steps.

**Context pollution** — Context window overloads with prior-step state, degrading retrieval quality and effective reasoning span. One of three justifications for multi-agent decomposition.

---

## Discussion Questions

1. A team proposes five specialized agents (billing, technical, returns, escalation, routing) instead of a single fine-tuned model. What questions do you ask before approving, and what evidence changes your recommendation?

2. A colleague says "agents should be the default for any multi-step task." How do you respond using today's cost-of-autonomy framework?

3. An agent enters a stuck loop in production — same tool call, same parameters, no progress. What are the three most likely root causes, and how do you redesign to detect and recover from each?

4. You are designing an agent that writes and executes SQL against a production database. Where does a human checkpoint belong, and what irreversibility property motivates each placement?

---

## Key Takeaways

- **An LLM is a stateless inference function.** State, tools, memory, goals — these are scaffolding you build and pay for. They are not capabilities the model provides by default.

- **Workflow vs. Agent is categorical, not a spectrum.** The question: is control flow determined by code or by the model's own reasoning at runtime?

- **Agentic complexity has a measurable price.** 3–10x token overhead, three new failure modes, coordination overhead. Requires specific justification from one of three enabling conditions: context pollution, parallelizable work, or specialization.

---

## Pre-Reading Reference Map

| Reading | Covers in this lecture |
|---|---|
| Anthropic, "Building Effective Agents" (Dec 2024) | Workflow vs. Agent taxonomy, "start simple" principle, multi-agent enabling conditions |
| Chip Huyen, "Agents" (Jan 2025) — §1–3 | Failure modes, loop architecture, production economics |
| Lilian Weng, "LLM Powered Autonomous Agents" (2023) | Planning + Memory + Tool Use framework (preview of Lecture 2) |

---

## Bridge to Lecture 2

Lecture 2 deepens the agent mental model by examining its three canonical components — **planning, memory, and tool use** — through Lilian Weng's framework and Anthropic's concept of the Augmented LLM. These are the building blocks for reasoning about any agent architecture in the remaining modules.
