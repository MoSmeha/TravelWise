import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, validateMultiple } from '../middleware/validate.js';
import {
  createConversationSchema,
  sendMessageSchema,
  paginationSchema,
  messagePaginationSchema,
  conversationIdSchema,
} from '../schemas/message.schema.js';

const router = Router();

// All messaging routes require authentication
router.use(authenticate);

// Conversations
router.get('/conversations', validate(paginationSchema, 'query'), messageController.getConversations);
router.get('/conversations/:id', validate(conversationIdSchema, 'params'), messageController.getConversation);
router.post('/conversations', validate(createConversationSchema), messageController.createConversation);

// Messages within a conversation
router.get(
  '/conversations/:id/messages',
  validateMultiple([
    { schema: conversationIdSchema, target: 'params' },
    { schema: messagePaginationSchema, target: 'query' },
  ]),
  messageController.getMessages
);
router.post(
  '/conversations/:id/messages',
  validateMultiple([
    { schema: conversationIdSchema, target: 'params' },
    { schema: sendMessageSchema, target: 'body' },
  ]),
  messageController.sendMessage
);

// Mark as read
router.put('/conversations/:id/read', validate(conversationIdSchema, 'params'), messageController.markConversationRead);

export default router;

