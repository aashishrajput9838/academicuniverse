import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SkillEvidenceRepository } from '../src/shared/repositories/skillEvidence.repository';
import { SkillProjectionService } from '../src/shared/services/skillProjection.service';
import { AuditEntry } from '../src/models/AuditEntry';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

interface DuplicateGroup {
  personId: string;
  organizationId: string;
  correlationId: string;
  skillId: string;
  primarySource: string;
  sourceType: string;
  documents: Array<{
    _id: any;
    createdAt: Date;
    payload: Record<string, any>;
    status: string;
  }>;
}

function parseArgs(): { dryRun: boolean; execute: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');

  if (!dryRun && !execute) {
    console.log('Usage: ts-node reconcileSkillEvidence.ts [--dry-run | --execute]');
    console.log('  --dry-run  Show what would be changed without modifying data');
    console.log('  --execute  Actually supersede duplicates and rebuild projections');
    process.exit(1);
  }

  if (dryRun && execute) {
    console.log('Error: --dry-run and --execute are mutually exclusive');
    process.exit(1);
  }

  return { dryRun, execute };
}

async function reconcile() {
  const { dryRun, execute } = parseArgs();

  console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '⚡ EXECUTE MODE'}`);
  console.log('═'.repeat(60));

  await mongoose.connect(MONGODB_URI);
  console.log('✓ MongoDB connected\n');

  const repo = new SkillEvidenceRepository();
  const projectionService = new SkillProjectionService();

  const allActive = await mongoose.connection.db.collection('skillevidences').find({
    status: 'ACTIVE',
  }).toArray();

  console.log(`Total ACTIVE evidence documents: ${allActive.length}`);

  const groups = new Map<string, DuplicateGroup>();

  for (const doc of allActive) {
    const personId = doc.personId.toString();
    const organizationId = doc.organizationId.toString();
    const correlationId = doc.correlationId || '';
    const skillId = doc.skillId;
    const primarySource = doc.primarySource;
    const sourceType = doc.sourceType;
    const repositoryId = (doc as any).repositoryId;

    const isGitHubWithRepo = primarySource === 'GITHUB' && repositoryId;
    const key = isGitHubWithRepo
      ? `${personId}|${correlationId}|${repositoryId}|${primarySource}|${sourceType}`
      : `${personId}|${correlationId}|${skillId}|${primarySource}|${sourceType}`;

    if (!groups.has(key)) {
      groups.set(key, {
        personId,
        organizationId,
        correlationId,
        skillId,
        primarySource,
        sourceType,
        documents: [],
      });
    }

    groups.get(key)!.documents.push({
      _id: doc._id,
      createdAt: doc.createdAt,
      payload: doc.payload || {},
      status: doc.status,
    });
  }

  const duplicateGroups = Array.from(groups.values()).filter(g => g.documents.length > 1);

  console.log(`Unique evidence keys: ${groups.size}`);
  console.log(`Duplicate groups found: ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found. Nothing to do.');
    await mongoose.connection.close();
    process.exit(0);
  }

  const affectedPersons = new Set<string>();
  let totalSuperseded = 0;

  for (const group of duplicateGroups) {
    group.documents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const keep = group.documents[0];
    const supersede = group.documents.slice(1);

    console.log(`Group: ${group.skillId} (${group.primarySource}/${group.sourceType})`);
    console.log(`  Person: ${group.personId}`);
    console.log(`  CorrelationId: ${group.correlationId}`);
    console.log(`  Total documents: ${group.documents.length}`);
    console.log(`  Keeping: ${keep._id} (${keep.createdAt.toISOString()})`);
    console.log(`  Superseding: ${supersede.length} document(s)`);

    for (const doc of supersede) {
      console.log(`    - ${doc._id} (${doc.createdAt.toISOString()})`);
    }

    if (execute) {
      for (const doc of supersede) {
        await repo.supersede(doc._id.toString(), keep._id.toString(), group.organizationId);

        await AuditEntry.create({
          organizationId: group.organizationId,
          recordId: doc._id.toString(),
          collectionName: 'skill_evidence',
          action: 'update',
          performedBy: 'reconciliation-script',
          metadata: {
            domain: 'skills',
            reason: 'superseded_by_reconciliation',
            correlationId: group.correlationId,
            primarySource: group.primarySource,
            sourceType: group.sourceType,
            supersededBy: keep._id.toString(),
          },
        });

        totalSuperseded++;
      }

      affectedPersons.add(group.personId);
    }

    console.log('');
  }

  if (execute) {
    console.log('Rebuilding skill projections for affected persons...');
    for (const personId of affectedPersons) {
      const person = allActive.find(d => d.personId.toString() === personId);
      if (!person) continue;

      const orgId = person.organizationId.toString();
      console.log(`  Rebuilding projections for person ${personId} (org ${orgId})`);

      try {
        await projectionService.rebuildAllSkillRecords(orgId, personId);
        console.log(`    ✓ Rebuilt`);
      } catch (err: any) {
        console.error(`    ✗ Failed: ${err.message}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`✅ Reconciliation complete.`);
    console.log(`   Groups processed: ${duplicateGroups.length}`);
    console.log(`   Documents superseded: ${totalSuperseded}`);
    console.log(`   Persons affected: ${affectedPersons.size}`);
  } else {
    console.log('═'.repeat(60));
    console.log('DRY RUN SUMMARY');
    console.log(`   Groups that would be processed: ${duplicateGroups.length}`);
    console.log(`   Documents that would be superseded: ${duplicateGroups.reduce((sum, g) => sum + g.documents.length - 1, 0)}`);
    console.log(`   Persons that would be affected: ${duplicateGroups.length > 0 ? new Set(duplicateGroups.map(g => g.personId)).size : 0}`);
    console.log('\nRun with --execute to apply changes.');
  }

  await mongoose.connection.close();
  process.exit(0);
}

reconcile().catch(err => {
  console.error('Reconciliation failed:', err);
  mongoose.connection.close().then(() => process.exit(1));
});
