import { EzoneSessionProvider } from './src/modules/ezone/providers/ezone-session.provider';
import { EzoneSyncService } from './src/modules/ezone/services/ezoneSyncService';
import { EzoneRepository } from './src/modules/ezone/repositories/ezone.repository';
import { EzoneScraper } from './src/modules/ezone/scrapers/ezone.scraper';

async function run() {
  console.log('SCRIPT: Starting Ezone sync test...');
  
  const provider = EzoneSessionProvider.getInstance();
  const scraper = new EzoneScraper();
  const repository = new EzoneRepository();
  const syncService = new EzoneSyncService(provider, repository, scraper);

  try {
    console.log('SCRIPT: Calling verifyAndSync...');
    const result = await syncService.verifyAndSync(
      '2023329421',
      '6a58b65d816b680ebffb8b89',
      '6a58b59aa8c379340d290b31',
      '123456',
      undefined
    );
    console.log('SCRIPT: SYNC SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('SCRIPT: SYNC FAILED:', err);
    process.exit(1);
  }
}

run();
