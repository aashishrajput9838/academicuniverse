import { forwardErrorToAI } from './src/services/logForwarder';

async function test() {
    console.log('Faking a crash to test Log Analyzer MCP...');
    // Simulated stack trace of a TypeError
    const stack = `TypeError: Cannot read properties of undefined (reading 'userId')
    at processImageChat (/app/src/controllers/aiController.ts:134:33)
    at layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)
    at next (/app/node_modules/express/lib/router/route.js:144:13)
    at Route.dispatch (/app/node_modules/express/lib/router/route.js:114:3)`;
    
    await forwardErrorToAI('/api/ai/image-chat', 'POST', 500, 'Cannot read properties of undefined (reading \'userId\')', stack);
    
    // allow event loop time to complete since forwardErrorToAI uses setImmediate
    setTimeout(() => {
        console.log('Script execution complete.');
        process.exit(0);
    }, 10000); 
}

test();
