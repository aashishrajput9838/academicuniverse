import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GithubRecord } from '../src/models/GithubRecord';
import { SkillEvidence } from '../src/models/SkillEvidence';
import { SkillRecord } from '../src/models/SkillRecord';
import { SkillProjectionService } from '../src/shared/services/skillProjection.service';
import { AuditEntry } from '../src/models/AuditEntry';
import { toObjectId } from '../src/utils/mongooseHelpers';
import { SkillSource, EvidenceStatus } from '../src/shared/enums/skills.enum';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

interface RepoEvidence {
  organizationId: string;
  personId: string;
  correlationId: string;
  repo: any;
}

function parseArgs(): { dryRun: boolean; execute: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');

  if (!dryRun && !execute) {
    console.log('Usage: ts-node migrateGitHubToRepoLevel.ts [--dry-run | --execute]');
    console.log('  --dry-run  Show what would be migrated without modifying data');
    console.log('  --execute  Actually create repository-level evidence and supersede old aggregated evidence');
    process.exit(1);
  }

  if (dryRun && execute) {
    console.log('Error: --dry-run and --execute are mutually exclusive');
    process.exit(1);
  }

  return { dryRun, execute };
}

async function migrate() {
  const { dryRun, execute } = parseArgs();

  console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '⚡ EXECUTE MODE'}`);
  console.log('GitHub Evidence Migration: Aggregated → Repository-Level');
  console.log('═'.repeat(60));

  await mongoose.connect(MONGODB_URI);
  console.log('✓ MongoDB connected\n');

  const projectionService = new SkillProjectionService();

  const githubRecords = await GithubRecord.find({}).lean().exec();
  console.log(`Total GithubRecords found: ${githubRecords.length}`);

  const evidencesToCreate: RepoEvidence[] = [];
  const personsToRebuild = new Set<string>();
  let totalRepos = 0;
  let totalLegacySuperseded = 0;
  let totalChangedSuperseded = 0;

  for (const record of githubRecords) {
    const orgId = record.organizationId.toString();
    const personId = record.personId.toString();
    const correlationId = record._id.toString();
    const repos = Array.isArray(record.repositories) ? record.repositories : [];
    const nonForkRepos = repos.filter((repo: any) => !repo.fork);

    if (nonForkRepos.length === 0) continue;

    const oldEvidence = await SkillEvidence.find({
      organizationId: toObjectId(orgId),
      personId: toObjectId(personId),
      correlationId,
      primarySource: SkillSource.GITHUB,
      status: EvidenceStatus.ACTIVE,
    }).lean().exec();

    const legacyEvidence = oldEvidence.filter((e: any) => !e.repositoryId || e.repositoryId === '');
    const migratedEvidence = oldEvidence.filter((e: any) => e.repositoryId);

    console.log(`\nGithubRecord ${correlationId}: ${nonForkRepos.length} repos, ${oldEvidence.length} old evidence (${legacyEvidence.length} legacy, ${migratedEvidence.length} migrated)`);

    for (const legacy of legacyEvidence) {
      totalLegacySuperseded++;
      console.log(`  Legacy ${legacy._id}: ${legacy.skillId} — would supersede`);
      if (execute) {
        await SkillEvidence.updateOne(
          { _id: toObjectId(legacy._id.toString()) },
          { status: EvidenceStatus.SUPERSEDED }
        );

        await AuditEntry.create({
          organizationId: orgId,
          recordId: legacy._id.toString(),
          collectionName: 'skill_evidence',
          action: 'update',
          performedBy: 'migration-script',
          metadata: {
            domain: 'skills',
            reason: 'superseded_by_migration_legacy',
            correlationId,
            primarySource: SkillSource.GITHUB,
            sourceType: 'LANGUAGE',
          },
        });
      }
    }

    for (const repo of nonForkRepos) {
      if (!repo.language) continue;
      totalRepos++;

      const repoId = String(repo.id);
      const existing = migratedEvidence.find((e: any) => e.repositoryId === repoId);

      if (existing) {
        const existingPayload = existing.payload || {};
        const newPayload = {
          language: repo.language,
          repositoryId: repoId,
          repositoryName: repo.name,
          repositoryUrl: repo.html_url,
          owner: repo.owner?.login,
          bytesOfCode: repo.size || 0,
          firstCommitDate: repo.created_at,
          lastCommitDate: repo.pushed_at,
          repositoryVisibility: repo.private ? 'PRIVATE' : 'PUBLIC',
          topics: repo.topics || [],
          description: repo.description,
        };
        const payloadMatch = JSON.stringify(existingPayload) === JSON.stringify(newPayload);

        if (payloadMatch) {
          console.log(`  Repo ${repo.name}: already exists, identical payload — skip`);
          continue;
        }

        console.log(`  Repo ${repo.name}: exists but payload changed — would supersede`);
        if (execute) {
          await SkillEvidence.updateOne(
            { _id: toObjectId(existing._id.toString()) },
            { status: EvidenceStatus.SUPERSEDED }
          );

          await AuditEntry.create({
            organizationId: orgId,
            recordId: existing._id.toString(),
            collectionName: 'skill_evidence',
            action: 'update',
            performedBy: 'migration-script',
            metadata: {
              domain: 'skills',
              reason: 'superseded_by_migration_changed',
              correlationId,
              repositoryId: repoId,
              primarySource: SkillSource.GITHUB,
              sourceType: 'LANGUAGE',
            },
          });

          totalChangedSuperseded++;
        }
      }

      evidencesToCreate.push({
        organizationId: orgId,
        personId,
        correlationId,
        repo,
      });
    }

    if (oldEvidence.length > 0) {
      personsToRebuild.add(`${orgId}:${personId}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log(`   Total repos processed: ${totalRepos}`);
  console.log(`   Legacy aggregated evidence found: ${totalLegacySuperseded}`);
  console.log(`   Legacy aggregated evidence to supersede: ${totalLegacySuperseded}`);
  console.log(`   Changed repository evidence to supersede: ${totalChangedSuperseded}`);
  console.log(`   Repository evidence to create: ${evidencesToCreate.length}`);
  console.log(`   Persons to rebuild: ${personsToRebuild.size}`);

  if (execute && evidencesToCreate.length > 0) {
    console.log('\nCreating repository-level evidence...');
    for (const item of evidencesToCreate) {
      const repo = item.repo;
      await SkillEvidence.create({
        organizationId: toObjectId(item.organizationId),
        personId: toObjectId(item.personId),
        skillId: `LANGUAGE-${repo.language}`,
        skillName: repo.language,
        aliases: repo.topics || [],
        primarySource: SkillSource.GITHUB,
        sourceType: 'LANGUAGE',
        payload: {
          language: repo.language,
          repositoryId: String(repo.id),
          repositoryName: repo.name,
          repositoryUrl: repo.html_url,
          owner: repo.owner?.login,
          bytesOfCode: repo.size || 0,
          firstCommitDate: repo.created_at,
          lastCommitDate: repo.pushed_at,
          repositoryVisibility: repo.private ? 'PRIVATE' : 'PUBLIC',
          topics: repo.topics || [],
          description: repo.description,
        },
        confidence: 0.7,
        extractedBy: 'migration-script',
        correlationId: item.correlationId,
        effectiveFrom: new Date(),
        status: EvidenceStatus.ACTIVE,
        repositoryId: String(repo.id),
        repositoryName: repo.name,
        repositoryUrl: repo.html_url,
        owner: repo.owner?.login,
        language: repo.language,
        firstCommitDate: repo.created_at ? new Date(repo.created_at) : undefined,
        lastCommitDate: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
        bytesOfCode: repo.size || 0,
        repositoryVisibility: repo.private ? 'PRIVATE' : 'PUBLIC',
      } as any);

      await AuditEntry.create({
        organizationId: item.organizationId,
        recordId: repo.id.toString(),
        collectionName: 'skill_evidence',
        action: 'create',
        performedBy: 'migration-script',
        metadata: {
          domain: 'skills',
          correlationId: item.correlationId,
          repositoryId: String(repo.id),
          primarySource: SkillSource.GITHUB,
          sourceType: 'LANGUAGE',
        },
      });
    }

    console.log('Rebuilding skill projections...');
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

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Migration complete.');
    console.log(`   Evidence created: ${evidencesToCreate.length}`);
    console.log(`   Legacy evidence superseded: ${totalLegacySuperseded}`);
    console.log(`   Changed evidence superseded: ${totalChangedSuperseded}`);
    console.log(`   Persons rebuilt: ${personsToRebuild.size}`);
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('DRY RUN SUMMARY');
    console.log(`   Legacy aggregated evidence that would be superseded: ${totalLegacySuperseded}`);
    console.log(`   Changed repository evidence that would be superseded: ${totalChangedSuperseded}`);
    console.log(`   Repository evidence that would be created: ${evidencesToCreate.length}`);
    console.log(`   Persons that would be rebuilt: ${personsToRebuild.size}`);
    console.log('\nRun with --execute to apply changes.');
  }

  await mongoose.connection.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  mongoose.connection.close().then(() => process.exit(1));
});
