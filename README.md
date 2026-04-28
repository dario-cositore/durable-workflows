# Durable Workflows

**A Mistral-Style Durable Execution Engine for OpenClaw Agents.**

Bring stateful, long-running orchestration to your AI agents. This addon allows your workflows to survive crashes, restarts, and manual interventions by persisting every step to disk.

> **Made by:** [dariocositore.com](https://dariocositore.com)

---

## Overview

When building complex AI automations, a single crash can lose hours of progress. **Durable Workflows** solves this by implementing an **Event-Sourced Architecture** (inspired by Temporal and Mistral Workflows).

Instead of running a script and hoping it finishes, you define a **Workflow**. If the power goes out, the system replays the history and resumes exactly where it left off.

## Installation

### 1. Download the Addon
Clone or download this repository into your OpenClaw skills directory:

```bash
# Navigate to your OpenClaw skills folder
cd ~/.openclaw/agents/main/skills/

# Clone this repo
git clone https://github.com/dario-cositore/durable-workflows.git
```

### 2. Install Dependencies
```bash
cd durable-workflows
npm install
```

### 3. Verify Setup
Ensure the structure looks like this:
```
~/.openclaw/agents/main/skills/
└── durable-workflows/
    ├── lib/
    │   ├── orchestrator.mjs
    │   └── decorators.mjs
    ├── runs/          # State is saved here
    └── SKILL.md
```

---

## Quick Start (Code Example)

You define your logic using JavaScript Classes and Decorators.

### 1. Create a Workflow File
Create `my-workflow.mjs`:

```javascript
import { Workflow, Activity } from './durable-workflows/lib/decorators.mjs';
import { Orchestrator } from './durable-workflows/lib/orchestrator.mjs';

// Initialize the Engine
const orch = new Orchestrator('./durable-workflows/runs');

@Workflow('DataSync')
class MySyncWorkflow {
    constructor(ctx) {
        this.engine = ctx.engine;
        this.runId = ctx.runId;
    }

    async execute(input) {
        // Step 1: Fetch data (Saved to history automatically)
        const raw = await this.fetchData(input.url);
        
        // Step 2: Process data
        const clean = await this.processData(raw);
        
        return { status: 'OK', rows: clean.length };
    }

    @Activity
    async fetchData(url) {
        // Your dangerous side-effect (API call, browser, etc.)
        return fetch(url).then(r => r.json());
    }

    @Activity
    async processData(data) {
        // Complex logic here. If it fails, replay resumes from fetchData.
        return data.filter(item => item.valid);
    }
}

// Run it
const result = await orch.run(MySyncWorkflow, { url: 'https://api.example.com/data' });
console.log(result);
```

### 2. Run It
```bash
node my-workflow.mjs
```

If the script crashes during `processData`, simply run it again. The `Orchestrator` detects the previous history and **skips the fetch**, restarting only the failed step.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Replayability** | Crash? No problem. The event history allows deterministic recovery. |
| **Signals** | Pause a workflow and wait for external input (e.g., human approval via Telegram). |
| **Activity Retries** | Failed API calls are tracked and can be retried automatically. |
| **Zero Lock-in** | Works with any LLM or tool. It’s just JavaScript. |

---

## Core Concepts

### The `@Workflow` Decorator
Marks a class as a stateful orchestration unit. It links the instance to the persistence engine.

### The `@Activity` Decorator
Wraps a method that performs side effects (writing files, calling APIs, browser actions). 
*   **Before**: Checks if this exact action was already completed.
*   **After**: Saves the result to the event history.

### The `Orchestrator` Class
The brain. It loads state, executes the workflow, and handles signals.
```javascript
const orch = new Orchestrator('./runs');
await orch.run(MyWorkflow, { /* input */ });
```

---

## Integration with OpenClaw

This addon is designed to be **non-invasive**:
1.  It does not modify your global OpenClaw installation.
2.  It lives in `skills/` and is imported only when needed.
3.  You pass your existing OpenClaw tools (like `exec` or `browser`) into the `@Activity` methods.

---

## 🌐 Resources

*   **Made By**: [dariocositore.com](https://dariocositore.com) (Check out the Agentic AI Architect, real job I swear)
*   **Source Code**: [GitHub](https://github.com/dario-cositore/durable-workflows)
*   **Examples**: Check the `example/` folder in this repo.

---

*Built for the Elitza ecosystem. Happy Automating!*
