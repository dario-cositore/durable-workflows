import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';

/**
 * OPENCLAW SKILL: DURABLE WORKFLOWS
 * Orchestration engine for long-running, replayable tasks.
 */
export class WorkflowEngine {
    constructor(storagePath) {
        this.storageDir = storagePath;
        if (!fs.existsSync(this.storageDir)) fs.mkdirSync(this.storageDir, { recursive: true });
    }

    async start(name, input) {
        const id = uuidv4();
        const state = { id, name, status: 'RUNNING', input, history: [], createdAt: new Date() };
        this.save(id, state);
        return id;
    }

    async record(id, activity, result) {
        const state = this.load(id);
        state.history.push({ activity, result, time: new Date() });
        this.save(id, state);
    }

    load(id) {
        return JSON.parse(fs.readFileSync(path.join(this.storageDir, `${id}.json`)));
    }

    save(id, state) {
        fs.writeFileSync(path.join(this.storageDir, `${id}.json`), JSON.stringify(state, null, 2));
    }
}
