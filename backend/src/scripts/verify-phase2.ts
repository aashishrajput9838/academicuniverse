/**
 * Phase 2 Verification Script for Automatic Module Population Engine.
 *
 * Run with: npx ts-node -r tsconfig-paths/register backend/src/scripts/verify-phase2.ts
 */

import mongoose from 'mongoose';
import { ModuleRegistry } from '../shared/application/moduleRegistry';
import { RoutingExecutor, adaptersMap } from '../shared/application/routingEngine';
import { KnowledgeRecordModel } from '../models/KnowledgeRecord';
import { UaipUpload } from '../models/UaipUpload';
import { ReviewHistory } from '../models/ReviewHistory';
import { ModulePopulationLog } from '../models/ModulePopulationLog';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function connect() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    console.log('[verify] Connected to MongoDB');
  }
}

async function disconnect() {
  await mongoose.disconnect();
  console.log('[verify] Disconnected from MongoDB');
}

async function run() {
  await connect();

  console.log('\n=== Phase 2 Automatic Module Population Engine Verification ===\n');

  const testProcessingId = 'verify-phase2-' + Date.now();
  const testOrgId = 'org-test-123';
  const ownerUserId = 'user-owner-123';

  // 1. Verify ModuleRegistry
  const registry = ModuleRegistry.getInstance();
  const modules = registry.getAll();
  console.log(`[1] ModuleRegistry loaded ${modules.length} modules:`);
  for (const m of modules) {
    console.log(`    - ${m.moduleId} (${m.moduleName}) → ${m.canonicalCollection} [priority ${m.priority}]`);
  }

  // 2. Verify adapters
  const adapterIds = Object.keys(adaptersMap);
  console.log(`\n[2] Adapters registered: ${adapterIds.length}`);
  for (const moduleId of adapterIds) {
    const adapter = adaptersMap[moduleId];
    console.log(`    - ${moduleId}: ${adapter.constructor.name}`);
  }

  // 3. Verify health check
  console.log('\n[3] RoutingExecutor health check...');
  const health = await RoutingExecutor.healthCheck();
  const healthyCount = Object.values(health).filter((h: any) => h.healthy).length;
  console.log(`    Healthy: ${healthyCount}/${Object.keys(health).length}`);
  for (const [moduleId, status] of Object.entries(health)) {
    console.log(`    - ${moduleId}: ${status.healthy ? 'OK' : 'FAIL: ' + status.message}`);
  }

  // 4. Create test document
  console.log('\n[4] Creating test document...');
  await UaipUpload.create({
    processingId: testProcessingId,
    organizationId: testOrgId,
    userId: ownerUserId,
    fileName: 'test-transcript.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    status: 'SUCCESS',
  });

  await KnowledgeRecordModel.create({
    processingId: testProcessingId,
    documentCategory: 'TRANSCRIPT',
    language: 'en',
    isScanned: false,
    parserStrategy: 'PDF_PARSER',
    confidenceScore: 0.95,
    reviewStatus: 'APPROVED',
    version: 1,
    candidateFields: {
      subjects: [
        { code: 'CS101', name: 'Computer Science', grade: 'A', credits: 4, semester: '1', year: 2024 },
      ],
    },
    routingDecision: {
      documentType: 'TRANSCRIPT',
      primaryModule: 'academic_records',
      secondaryModules: ['growth_hub', 'career_profile'],
      routingConfidence: 0.95,
      reasoning: 'Transcript contains academic records',
    },
  });

  await ReviewHistory.create({
    processingId: testProcessingId,
    organizationId: testOrgId,
    reviewerId: 'admin-1',
    reviewerRole: 'ADMIN',
    action: 'APPROVED',
    version: 1,
    timestamp: new Date(),
  });

  console.log('[4] Test document created');

  // 5. Test population
  console.log('\n[5] Testing population...');
  let supportsTransactions = false;
  try {
    if (mongoose.connection && mongoose.connection.db) {
      const isMasterResult = await mongoose.connection.db.admin().command({ isMaster: 1 });
      supportsTransactions = !!(isMasterResult.setName || isMasterResult.hosts);
    }
  } catch (err) {
    console.warn('[verify] Failed to query MongoDB isMaster command; assuming standalone mode');
  }

  if (supportsTransactions) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const kr = await KnowledgeRecordModel.findOne({ processingId: testProcessingId }).session(session);
      const upload = await UaipUpload.findOne({ processingId: testProcessingId }).session(session);

      const result = await RoutingExecutor.execute({
        kr,
        upload,
        personId: new mongoose.Types.ObjectId(),
        session,
        reviewer: { userId: ownerUserId, role: 'STUDENT', organizationId: testOrgId },
        finalFields: (kr as any).candidateFields,
        routingDecision: (kr as any).routingDecision,
      });

      console.log(`[5] Population completed:`);
      console.log(`    Primary collection: ${result.primaryCollection}`);
      console.log(`    Primary record IDs: ${result.primaryRecordIds.join(', ')}`);
      for (const write of result.writes) {
        console.log(`    - ${write.moduleId}: ${write.status} (${write.recordIds.length} records)`);
      }

      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      console.log('[5] FAIL:', err.message);
    } finally {
      await session.endSession();
    }
  } else {
    try {
      const kr = await KnowledgeRecordModel.findOne({ processingId: testProcessingId });
      const upload = await UaipUpload.findOne({ processingId: testProcessingId });

      const result = await RoutingExecutor.execute({
        kr,
        upload,
        personId: new mongoose.Types.ObjectId(),
        session: undefined as any,
        reviewer: { userId: ownerUserId, role: 'STUDENT', organizationId: testOrgId },
        finalFields: (kr as any).candidateFields,
        routingDecision: (kr as any).routingDecision,
      });

      console.log(`[5] Population completed (standalone mode):`);
      console.log(`    Primary collection: ${result.primaryCollection}`);
      console.log(`    Primary record IDs: ${result.primaryRecordIds.join(', ')}`);
      for (const write of result.writes) {
        console.log(`    - ${write.moduleId}: ${write.status} (${write.recordIds.length} records)`);
      }
    } catch (err: any) {
      console.log('[5] FAIL:', err.message);
    }
  }

  // 6. Verify population logs
  console.log('\n[6] Verifying population logs...');
  const logs = await ModulePopulationLog.find({ processingId: testProcessingId });
  console.log(`    Population logs created: ${logs.length}`);
  for (const log of logs) {
    console.log(`    - ${log.moduleId}: ${log.action} ${log.status} (${log.recordIds.length} records)`);
  }

  // 7. Test idempotency
  console.log('\n[7] Testing idempotency...');
  if (supportsTransactions) {
    const session2 = await mongoose.startSession();
    session2.startTransaction();
    try {
      const kr = await KnowledgeRecordModel.findOne({ processingId: testProcessingId }).session(session2);
      const upload = await UaipUpload.findOne({ processingId: testProcessingId }).session(session2);

      const result2 = await RoutingExecutor.execute({
        kr,
        upload,
        personId: new mongoose.Types.ObjectId(),
        session: session2,
        reviewer: { userId: ownerUserId, role: 'STUDENT', organizationId: testOrgId },
        finalFields: (kr as any).candidateFields,
        routingDecision: (kr as any).routingDecision,
      });

      const skippedWrites = result2.writes.filter(w => w.status === 'SKIPPED');
      console.log(`    Idempotency test: ${skippedWrites.length}/${result2.writes.length} writes skipped`);
      console.log(`    Result: ${skippedWrites.length === result2.writes.length ? 'PASS' : 'FAIL'} - All writes were skipped as expected`);

      await session2.commitTransaction();
    } catch (err: any) {
      await session2.abortTransaction();
      console.log('[7] FAIL:', err.message);
    } finally {
      await session2.endSession();
    }
  } else {
    try {
      const kr = await KnowledgeRecordModel.findOne({ processingId: testProcessingId });
      const upload = await UaipUpload.findOne({ processingId: testProcessingId });

      const result2 = await RoutingExecutor.execute({
        kr,
        upload,
        personId: new mongoose.Types.ObjectId(),
        session: undefined as any,
        reviewer: { userId: ownerUserId, role: 'STUDENT', organizationId: testOrgId },
        finalFields: (kr as any).candidateFields,
        routingDecision: (kr as any).routingDecision,
      });

      const skippedWrites = result2.writes.filter(w => w.status === 'SKIPPED');
      console.log(`    Idempotency test: ${skippedWrites.length}/${result2.writes.length} writes skipped (standalone mode)`);
      console.log(`    Result: ${skippedWrites.length === result2.writes.length ? 'PASS' : 'FAIL'} - All writes were skipped as expected`);
    } catch (err: any) {
      console.log('[7] FAIL:', err.message);
    }
  }

  // 8. Test rollback
  console.log('\n[8] Testing rollback...');
  if (supportsTransactions) {
    const session3 = await mongoose.startSession();
    session3.startTransaction();
    try {
      const kr = await KnowledgeRecordModel.findOne({ processingId: testProcessingId }).session(session3);
      const rollbackWrites = await RoutingExecutor.rollback({
        processingId: testProcessingId,
        organizationId: testOrgId,
        personId: String((kr as any)._id),
        session: session3,
        routingDecision: (kr as any).routingDecision,
      });

      console.log(`    Rollback completed:`);
      for (const write of rollbackWrites) {
        console.log(`    - ${write.moduleId}: ${write.status} (${write.recordIds.length} records removed)`);
      }

      await session3.commitTransaction();
    } catch (err: any) {
      await session3.abortTransaction();
      console.log('[8] FAIL:', err.message);
    } finally {
      await session3.endSession();
    }
  } else {
    try {
      const kr = await KnowledgeRecordModel.findOne({ processingId: testProcessingId });
      const rollbackWrites = await RoutingExecutor.rollback({
        processingId: testProcessingId,
        organizationId: testOrgId,
        personId: String((kr as any)._id),
        session: undefined as any,
        routingDecision: (kr as any).routingDecision,
      });

      console.log(`    Rollback completed (standalone mode):`);
      for (const write of rollbackWrites) {
        console.log(`    - ${write.moduleId}: ${write.status} (${write.recordIds.length} records removed)`);
      }
    } catch (err: any) {
      console.log('[8] FAIL:', err.message);
    }
  }

  // 9. Verify logs after rollback
  console.log('\n[9] Verifying logs after rollback...');
  const logsAfterRollback = await ModulePopulationLog.find({ processingId: testProcessingId });
  console.log(`    Remaining logs: ${logsAfterRollback.length}`);
  console.log(`    Result: ${logsAfterRollback.length === 0 ? 'PASS' : 'FAIL'} - All logs cleaned up`);

  // 10. Cleanup
  console.log('\n[10] Cleaning up...');
  await UaipUpload.deleteOne({ processingId: testProcessingId });
  await KnowledgeRecordModel.deleteOne({ processingId: testProcessingId });
  await ReviewHistory.deleteMany({ processingId: testProcessingId });
  await ModulePopulationLog.deleteMany({ processingId: testProcessingId });

  await disconnect();
  console.log('\n=== Verification Complete ===');
}

run().catch(err => {
  console.error('[verify] Fatal error:', err);
  process.exit(1);
});
