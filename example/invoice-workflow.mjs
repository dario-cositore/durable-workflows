/**
 * EXAMPLE: Invoice Processing Workflow
 * 
 * This demonstrates how to use the Durable Workflows addon in a user's 
 * OpenClaw ecosystem. Safe and vanilla JS (no transpilers needed).
 */

import { Workflow } from '../lib/workflow.mjs';
import { Orchestrator } from '../lib/orchestrator.mjs';

// 1. Create an Orchestrator instance (Points to your local runs folder)
const orchestrator = new Orchestrator('./runs');

// 2. Define your Workflow Class extending the base Workflow
class InvoiceWorkflow extends Workflow {

    // 3. Define the main execute function
    async execute(inputData) {
        console.log('Starting Invoice Processing...');

        // Step 1: Download Invoice (Wrapped in this.step for replayability)
        const pdfText = await this.step('downloadInvoice', async () => {
            console.log(`-> Actually downloading: ${inputData.url}`);
            return "FAKE_PDF_CONTENT";
        });

        // Step 2: Extract Data
        const jsonData = await this.step('extractData', async () => {
            console.log('-> Actually extracting data with LLM...');
            return { amount: 1500, vendor: 'ACME Corp' };
        });

        // Step 3: Check if approval is needed
        if (jsonData.amount > 1000) {
            console.log('Amount > 1000. Checking for manual approval...');
            
            // Check for external signal
            if (!await this.hasSignal('APPROVE')) {
                // Pause execution. The Orchestrator keeps state safe.
                throw new Error('WORKFLOW_PAUSED: Waiting for approval signal. Use orchestrator.signal() to resume.');
            }
        }

        // Step 4: Post to Accounting
        const result = await this.step('postToAccounting', async () => {
            console.log('-> Actually posting to accounting API...');
            return { ref: 'INV-2026-001' };
        });
        
        return { status: 'SUCCESS', reference: result.ref };
    }
}

// --- How to Run (User Guide) ---
(async () => {
    try {
        console.log('\n--- ATTEMPT 1: No Signal yet ---');
        await orchestrator.run(InvoiceWorkflow, { url: 'http://example.com/inv.pdf' }, 'demo-run-123');
    } catch (e) {
        console.log('Workflow stopped:', e.message);
    }

    try {
        console.log('\n--- SIMULATING APPROVAL VIA TELEGRAM ---');
        await orchestrator.signal('demo-run-123', 'APPROVE', { by: 'dario' });
        
        console.log('\n--- ATTEMPT 2: Should Replay and Finish ---');
        const finalResult = await orchestrator.run(InvoiceWorkflow, { url: 'http://example.com/inv.pdf' }, 'demo-run-123');
        console.log('Final Result:', finalResult);
    } catch (e) {
        console.log('Workflow stopped:', e.message);
    }
})();
