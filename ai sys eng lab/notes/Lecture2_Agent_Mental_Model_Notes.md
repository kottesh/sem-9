# Lecture 2: The Agent Mental Model — Planning, Memory, Tool Use, and the Augmented LLM
### AI Systems Engineering for Agentic Workflows — M1: Foundations

---

## Core Thesis

> **An agent is not a smarter LLM — it is a system: a reasoning core augmented with planning, memory, and tools, executing in a perception-reasoning-action loop where each step is a full model call.**

The gap between a stateless next-token predictor and a goal-pursuing agent is not an implementation detail — it is an architectural requirement. This lecture builds the internal mental model of a single agent that all subsequent modules depend on.

---

## The Canonical Framework — Lilian Weng (2023)

An agent = **LLM + three functional subsystems**:

| Component | Problem it solves |
|---|---|
| **Planning** | How does the agent decide what to do next? |
| **Memory** | How does it remember what has already happened? |
| **Tool Use** | How does it affect the world beyond generating text? |

All three are necessary. A system missing any one is either an LLM call (no planning, no memory, no tools), a chatbot (no tools, no planning), or a script (no LLM reasoning).

---

## Part 1 — The Augmented LLM: Anthropic's Foundational Building Block

### Definition
The **Augmented LLM** is a base language model enhanced — at the scaffolding and API layer — with:
- **Retrieval** — access to external knowledge beyond training data
- **Tools** — ability to act on the world
- **Memory** — persistence across steps

> Augmentation happens in scaffolding code, not inside model weights. Same model, radically different capability surface.

### The Perception-Reasoning-Action Loop

This is the runtime expression of the Augmented LLM:

```
┌────────────────────────────────────────────────────────┐
│              PERCEPTION-REASONING-ACTION LOOP          │
│                                                        │
│  1. PERCEIVE  — inputs + context enter the window      │
│       ↓                                                │
│  2. REASON    — LLM call; select next action           │
│       ↓                                                │
│  3. ACT       — invoke a tool or generate a response   │
│       ↓                                                │
│  4. OBSERVE   — read the tool result                   │
│       ↓                                                │
│  5. UPDATE    — feed observation back as new context   │
│       ↑                    ↓                           │
│       └────── repeat until goal satisfied ─────────────┘
└────────────────────────────────────────────────────────┘
```

**Critical implication**: each loop iteration is a **full LLM call**. Latency and token cost compound with every step — this is the mechanical source of the 3–10x token overhead introduced in Lecture 1.

### Russell & Norvig Grounding
> An agent perceives its environment through **sensors** and acts upon it through **actuators**. The LLM is the reasoning core between perception and action.

---

## Part 2 — Memory Types and Storage Substrates

### The Four Memory Types

| Memory Type | What it stores | Storage substrate | Access latency | Cost to update |
|---|---|---|---|---|
| **Sensory** | Raw inputs entering the context (images, text, audio) | Context window buffer | Immediate | None (ephemeral) |
| **Short-term / Working** | Everything the agent currently "sees" — the active context window | Context window | Fast | None (volatile) |
| **Long-term — Semantic** | External knowledge library; facts, documents, product data | Vector DB / document store | Medium (retrieval) | Low–Medium |
| **Long-term — Procedural** | Stable behaviors encoded through fine-tuning | Model weights | Zero (no retrieval needed) | Very high |

### CoALA Four-Way Storage Decomposition

From *Cognitive Architectures for Language Agents* (Sumers et al., 2024):

| Storage Type | Engineering equivalent | When to use |
|---|---|---|
| **In-context** | Context window | Session-local state; short tasks |
| **External** | Vector DB, document store | Large knowledge corpora; cross-session knowledge |
| **In-weights** | Fine-tuned model | Stable, universal behaviors that rarely change |
| **In-cache** | KV cache | Repeated static context (e.g. fixed system prompt) |

> **Selection heuristic**: use in-context for session-local state → use retrieval for large knowledge corpora → use in-weights for stable universal behaviors. Cost rises dramatically in that order.

### Memory Failure Modes

| Failure | Cause | Which memory type |
|---|---|---|
| Context window overflow | Working memory grows unbounded; no compression strategy | Short-term |
| Retrieval hallucination | Semantic memory returns loosely related chunks | Long-term semantic |
| Procedural staleness | Fine-tuned behavior diverges from current task distribution | Long-term procedural |

### The Toolformer Insight
Models can learn to **invoke retrieval as a tool call** — memory access does not need to be hard-coded into scaffolding. The model learns when it needs to look something up.

---

## Part 3 — Tool Use: Categories, Documentation, and ReAct

### Chip Huyen's Three-Category Tool Taxonomy

| Category | What it does | Examples | Retry-safe? |
|---|---|---|---|
| **Knowledge Augmentation** | Extends what the agent can *know* beyond training data and context | Web search, RAG retrieval, DB queries | Yes |
| **Capability Extension** | Extends what the agent can *compute* beyond language generation | Calculator, code interpreter, data transform APIs | Yes |
| **Write Actions** | Produces real-world side effects | Email send, DB write, file create, deployment trigger | **No** |

> **The asymmetry of Write Actions**: Knowledge and Capability tools are generally safe to retry. Write Actions may have irreversible consequences if called incorrectly or repeatedly. This is why HITL placement decisions from Lecture 1 concentrate almost entirely on Write Actions.

### Tool Documentation as a Load-Bearing Component

> **The model selects tools based on their descriptions. A vague or incomplete description causes misselection — regardless of how well every other part of the agent is designed.**

Anthropic's engineering guidance: treat tool descriptions with the **same rigor as API documentation**.

