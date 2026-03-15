import * as dotenv from 'dotenv';
import { db } from '../db';
import { resolveShortId, saveFeedback, getBotState, setBotState } from '../db/queries';
import { logger } from '../utils/logger';
import { config } from '../config';

dotenv.config();

const API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
const DELAY_MS = 3000;
const OFFSET_KEY = 'telegram_update_id';

async function fetchUpdates(offset: number) {
  try {
    const res = await fetch(`${API}/getUpdates?offset=${offset}&timeout=10`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as any;
    if (!data.ok) throw new Error(data.description || 'Telegram API Error');
    return data.result || [];
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch Telegram updates');
    return [];
  }
}

async function sendReply(chatId: string, replyToMessageId: number, text: string) {
  try {
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        reply_to_message_id: replyToMessageId,
        text,
      }),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to send reply');
  }
}

function handleCommand(text: string, messageId: number) {
  const match = text.trim().match(/^\/(save|applied|skip)\s+([a-zA-Z0-9]+)/i);
  if (!match) return;

  const action = match[1].toLowerCase();
  const shortId = match[2];

  const jobId = resolveShortId(shortId);
  if (!jobId) {
    // We do not fail hard, just notify user it's an invalid ID
    sendReply(config.TELEGRAM_CHAT_ID, messageId, `❌ Unknown Job ID: ${shortId}`);
    return;
  }

  try {
    saveFeedback(jobId, action);
    sendReply(config.TELEGRAM_CHAT_ID, messageId, `✅ Marked as ${action}`);
    logger.info({ action, shortId, jobId }, 'Saved user feedback');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed saving feedback to DB');
    sendReply(config.TELEGRAM_CHAT_ID, messageId, `❌ DB Error saving ${action}`);
  }
}

export async function runPoller() {
  logger.info('Telegram poller started');
  
  let currentOffset = parseInt(getBotState(OFFSET_KEY) || '0', 10);

  while (true) {
    const updates = await fetchUpdates(currentOffset);
    
    for (const update of updates) {
      if (update.update_id >= currentOffset) {
        currentOffset = update.update_id + 1;
        setBotState(OFFSET_KEY, currentOffset.toString());
      }
      
      const msg = update.message;
      if (
        msg &&
        msg.text &&
        String(msg.chat?.id) === config.TELEGRAM_CHAT_ID
      ) {
        handleCommand(msg.text, msg.message_id);
      }
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

// Allow direct execution for testing
if (require.main === module) {
  runPoller().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
