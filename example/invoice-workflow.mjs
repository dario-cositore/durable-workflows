/**
 * EXAMPLE: Invoice Processing Workflow
 * 
 * This demonstrates how to use the Durable Workflows addon in a user's 
 * OpenClaw ecosystem. It is SAFE and NON-INVASIVE.
 * 
 * It does not assume any specific model or API key. It only assumes
 * the user has OpenClaw and has installed this skill.
 */

import { Workflow, Activity } from '../lib/decorators.mjs';
import { Orchestrator } from '../lib/orchestrator.mjs';

// 1. Create an Orchestrator instance (Points to your local runs folder)
const orchestrator = new Orchestrator('./runs');

// 2. Define your Workflow Class
@Workflow('InvoiceProcessor')
class InvoiceWorkflow {
    
    // The constructor receives the context (safe linkage to the engine)
    constructor(context) {
        this.engine = context.engine;
        this.runId = context.runId;
    }

    // 3. Define the main entrypoint
    async execute(inputData, currentState) {
        console.log('Starting Invoice Processing...');

        // Step 1: Download Invoice (Activity - side effect)
        const pdfText = await this.downloadInvoice(inputData.url);

        // Step 2: Extract Data (Activity - side effect)
        const jsonData = await this.extractData(pdfText);

        // Step 3: Check if approval is needed (Logic)
        if (jsonData.amount > 1000) {
            console.log('Amount > 1000. Waiting for manual approval...');
            
            // Check for external signal (from Telegram, etc.)
            const state = await this.engine.query(this.runId);
            const approvalSignal = state.pendingSignals?.find(s => s.signalName === 'APPROVE');

            if (!approvalSignal) {
                // Pause execution. The Orchestrator keeps state safe.
                // External system (e.g., user) must send a Signal to resume.
                throw new PauseError('Waiting for approval signal. Use orchestrator.signal() to resume.');
            }
        }

        // Step 4: Post to Accounting (Activity - side effect)
        const result = await this.postToAccounting(jsonData);
        
        return { status: 'SUCCESS', reference: result.ref };
    }

    // --- Activities (Decorated for Auto-Retry & Replay) ---

    @Activity
    async downloadInvoice(url) {
        // User can map their own tool here.
        // This is just a placeholder. In your OpenClaw, you might call:
        // return await myTools.browser.goto(url);
        return "FAKE_PDF_CONTENT";
    }

    @Activity
    async extractData(pdf) {
        // Heavy logic or LLM call goes here.
        // If this fails, the Orchestrator will replay from the last checkpoint.
        return { amount: 1500, vendor: 'ACME Corp' };
    }

    @Activity 
    async postToAccounting(data) {
        // API Call to external system.
        return { ref: 'INV-2026-001' };
    }
}

// --- How to Run (User Guide) ---
// Uncomment to execute:
// (async () => {
//     try {
//         const run = await orchestrator.run(InvoiceWorkflow, { url: 'http://example.com/inv.pdf' });
//         console.log(run);
//     } catch (e) {
//         console.log('Workflow paused or failed:', e.message);
//     }
// })();

class PauseError extends Error {}
