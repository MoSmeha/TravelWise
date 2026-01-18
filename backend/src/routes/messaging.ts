import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All messaging routes require authentication
router.use(authenticate);

// Conversations
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:id', messageController.getConversation);
router.post('/conversations', messageController.createConversation);

// Messages within a conversation
router.get('/conversations/:id/messages', messageController.getMessages);
router.post('/conversations/:id/messages', messageController.sendMessage);

// Mark as read
router.put('/conversations/:id/read', messageController.markConversationRead);

export default router;
