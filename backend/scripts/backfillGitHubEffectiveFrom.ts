import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SkillEvidence } from '../src/models/SkillEvidence';
import { SkillProjectionService } from '../src/shared/services/skillProjection.service';
import { AuditEntry } from '../src/models/AuditEntry';
import { toObjectId } from '../src/utils/mongooseHelpers';
import { SkillSource, EvidenceStatus } from '../src/shared/enums/skills.enum';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

function parseArgs(): { dryRun: boolean; execute: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');

  if (!dryRun && !execute) {
    console.log('Usage: ts-node backfillGitHubEffectiveFrom.ts [--dry-run | --execute]');
    console.log('  --dry-run  Show what would be backfilled without modifying data');
    console.log('  --execute  Actually update effectiveFrom and rebuild projections');
    process.exit(1);
  }

  if (dryRun && execute) {
    console.log('Error: --dry-run and --execute are mutually exclusive');
    process.exit(1);
  }

  return { dryRun, execute };
}

async function backfill() {
  const { dryRun, execute } = parseArgs();

  console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '⚡ EXECUTE MODE'}`);
  console.log('Backfill GitHub Evidence: effectiveFrom → payload.firstCommitDate');
  console.log('═'.repeat(60));

  await mongoose.connect(MONGODB_URI);
  console.log('✓ MongoDB connected\n');

  const projectionService = new SkillProjectionService();

  const githubActive = await SkillEvidence.find({
    primarySource: SkillSource.GITHUB,
    status: EvidenceStatus.ACTIVE,
    'payload.firstCommitDate': { $exists: true, $ne: null },
  }).lean().exec();

  console.log(`Total ACTIVE GitHub evidence with firstCommitDate: ${githubActive.length}`);

  const needsBackfill = githubActive.filter(e => {
    const repoDate = new Date(e.payload.firstCommitDate);
    const effectiveFrom = new Date(e.effectiveFrom);
    return repoDate.getTime() !== effectiveFrom.getTime();
  });

  const alreadyCorrect = githubActive.length - needsBackfill.length;
  console.log(`Already correct (effectiveFrom matches firstCommitDate): ${alreadyCorrect}`);
  console.log(`Needs backfill: ${needsBackfill.length}`);

  if (needsBackfill.length === 0) {
    console.log('✅ No backfill needed. Nothing to do.');
    await mongoose.connection.close();
    process.exit(0);
  }

  const personsToRebuild = new Set<string>();
  let backfilled = 0;

  for (const doc of needsBackfill) {
    const repoDate = new Date(doc.payload.firstCommitDate);
    const orgId = doc.organizationId.toString();
    const personId = doc.personId.toString();

    console.log(`  ${doc._id}: ${doc.skillId} — effectiveFrom ${doc.effectiveFrom.toISOString()} → ${repoDate.toISOString()}`);

    if (execute) {
      await SkillEvidence.updateOne(
        { _id: doc._id },
        { effectiveFrom: repoDate }
      );

      await AuditEntry.create({
        organizationId: orgId,
        recordId: doc._id.toString(),
        collectionName: 'skill_evidence',
        action: 'update',
        performedBy: 'backfill-script',
        metadata: {
          domain: 'skills',
          reason: 'backfilled_effectiveFrom',
          oldEffectiveFrom: doc.effectiveFrom.toISOString(),
          newEffectiveFrom: repoDate.toISOString(),
          correlationId: doc.correlationId,
          primarySource: SkillSource.GITHUB,
          sourceType: 'LANGUAGE',
        },
      });

      backfilled++;
      personsToRebuild.add(`${orgId}:${personId}`);
    }
  }

  if (execute && personsToRebuild.size > 0) {
    console.log('\nRebuilding skill projections...');
    for (const key of personsToRebuild) {
      const [orgId, personId] = key.split(':');
      console.log(`  Rebuilding projections for person ${personId} (org ${orgId})`);
      try {
        await projectionService.rebuildAllSkillRecords(orgId, personId);
        console.log(`    ✓ Rebuilt`);
      } catch (err: any) {
        console.error(`    ✗ Failed: ${err.message}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('BACKFILL SUMMARY');
  console.log(`   Total GitHub evidence: ${githubActive.length}`);
  console.log(`   Already correct: ${alreadyCorrect}`);
  console.log(`   Backfilled: ${backfilled}`);
  console.log(`   Persons rebuilt: ${personsToRebuild.size}`);

  if (!execute) {
    console.log('\nRun with --execute to apply changes.');
  } else {
    console.log('\n✅ Backfill complete.');
  }

  await mongoose.connection.close();
  process.exit(0);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  mongoose.connection.close().then(() => process.exit(1));
});
