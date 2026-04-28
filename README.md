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
- [Use Cases](#use-cases)
- [The "Agent" Installation Prompt](#the-agent-installation-prompt)
- [Installation Guide](#installation-guide)
- [Core Concepts](#core-concepts)
- [Safety & Guardrails](#safety--guardrails)
- [Advanced Patterns](#advanced-patterns)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)

---

## Why Durable Workflows?

When building complex AI automations, a single crash can lose hours of progress. **Durable Workflows** solves this by implementing an **Event-Sourced Architecture** (inspired by Temporal.io and Mistral Workflows).

Instead of running a script and hoping it finishes, you extend the **Workflow** base class. If the server reboots, the system replays the history and resumes exactly where it left off without executing the successful parts again.

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
| **Activity Isolation** | Side effects (API calls) are wrapped in `this.step` so they can be retried or skipped. |

---

## Use Cases

Where Durable Workflows shines compared to standard scripts.

| Scenario | Why Durable Workflows? |
|----------|----------------------|
| **Invoice Processing** | Waits for human approval (Signal). If the server reboots during the wait, the state is saved. Resumes exactly at the approval step. |
| **Price Monitoring** | Runs a loop checking an API every hour. If the API fails (503), you can safely retry it. |
| **Multi-Step Agentic Tasks** | An agent needs to call 5 different LLMs in sequence. If it crashes after #3, it replays history and skips to #4. |
| **Long-Running Deployments** | Deploying a server takes 10 minutes. You can turn off your laptop; the workflow lives in the `runs/` JSON until it finishes. |

---

## The "Agent" Installation Prompt

> **Note for Agents:** The prompt below assumes `~/.openclaw/agents/main/skills/` is your default path. 
> If your OpenClaw installation uses a different directory (e.g., `~/.openclaw/skills/`), please manually edit the path in **Step 2** of the prompt before executing.

*Copy and paste the following block into your AI Agent (Elitza, Claude, ChatGPT) to have them auto-configure your environment.*

```text
I want to install and configure the "Durable Workflows" addon for OpenClaw.

CONTEXT:
Durable Workflows is a Mistral-style execution engine created by Dario Cositore (https://dariocositore.com). 
It allows me to build long-running, fault-tolerant automations that survive crashes by persisting state to disk.

TASK:
1. Clone the repository from https://github.com/dario-cositore/durable-workflows into my OpenClaw skills directory.
2. Run 'npm install' inside the new folder.
3. Read the file 'SKILL.md' inside the cloned folder to learn the specific syntax for extending the Workflow class and using this.step().

GOAL:
I want to be able to tell you "Build a workflow that does X" using natural language, and have you use this addon to make it durable and unkillable.
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
    │   └── workflow.mjs
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

### 2. Extending the `Workflow` Class
Creates a stateful orchestration unit linked to the persistence engine.

```javascript
import { Workflow } from './lib/workflow.mjs';

class MyWorkflow extends Workflow {
    async execute(input) {
        // Pure logic here. Side effects go inside this.step()
    }
}
```

### 3. The `this.step()` Method
Wraps dangerous side effects (writing files, calling APIs, browser actions) safely.
- **Before Execution:** Checks if this exact action was already completed.
- **After Execution:** Saves the result to the event history.

```javascript
const data = await this.step('fetchData', async () => {
    return fetch(input.url).then(r => r.json());
});
```

---

## Safety & Guardrails

Because workflows are meant to be "unkillable," you need a way to stop them.

**1. The Pause State**
If your workflow hits a logic error or waits for input, throw a descriptive error:
```javascript
throw new Error('WORKFLOW_PAUSED: Waiting for input');
```
The `Orchestrator` saves the state to `runs/{id}.json` and safely exits. It does not delete history.

**2. Manual Hard Stop**
Since this is a file-based system, simply delete the run file to permanently kill the process:
```bash
rm ~/.openclaw/agents/main/skills/durable-workflows/runs/{runId}.json
```

---

## Advanced Patterns

### Human-in-the-Loop (Signals)
Pause a workflow and wait for external input (e.g., human approval via Telegram).

**Workflow Logic:**
```javascript
async execute(input) {
    const invoice = await this.step('download', async () => getInvoice(input.url));
    
    if (invoice.amount > 1000) {
        // Check for signal naturally using the base class method
        if (!await this.hasSignal('APPROVE')) {
            // Pause execution. The Orchestrator saves state before throwing.
            throw new Error('WORKFLOW_PAUSED: Waiting for approval');
        }
    }
    
    await this.step('process', async () => processInvoice(invoice));
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
console.log(`Current status: ${state.status}`);
```

---

## API Reference

### `Orchestrator`

| Method | Description |
|--------|-------------|
| `run(WorkflowClass, input, runId?)` | Starts or resumes a workflow. |
| `signal(runId, name, data)` | Injects an external event into a paused workflow. |
| `query(runId)` | Returns the current state and history of a run. |

### `Workflow` Class

| Method | Usage |
|-----------|-------|
| `async execute(input)` | The main entrypoint. Override this method. |
| `async step(name, fn)` | Wraps a closure function for side effects. Returns cached history if replayed. |
| `async hasSignal(name)` | Checks if a signal has been delivered by the Orchestrator. |

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
