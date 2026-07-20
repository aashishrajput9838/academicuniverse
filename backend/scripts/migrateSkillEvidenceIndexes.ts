import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

const OBSOLETE_INDEXES = [
  'uniqueActiveEvidenceBySource',
  'uniqueActiveLegacyEvidence',
  'uniqueActiveGitHubEvidence',
];

const KEEP_INDEXES = [
  'evidenceByPersonSkill',
  'evidenceByOntologySource',
  'evidenceByDocument',
];

async function migrateIndexes() {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ MongoDB connected\n');

  const collection = mongoose.connection.db.collection('skillevidences');
  const existingIndexes = await collection.listIndexes().toArray();
  const existingNames = existingIndexes.map(idx => idx.name);

  console.log('Existing indexes:');
  existingIndexes.forEach(idx => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' [UNIQUE]' : ''}${idx.partialFilterExpression ? ' [PARTIAL]' : ''}`);
  });

  console.log('\nIndexes to keep:');
  KEEP_INDEXES.forEach(name => {
    console.log(`  - ${name}: ${existingNames.includes(name) ? 'EXISTS' : 'MISSING'}`);
  });

  console.log('\nObsolete/unsupported indexes to drop:');
  OBSOLETE_INDEXES.forEach(name => {
    const exists = existingNames.includes(name);
    console.log(`  - ${name}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  });

  let dropped = 0;

  for (const name of OBSOLETE_INDEXES) {
    if (existingNames.includes(name)) {
      try {
        await collection.dropIndex(name);
        console.log(`\n✓ Dropped obsolete index: ${name}`);
        dropped++;
      } catch (err: any) {
        console.error(`\n✗ Failed to drop index ${name}:`, err.message);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('INDEX MIGRATION SUMMARY');
  console.log(`   Dropped: ${dropped}`);
  console.log(`   Skipped: ${existingIndexes.length - dropped}`);
  console.log('\nNote: Unique constraints are enforced at the application layer');
  console.log('      by SkillEvidenceService.ingestEvidence() idempotency logic.');
  console.log('      MongoDB partial unique indexes with $exists conditions');
  console.log('      are not supported in this MongoDB version.');

  await mongoose.connection.close();
  process.exit(0);
}

migrateIndexes().catch(err => {
  console.error('Index migration failed:', err);
  mongoose.connection.close().then(() => process.exit(1));
});