What a well-written tool description must include:
- What the tool does (precisely, not vaguely)
- What parameters it expects and their valid ranges
- What it returns and in what format
- When to use it vs. a similar tool
- Any known limitations or failure conditions

### ReAct: The Canonical Tool Use Pattern
**ReAct** (Yao et al., ICLR 2023) — *Reason + Act* — is the perception-reasoning-action loop made concrete:

```
Thought:   I need to find the current price of product X.
Action:    search_product_catalog(query="product X price")
Observation: {"name": "Product X", "price": 49.99, "stock": "in stock"}

Thought:   I have the price. Now I need to check if the customer has a discount.
Action:    get_customer_discount(customer_id="C-1042")
Observation: {"discount_pct": 10}

Thought:   Final price = 49.99 × 0.90 = 44.99. I can now respond.
Action:    respond("Your price for Product X is $44.99.")
```

**What changes if the tool description is vague?** The model may call `search_product_catalog` with a malformed query, or skip it entirely and hallucinate the price. The loop logic is irrelevant — documentation quality is the controlling variable.

---

## The Unified Mental Model

```
┌──────────────────────────────────────────────────────────────┐
│                        AGENT SYSTEM                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  PLANNING                           │    │
│  │  Subgoal decomposition, self-critique, ReAct loop   │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────┐    │
│  │              LLM (Reasoning Core)                   │    │
│  │   ← perception (context window + observations)      │    │
│  │   → action (tool call or response generation)       │    │
│  └───────┬───────────────────────────────┬─────────────┘    │
│           │                               │                  │
│  ┌────────▼────────┐           ┌──────────▼───────────┐     │
│  │     MEMORY      │           │      TOOL USE         │     │
│  │  In-context     │           │  Knowledge Aug.       │     │
│  │  External (VDB) │           │  Capability Ext.      │     │
│  │  In-weights     │           │  Write Actions        │     │
│  │  In-cache       │           │  (HITL for writes)    │     │
│  └─────────────────┘           └──────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Concepts Glossary

**Augmented LLM** — Anthropic's term for the foundational building block of agentic systems: a base model enhanced with retrieval, tools, and memory at the scaffolding layer, not inside model weights.

**Perception-Reasoning-Action Loop** — The runtime cycle: perceive inputs + context → reason (LLM call) → act (tool invocation) → observe result → feed back as new context. Repeats until goal is met.

**Working Memory / In-Context Storage** — The active contents of the model's context window; bounded by context length, discarded at session end.

**Sensory Memory** — The immediate, ultra-short-lived buffer of raw inputs entering the context before processing.

**Semantic Memory / External Storage** — Long-term factual knowledge in a vector DB or document store; retrieved on demand via similarity search.

**Procedural Memory / In-Weights Storage** — Stable behaviors encoded in model weights via fine-tuning; zero retrieval latency, very expensive to update.

**Knowledge Augmentation Tool** — Extends what an agent can know: search, retrieval, DB queries.

**Capability Extension Tool** — Extends what an agent can compute: calculators, code interpreters, transformation APIs.

**Write Action** — Tool with real-world side effects (email, DB write, deployment); irreversible; requires heightened governance.

**ReAct** — Thought → Action → Observation prompting pattern (Yao et al., ICLR 2023) that interleaves explicit reasoning with grounded tool calls, reducing hallucination by anchoring reasoning in real-world feedback.

---

## Discussion Questions

1. An agent with a 128k-token context window keeps appending observations without compression. By step 40 of a 200-step task it is at 80% context utilization. What are three things that can go wrong, and which component of the Planning / Memory / Tool Use triad is responsible for each?

2. A production agent intermittently fails on a CRM retrieval tool that works correctly in isolation. The team suspects the tool description. Using what you learned today, what are three specific things you would check in the tool schema and description to diagnose the problem?

3. At what point does adding a memory system introduce more risk than value? What failure modes does memory introduce that a stateless LLM call does not?

4. For a customer support agent handling 10,000 sessions per day, mapping 1M tokens of product documentation, and remembering customer preferences across sessions — which CoALA storage type is appropriate for each concern, and what is the cost/latency tradeoff of each choice?

---

## Key Takeaways

- **An agent is a system, not a model.** Planning, memory, and tool use are three separable but interdependent subsystems built around a reasoning core (LLM).

- **Memory is a spectrum, not a single thing.** From the volatile context window to expensive-to-update model weights, each type has a different cost, latency, and appropriate use case. Choosing wrong is one of the most common architectural mistakes in production agent systems.

- **Tool documentation is a load-bearing component.** An agent can only be as reliable as the descriptions it uses to select and invoke tools. Schema quality is an engineering discipline, not a documentation afterthought.

---

## Pre-Reading Reference Map

| Reading | Covers in this lecture |
|---|---|
| Lilian Weng, "LLM Powered Autonomous Agents" (2023) | Planning + Memory + Tool Use framework; memory types table |
| Anthropic, "Building Effective Agents" (Dec 2024) — Augmented LLM section | Augmented LLM definition; production building block framing |
| Yao et al., "ReAct" (arXiv:2210.03629, ICLR 2023) | Thought/Action/Observation loop; canonical tool use pattern |

---

## Bridge to Lecture 3

Lecture 3 zooms entirely into the **Planning** component introduced today — treating planning as a search problem and examining four specific algorithms: ReAct's Thought-Action-Observation loop, Reflexion's episodic memory-driven self-critique, Tree of Thoughts' BFS/DFS over reasoning steps, and LATS's Monte Carlo Tree Search over language actions.
