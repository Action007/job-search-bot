import cron from 'node-cron';
import { runPipeline } from './pipeline';
import { runPoller } from './telegram/poller';
import { logger } from './utils/logger';

async function start() {
  logger.info('Scheduler and Poller starting. Waiting for 09:00 / 18:00 UTC and Telegram messages...');

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

  // V2: launch background interactive poller alongside the cron triggers
  await runPoller();
}

start().catch(err => {
  console.error("Fatal error starting scheduler:", err);
  process.exit(1);
});
