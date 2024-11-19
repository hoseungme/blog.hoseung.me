export interface Post {
  id: string;
  thumbnailURL: string | null;
  title: string;
  description: string;
  content: string;
  publishedAt: number;
}

export type PostSummary = Omit<Post, "content">;
