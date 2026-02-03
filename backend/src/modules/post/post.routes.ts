import { Router } from 'express';
import {
  createPost,
  getFeed,
  getPublicFeed,
  getUserPosts,
  getPost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes,
  addComment,
  getPostComments,
  deleteComment,
} from './post.controller.js';
import { validate } from '../../middleware/validate.js';
import { singleImageUpload } from '../../middleware/upload.middleware.js';
import {
  createPostSchema,
  postIdParamSchema,
  userIdParamSchema,
  addCommentSchema,
  deleteCommentSchema,
} from './post.schema.js';

const router = Router();


router.post('/', singleImageUpload, validate(createPostSchema), createPost);
router.get('/feed', getFeed);
router.get('/discover', getPublicFeed);
router.get('/user/:userId', validate(userIdParamSchema, 'params'), getUserPosts);
router.get('/:id', validate(postIdParamSchema, 'params'), getPost);
router.delete('/:id', validate(postIdParamSchema, 'params'), deletePost);


router.post('/:id/like', validate(postIdParamSchema, 'params'), likePost);
router.delete('/:id/like', validate(postIdParamSchema, 'params'), unlikePost);
router.get('/:id/likes', validate(postIdParamSchema, 'params'), getPostLikes);


router.post(
  '/:id/comments',
  validate(postIdParamSchema, 'params'),
  validate(addCommentSchema),
  addComment
);
router.get('/:id/comments', validate(postIdParamSchema, 'params'), getPostComments);
router.delete(
  '/:id/comments/:commentId',
  validate(deleteCommentSchema, 'params'),
  deleteComment
);

export default router;
