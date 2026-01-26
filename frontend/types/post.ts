export type {
  PostVisibility,
  PostAuthor,
  Post,
  Comment,
  LikeUser,
  Like,
  CreatePostInput,
} from './schemas';


export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
