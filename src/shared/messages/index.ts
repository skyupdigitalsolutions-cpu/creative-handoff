// File: src/shared/messages/index.ts

import { FD_MESSAGES } from './fd.js';
import { GEN_MESSAGES } from './gen.js';

/**
 * Message catalogue (BPD §25). User-facing text is only ever produced from a message ID
 * (BPD §1.4 rule 2). Each module adds its own prefix file (AU, WS, MB, PR, UP…) here as it lands.
 */
export const MESSAGES = {
  ...GEN_MESSAGES,
  ...FD_MESSAGES,
} as const;

export type MessageId = keyof typeof MESSAGES;
export type MessageParams = Record<string, string | number>;

export function isMessageId(value: string): value is MessageId {
  return Object.hasOwn(MESSAGES, value);
}

/** Fill {placeholders} in a message. Unknown placeholders are left as-is so gaps are visible. */
export function formatMessage(id: MessageId, params: MessageParams = {}): string {
  return MESSAGES[id].replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(params, key) ? String(params[key]) : match,
  );
}
