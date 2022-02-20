export interface Post {
  title: string;
  description: string;
  thumbnail: {
    src: string;
    srcSet: string;
    sizes: string;
  } | null;
  tags: string[];
  url: string;
  publishedAt: string;
}
