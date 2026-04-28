/**
 * DURABLE WORKFLOWS: ORCHESTRATOR (Mistral-Compatible Logic)
 * Handles execution, replay, signal queuing, and state persistence.
 */
import fs from 'node:fs';
import path from 'node:path';

export class Orchestrator {
    constructor(storagePath) {
        this.storagePath = storagePath;
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    /**
     * Runs a Workflow Class instance safely.
     * If it crashes, it replays from history.
     */
    async run(workflowClass, input, runId = null) {
        const id = runId || this.generateId();
        const stateFile = path.join(this.storagePath, `${id}.json`);

        // Load existing state or initialize
        let state = { runId: id, status: 'RUNNING', history: [], input, checkpoints: [] };
        if (fs.existsSync(stateFile)) {
            state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            console.log(`[Orchestrator] Resuming workflow ${id} from checkpoint...`);
        }

        // Create context for decorators
        const context = { engine: this, runId: id };
        const workflowInstance = new workflowClass(context);

        try {
            // Execute the workflow entrypoint
            const result = await workflowInstance.execute(input, state);
            
            state.status = 'COMPLETED';
            state.result = result;
            this.saveState(id, state);
            
            return { status: 'COMPLETED', runId: id, result };
        } catch (error) {
            state.status = 'FAILED';
            state.error = error.message;
            this.saveState(id, state);
            
            // In a real system, we might retry or alert here.
            console.error(`[Orchestrator] Workflow ${id} failed:`, error.message);
            throw error;
        }
    }

    /**
     * Signal a running workflow (External Event Injection)
     * Example: User approves a transaction via Telegram.
     */
    async signal(runId, signalName, data) {
        const stateFile = path.join(this.storagePath, `${runId}.json`);
        if (!fs.existsSync(stateFile)) {
            return { error: 'Workflow not found' };
        }

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        
        if (!state.pendingSignals) state.pendingSignals = [];
        state.pendingSignals.push({ signalName, data, timestamp: new Date().toISOString() });
        
        this.saveState(runId, state);
        console.log(`[Signal] ${signalName} delivered to ${runId}`);
        
        // Note: In a real runtime, this would wake up the paused workflow.
        // For this addon, the workflow logic must check for signals manually.
        return { success: true };
    }

    /**
     * Query the state without modifying it
     */
    async query(runId) {
        const stateFile = path.join(this.storagePath, `${runId}.json`);
        if (!fs.existsSync(stateFile)) return null;
        return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }

    // --- Internal Helpers ---
    generateId() {
        return 'wf_' + Math.random().toString(36).substr(2, 9);
    }

    saveState(id, state) {
        const filePath = path.join(this.storagePath, `${id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    }

    recordEvent(runId, event) {
        const state = this.query(runId);
        if (!state) return;
        if (!state.history) state.history = [];
        state.history.push(event);
        this.saveState(runId, state);
    }

    loadHistory(id) {
        const state = this.query(id);
        return state ? state.history : [];
    }
}
