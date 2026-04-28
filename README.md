# Durable Workflows ⚙️

**A Mistral-Style Durable Execution Engine for OpenClaw Agents.**

> **Made by:** [dariocositore.com](https://dariocositore.com) | **Status:** Public Preview

---

> 🚨 **TL;DR FOR HUSTLERS**
> If you don't care about the theory and just want to run this:
> ```bash
> cd ~/.openclaw/agents/main/skills/
> git clone https://github.com/dario-cositore/durable-workflows.git
> cd durable-workflows && npm install
> ```
> Then drop the `example/invoice-workflow.mjs` into your agent. It just works.

---

## 📖 In-Depth Overview

When building complex AI automations, a single crash can lose hours of progress. **Durable Workflows** solves this by implementing an **Event-Sourced Architecture** (inspired by Temporal, Temporal.io, and Mistral Workflows).

### The Problem
Standard scripts run in memory. If the process dies, the context vanishes. You lose:
1.  **State** (What step was I on?)
2.  **Results** (Did I already fetch that API or not?)
3.  **Money** (Re-doing expensive LLM calls costs cash).

### The Solution
We treat your automation like a **Database Transaction**.
1.  **Workflow:** Pure logic (deterministic). No side effects here.
2.  **Activity:** The dangerous stuff (API calls, `exec`, browser). This is where things fail.
3.  **History:** We log every Activity result to disk (`runs/` folder).

**If the server reboots:** The Workflow re-reads the History, realizes Activity #2 already succeeded, and jumps straight to Activity #3. No duplicate work. No lost time.

---

## 📦 Installation

### 1. Download the Addon
Clone this into your OpenClaw skills directory:

```bash
cd ~/.openclaw/agents/main/skills/
git clone https://github.com/dario-cositore/durable-workflows.git
cd durable-workflows
npm install
```

### 2. Verify Structure
Your folder should look like this:
```
~/.openclaw/agents/main/skills/
└── durable-workflows/
    ├── lib/
    │   ├── orchestrator.mjs     # The Brain
    │   └── decorators.mjs      # The Magic (@Workflow, @Activity)
    ├── runs/                   # Auto-generated state logs
    └── example/                # Working templates
```

---

## 🚀 Quick Start (Code Example)

### 1. Create a Workflow
Create `my-workflow.mjs`:

```javascript
import { Workflow, Activity } from './durable-workflows/lib/decorators.mjs';
import { Orchestrator } from './durable-workflows/lib/orchestrator.mjs';

const orch = new Orchestrator('./durable-workflows/runs');

@Workflow('DataSync')
class MySyncWorkflow {
    constructor(ctx) {
        this.runId = ctx.runId;
    }

    async execute(input) {
        const raw = await this.fetchData(input.url);  // @Activity 1
        const clean = await this.processData(raw);     // @Activity 2
        return { status: 'OK', rows: clean.length };
    }

    @Activity
    async fetchData(url) {
        // If this crashes, it will retry.
        // If it succeeds, it saves the result so we never do it again.
        return fetch(url).then(r => r.json());
    }

    @Activity
    async processData(data) {
        // Complex logic here.
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
*Kill the process mid-way and run it again. Watch it skip the finished steps.*

---

## 🧩 Deep Dive: Core Concepts

### 1. The `@Workflow` Decorator
*   **What it is:** A marker for your main class.
*   **Rule:** This class must contain an `async execute()` method. This method should contain *logic only*. No `fetch` or `exec` calls here.

### 2. The `@Activity` Decorator
*   **What it is:** A wrapper for side effects.
*   **How it works:**
    1.  Before running, it checks `runs/{id}.json` to see if this exact call with these exact args already happened.
    2.  If yes, it returns the cached result (Instant replay).
    3.  If no, it runs the code, saves the output, and returns it.
*   **Best Practice:** Make Activities **idempotent** (running them twice doesn't break things).

### 3. The `Orchestrator` Class
*   **`run(Workflow, input)`**: Starts or resumes a process.
*   **`signal(runId, name, data)`**: Inject data into a paused workflow (e.g., "Approve Payment").
*   **`query(runId)`**: Read the current state without modifying it.

---

## 🛠️ Advanced Guide: Human-in-the-Loop

How to pause a workflow and wait for a Telegram user to approve it.

```javascript
// Inside your Workflow class:
async execute(input) {
    const invoice = await this.downloadInvoice(input.url);
    
    if (invoice.amount > 10000) {
        // 1. Check if we already have approval
        const state = await this.engine.query(this.runId);
        const approved = state.history.find(h => h.signalName === 'APPROVED');

        if (!approved) {
            // 2. Send a message to Telegram (pseudo-code)
            // await telegram.send("Approve payment?");
            
            // 3. PAUSE EXECUTION
            throw new Error('Workflow Paused: Awaiting Approval');
        }
    }
    
    await this.payInvoice(invoice);
}

// In your Telegram bot script:
// When user clicks "Approve":
orchestrator.signal('workflow-run-id-123', 'APPROVED', {by: 'user'});

// Re-run the workflow script.
// It will see the signal in history and proceed to payInvoice.
```

---

## 🗺️ Roadmap & Vision

We are building this to be the **"Temporal.io for AI Agents"** but lightweight and OpenClaw-native.

| Version | Feature | Status |
|---------|---------|--------|
| **v1.0** | Core Orchestration & Event History | ✅ Done |
| **v1.1** | Signal/Query APIs | ✅ Done |
| **v1.5** | Dashboard UI (View running workflows) | 🚧 WIP |
| **v2.0** | Distributed Workers (Run activities across multiple machines) | 📅 Planned |
| **v2.5** | Cron/Scheduling Integration | 📅 Planned |

**Goal:** Make it so you can deploy an agent on a laptop, turn the laptop off, turn it on 3 days later, and the agent continues exactly where it left off.

---

## 🔗 Resources

*   **Documentation:** [dariocositore.com](https://dariocositore.com)
*   **Source Code:** [GitHub Repo](https://github.com/dario-cositore/durable-workflows)
*   **Examples:** `example/` directory.

---

*No black boxes. No magic cloud. Just durable JavaScript.* ⭐