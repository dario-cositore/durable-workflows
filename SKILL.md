# Durable Workflows (OpenClaw Addon)

A **safe, non-invasive** implementation of Durable Execution for OpenClaw, bringing Mistral-style stateful orchestration to your agents without locking you into a specific vendor or model.

## Philosophy

This addon is designed to be **adaptable** and **secure**:
- **No Hard Dependencies**: It uses vanilla Node.js. It does not force you to use a specific LLM (OpenAI, Mistral, etc.).
- **Local Storage**: All state and history are stored in `./runs/`. You own your data.
- **Safe for Ecosystems**: It uses JavaScript Decorators to wrap *your* tools. It never executes arbitrary code on your behalf.

## Core Concepts (Mapped from Mistral)

| Mistral Concept | This Implementation |
|---|---|
| **Workflow** | A class decorated with `@Workflow`. Contains your logic. |
| **Activity** | A method decorated with `@Activity`. Wraps side-effects (API calls, browser, exec) for auto-retry and replay. |
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

## User Example: Pausing for Human Input

Because workflows are durable, you can pause execution and wait for external input (like a Telegram message) without losing state.

```javascript
// Inside your workflow class:
if (needsApproval) {
    // Check for signal
    const state = await this.engine.query(this.runId);
    if (!state.pendingSignals?.length) {
        // Throw a controlled error to pause execution
        // The Orchestrator saves state before throwing
        throw new PauseError('Waiting for user...');
    }
}
```

When your Telegram bot receives "APPROVE", it calls:
```javascript
orchestrator.signal(runId, 'APPROVE', { by: 'user' });
// Re-run the workflow, and it will continue from where it paused.
```

## Safety & Adaptability

- **No Elitza Coupling**: This code does not reference `ElitzaStaging` or any specific persona. It is a generic utility.
- **Tool Agnostic**: The `@Activity` decorator simply wraps a function. You decide what that function does (e.g., call OpenAI, call Claude, or run a bash script).
- **Fail-Safe**: If a workflow crashes, the `Orchestrator` preserves the `EventHistory` so you can debug exactly which step failed.