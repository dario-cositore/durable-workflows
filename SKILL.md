# Durable Workflows Skill

This skill adds Mistral-style durable execution to OpenClaw. It allows agents to orchestrate long-running tasks that survive crashes and manual restarts.

## Usage

### 1. Start a Workflow
Use `start_workflow` to initialize a tracking ID for a multi-step mission.

### 2. Record Activities
Use `record_activity` after every major tool call (exec, web_fetch, etc.) to persist the result.

### 3. Recovery
If a session is interrupted, the agent reads the workflow run file to "replay" the state and resume.

## Files
- `lib/engine.mjs`: Core state machine.
- `runs/`: JSON history of all active and completed workflows.
