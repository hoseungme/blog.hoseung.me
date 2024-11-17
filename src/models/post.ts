export interface Post {
  id: string;
  title: string;
  description: string;
  content: string;
  publishedAt: number;
}

export type PostSummary = Omit<Post, "content">;
