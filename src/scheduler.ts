import cron from 'node-cron';
import { runPipeline } from './pipeline';
import { logger } from './utils/logger';

cron.schedule(
  '0 9 * * *',
  () => runPipeline('morning').catch((e) => logger.error(e)),
  { timezone: 'UTC' }
);

cron.schedule(
  '0 18 * * *',
  () => runPipeline('evening').catch((e) => logger.error(e)),
  { timezone: 'UTC' }
);

logger.info('Scheduler started. Waiting for 09:00 and 18:00 UTC...');
