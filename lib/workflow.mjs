/**
 * DURABLE WORKFLOWS: BASE CLASS
 * Vanilla JS implementation. No build steps or decorators needed.
 */
export class Workflow {
    constructor(context) {
        this.engine = context.engine;
        this.runId = context.runId;
    }

    /**
     * Executes a side effect. If it already ran in a previous attempt,
     * it skips execution and returns the cached result from history.
     */
    async step(activityName, fn) {
        const history = this.engine.loadHistory(this.runId);
        const existing = history.find(h => h.activity === activityName);

        if (existing) {
            console.log(`[Replay] Skipping activity '${activityName}', using cached result.`);
            return existing.result;
        }

        console.log(`[Activity] Executing '${activityName}'...`);
        const result = await fn();

        this.engine.recordEvent(this.runId, {
            type: 'ACTIVITY_COMPLETED',
            activity: activityName,
            result: result,
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Helper to check if a signal has been received
     */
    async hasSignal(signalName) {
        const state = await this.engine.query(this.runId);
        return !!state?.pendingSignals?.find(s => s.signalName === signalName);
    }
}
