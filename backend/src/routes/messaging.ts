import { Router } from 'express';
import {
  getConversations,
  getConversation,
  createConversation,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../controllers/message.controller.js';
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


router.use(authenticate);


router.get('/conversations', validate(paginationSchema, 'query'), getConversations);
router.get('/conversations/:id', validate(conversationIdSchema, 'params'), getConversation);
router.post('/conversations', validate(createConversationSchema), createConversation);


router.get(
  '/conversations/:id/messages',
  validateMultiple([
    { schema: conversationIdSchema, target: 'params' },
    { schema: messagePaginationSchema, target: 'query' },
  ]),
  getMessages
);
router.post(
  '/conversations/:id/messages',
  validateMultiple([
    { schema: conversationIdSchema, target: 'params' },
    { schema: sendMessageSchema, target: 'body' },
  ]),
  sendMessage
);


router.put('/conversations/:id/read', validate(conversationIdSchema, 'params'), markConversationRead);

export default router;

