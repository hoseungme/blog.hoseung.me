import { Locale } from "./locale";
import { Tag } from "./tag";

export interface Post {
  id: string;
  title: string;
  description: string;
  thumbnail: {
    public: string;
    optimized: {
      src: string;
      srcSet: string;
      sizes: string;
    };
  } | null;
  locale: Locale;
  tags: Omit<Tag, "numberOfPosts">[];
  url: string;
  publishedAt: number;
  html: string;
}
