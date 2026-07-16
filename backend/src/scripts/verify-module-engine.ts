/**
 * Verification script for the Automatic Module Population Engine.
 * Run with: npx ts-node -r tsconfig-paths/register backend/src/scripts/verify-module-engine.ts
 */

import { ModuleRegistry } from '../shared/application/moduleRegistry';
import { ModuleRoutingEngine, RoutingExecutor } from '../shared/application/routingEngine';

async function main() {
  console.log('=== Module Population Engine Verification ===\n');

  // 1. Verify ModuleRegistry
  const registry = ModuleRegistry.getInstance();
  const modules = registry.getAll();
  console.log(`[1] ModuleRegistry loaded ${modules.length} modules:`);
  for (const m of modules) {
    console.log(`    - ${m.moduleId} (${m.moduleName}) → ${m.canonicalCollection} [priority ${m.priority}]`);
  }

  // 2. Verify ModuleRoutingEngine can format registry
  const formatted = ModuleRoutingEngine.getFormattedModuleRegistry();
  console.log(`\n[2] ModuleRoutingEngine formatted registry (${formatted.length} chars)`);
  console.log('    First 200 chars:', formatted.slice(0, 200));

  // 3. Verify adapters are registered
  const routingEngine = require('../shared/application/routingEngine');
  const adaptersMap = routingEngine.adaptersMap;
  if (adaptersMap) {
    console.log(`\n[3] Adapters registered: ${Object.keys(adaptersMap).length}`);
    for (const [moduleId, adapter] of Object.entries(adaptersMap)) {
      console.log(`    - ${moduleId}: ${adapter.constructor.name}`);
    }
  } else {
    console.log(`\n[3] Adapters map not exported (internal to routingEngine)`);
  }

  // 4. Verify module-registry configs
  const { moduleConfigs } = require('../shared/application/module-registry');
  console.log(`\n[4] Module configs loaded: ${moduleConfigs.length}`);

  console.log('\n=== Verification Complete ===');
}

main().catch(console.error);
