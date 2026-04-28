# Durable Workflows

<p align="center">
  <a href="https://dariocositore.com">
    <img src="https://img.shields.io/badge/Made%20by-Dario%20Cositore-blue?style=flat-square" alt="Made by Dario Cositore" />
  </a>
  <a href="https://github.com/dario-cositore/durable-workflows/stargazers">
    <img src="https://img.shields.io/github/stars/dario-cositore/durable-workflows?style=flat-square" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/dario-cositore/durable-workflows/issues">
    <img src="https://img.shields.io/github/issues/dario-cositore/durable-workflows?style=flat-square" alt="GitHub Issues" />
  </a>
</p>

A **Mistral-style Durable Execution Engine** for OpenClaw Agents. Bridge the gap between simple scripts and production-grade, fault-tolerant AI automation.

> **Official Site:** [dariocositore.com](https://dariocositore.com) | **Discord:** [OpenClaw](https://discord.com/invite/clawd)

---

## Quick Navigation

- [Why Durable Workflows?](#why-durable-workflows)
- [The "Agent" Installation Prompt](#the-agent-installation-prompt)
- [Installation Guide](#installation-guide)
- [Core Concepts](#core-concepts)
- [Advanced Patterns](#advanced-patterns)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)

---

## Why Durable Workflows?

When building complex AI automations, a single crash can lose hours of progress. **Durable Workflows** solves this by implementing an **Event-Sourced Architecture** (inspired by Temporal.io and Mistral Workflows).

Instead of running a script and hoping it finishes, you define a **Workflow**. If the server reboots, the system replays the history and resumes exactly where it left off.

### The Problem
| Failure Point | Consequence |
|--------------|-------------|
| Process Crash | All state lost. You restart from zero. |
| API Timeout | You don't know if the last step completed. |
| Manual Restart | You might double-spend credits on LLM calls. |

### The Solution
| Architecture | Benefit |
|--------------|---------|
| **Event History** | Every step is saved to `runs/{id}.json`. |
| **Deterministic Replay** | The engine skips completed steps on restart. |
| **Activity Isolation** | Side effects (API calls) are wrapped so they can be retried or skipped. |

---

## The "Agent" Installation Prompt

*Copy and paste the following block into your AI Agent (Elitza, Claude, ChatGPT) to have them auto-configure your environment.*

```text
I want to install the Durable Workflows addon for OpenClaw.
Source: https://github.com/dario-cositore/durable-workflows

Goal:
  Implement durable, Mistral-style workflow execution so agents can survive crashes and manage long-running tasks.

Issue:
  Normal scripts die if the process restarts. We lose state, context, and wasted time on retries.

Fix:
  1. Clone the repo into ~/.openclaw/agents/main/skills/durable-workflows
  2. Run npm install inside the folder.
  3. Use the Orchestrator to wrap logic in @Workflow and @Activity decorators.
  4. State is automatically saved to ./runs/ and replayed on failure.

Documentation:
  https://github.com/dario-cositore/durable-workflows/blob/main/README.md
```

---

## Installation Guide

### 1. Clone the Repository
Navigate to your OpenClaw skills directory and clone the addon:

```bash
# Navigate to your OpenClaw skills folder
cd ~/.openclaw/agents/main/skills/

# Clone the repository
git clone https://github.com/dario-cositore/durable-workflows.git
```

### 2. Install Dependencies
```bash
cd durable-workflows
npm install
```

### 3. Verify Structure
Ensure the directory structure matches the following:
```
~/.openclaw/agents/main/skills/
└── durable-workflows/
    ├── lib/
    │   ├── orchestrator.mjs
    │   └── decorators.mjs
    ├── runs/          # State is saved here
    └── README.md
```

---

## Core Concepts

### 1. The `Orchestrator` Class
The brain of the operation. It manages the lifecycle, persists state, and handles signals.

```javascript
import { Orchestrator } from './lib/orchestrator.mjs';
const orch = new Orchestrator('./runs');
```

### 2. The `@Workflow` Decorator
Marks a class as a stateful orchestration unit. It links the instance to the persistence engine.

```javascript
import { Workflow } from './lib/decorators.mjs';

@Workflow('MyAutomation')
class MyWorkflow {
    async execute(input) {
        // Pure logic here
    }
}
```

### 3. The `@Activity` Decorator
Wraps a method that performs side effects (writing files, calling APIs, browser actions).
- **Before Execution:** Checks if this exact action was already completed.
- **After Execution:** Saves the result to the event history.

```javascript
@Activity
async fetchData(url) {
    return fetch(url).then(r => r.json());
}
```

---

## Advanced Patterns

### Human-in-the-Loop (Signals)
Pause a workflow and wait for external input (e.g., human approval via Telegram).

**Workflow Logic:**
```javascript
async execute(input) {
    const invoice = await this.downloadInvoice(input.url);
    
    if (invoice.amount > 1000) {
        const state = await this.engine.query(this.runId);
        if (!state.pendingSignals?.find(s => s.signalName === 'APPROVE')) {
            // Pause execution. The Orchestrator saves state before throwing.
            throw new Error('WORKFLOW_PAUSED: Waiting for approval');
        }
    }
    await this.processInvoice(invoice);
}
```

**External Trigger (Telegram/Webhook):**
```javascript
// When user approves:
orchestrator.signal(runId, 'APPROVE', { by: 'user' });

// Re-run the workflow script, and it will continue from where it paused.
```

### Queries (Read-Only State)
Check the current state of a running workflow without modifying it.

```javascript
const state = await orch.query('wf_abc123');
console.log(`Current step: ${state.history.length}`);
```

---

## API Reference

### `Orchestrator`

| Method | Description |
|--------|-------------|
| `run(WorkflowClass, input)` | Starts or resumes a workflow. Returns `{ status, runId, result }`. |
| `signal(runId, name, data)` | Injects an external event into a paused workflow. |
| `query(runId)` | Returns the current state and history of a run. |

### `Workflow` & `Activity`

| Decorator | Usage |
|-----------|-------|
| `@Workflow(name)` | Class decorator. Defines the orchestration logic. |
| `@Activity` | Method decorator. Wraps side effects for replay and history. |

---

## Roadmap

We are building this to be the **"Temporal for AI Agents"** but lightweight and OpenClaw-native.

| Version | Feature | Status |
|---------|---------|--------|
| **v1.0** | Core Orchestration & Event History | Complete |
| **v1.1** | Signal / Query APIs | Complete |
| **v1.5** | Dashboard UI (View running workflows) | In Progress |
| **v2.0** | Distributed Workers (Run activities across multiple machines) | Planned |
| **v2.5** | Cron / Scheduling Integration | Planned |

**Goal:** Make it so you can deploy an agent on a laptop, turn the laptop off, turn it on 3 days later, and the agent continues exactly where it left off.

---

## Resources

- **Documentation:** [dariocositore.com](https://dariocositore.com) (See the Agentic AI Architecture)
- **Source Code:** [GitHub Repository](https://github.com/dario-cositore/durable-workflows)
- **Examples:** Check the `example/` folder in this repo.

---

*Built for the Elitza ecosystem. Reliable AI starts here.*