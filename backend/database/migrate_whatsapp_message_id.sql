-- Migration: Add whatsapp_message_id column to messages table
-- Run this once to enable WhatsApp message deduplication

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(100) NULL AFTER id;

-- Optional: add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id
  ON messages (whatsapp_message_id);
