/**
 * DURABLE WORKFLOWS: DECORATORS
 * Non-invasive wrappers for OpenClaw tools to enable replay & state tracking.
 */

export function Activity(target, key, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
        const activityName = key;
        const runId = this.runId;

        // 1. Check Event History: Have we already done this?
        const history = this.engine.loadHistory(runId);
        const existing = history.find(h => h.activity === activityName && h.args === JSON.stringify(args));

        if (existing) {
            console.log(`[Replay] Skipping ${activityName}, already completed.`);
            return existing.result;
        }

        // 2. Execute the actual tool (dangerous side effect)
        console.log(`[Activity] Executing ${activityName}...`);
        const result = await originalMethod.apply(this, args);

        // 3. Record in State
        this.engine.recordEvent(runId, {
            type: 'ACTIVITY_COMPLETED',
            activity: activityName,
            args: JSON.stringify(args),
            result: JSON.stringify(result),
            timestamp: new Date().toISOString()
        });

        return result;
    };

    return descriptor;
}

export function Workflow(name) {
    return function (target) {
        target.prototype.workflowName = name;
        // The constructor initializes the engine link
        const originalConstructor = target;
        
        function newConstructor(...args) {
            const instance = new originalConstructor(...args);
            // Link to the shared engine
            instance.engine = args[0]?.engine; 
            instance.runId = args[0]?.runId;
            return instance;
        }
        
        newConstructor.prototype = originalConstructor.prototype;
        return newConstructor;
    };
}
