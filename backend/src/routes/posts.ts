import { Router } from 'express';
import { PostController } from '../controllers/post.controller.js';
import { validate } from '../middleware/validate.js';
import { singleImageUpload } from '../middleware/upload.middleware.js';
import {
  createPostSchema,
  postIdParamSchema,
  userIdParamSchema,
  addCommentSchema,
} from '../schemas/post.schema.js';

const router = Router();

// Post CRUD
router.post('/', singleImageUpload, validate(createPostSchema), PostController.createPost);
router.get('/feed', PostController.getFeed);
router.get('/discover', PostController.getPublicFeed);
router.get('/user/:userId', validate(userIdParamSchema, 'params'), PostController.getUserPosts);
router.get('/:id', validate(postIdParamSchema, 'params'), PostController.getPost);
router.delete('/:id', validate(postIdParamSchema, 'params'), PostController.deletePost);

// Likes
router.post('/:id/like', validate(postIdParamSchema, 'params'), PostController.likePost);
router.delete('/:id/like', validate(postIdParamSchema, 'params'), PostController.unlikePost);
router.get('/:id/likes', validate(postIdParamSchema, 'params'), PostController.getPostLikes);

// Comments
router.post(
  '/:id/comments',
  validate(postIdParamSchema, 'params'),
  validate(addCommentSchema),
  PostController.addComment
);
router.get('/:id/comments', validate(postIdParamSchema, 'params'), PostController.getPostComments);
router.delete(
  '/:id/comments/:commentId',
  validate(postIdParamSchema, 'params'),
  PostController.deleteComment
);

export default router;
