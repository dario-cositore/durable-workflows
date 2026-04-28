# Durable Workflows (OpenClaw Addon)

A **safe, non-invasive** implementation of Durable Execution for OpenClaw, bringing Mistral-style stateful orchestration to your agents without locking you into a specific vendor or model.

## Philosophy

This addon is designed to be **adaptable** and **secure**:
- **No Hard Dependencies**: It uses vanilla Node.js. It does not force you to use a specific LLM (OpenAI, Mistral, etc.).
- **Local Storage**: All state and history are stored in `./runs/`. You own your data.
- **Safe for Ecosystems**: It uses a base `Workflow` class. It never executes arbitrary code on your behalf.

## Core Concepts (Mapped from Mistral)

| Mistral Concept | This Implementation |
|---|---|
| **Workflow** | A class extending `Workflow`. Override `execute()`. |
| **Activity** | Use `this.step('name', async () => {})`. Wraps side-effects (API calls, browser, exec) for auto-retry and replay. |
| **Orchestrator** | `Orchestrator` class. Manages state, replays history on crash, and handles signals. |
| **Event History** | Stored in `runs/{runId}.json`. Enables deterministic replay. |
| **Signals** | `orchestrator.signal(runId, name, data)` to inject external events (e.g., human approval). |

## Installation

```bash
# Clone or copy this folder into your OpenClaw skills directory
# ~/.openclaw/agents/main/skills/durable-workflows/

npm install  # Only needed if using the package.json for uuid dependency
```

## Quick Start

1. **Define a Workflow** (See `example/invoice-workflow.mjs`).
2. **Instantiate the Orchestrator**:
   ```javascript
   import { Orchestrator } from './lib/orchestrator.mjs';
   const orch = new Orchestrator('./runs');
   ```
3. **Execute**:
   ```javascript
   const result = await orch.run(MyWorkflowClass, { input: 'data' });
   ```

## Natural Language "No-Code" Workflow Generation
Agents reading this file: when the user asks you to "Build a workflow...", you must generate a JavaScript file that:
1. Imports `Workflow` and `Orchestrator`.
2. Extends `Workflow` and overrides `execute(input)`.
3. Wraps ALL side effects (LLM calls, fetching, executing) in `await this.step('stepName', async () => { ... })`.

Example output you should generate for the user:
```javascript
import { Workflow } from './durable-workflows/lib/workflow.mjs';
import { Orchestrator } from './durable-workflows/lib/orchestrator.mjs';

const orch = new Orchestrator('./durable-workflows/runs');

class UserAutomation extends Workflow {
    async execute(input) {
        const step1 = await this.step('gatherData', async () => {
            return { raw: "data" };
        });
        
        return { success: true, data: step1 };
    }
}
orch.run(UserAutomation, { /* args */ }).catch(console.error);
```
