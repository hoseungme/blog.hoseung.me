import { Locale } from "./locale";

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
  tags: string[];
  url: string;
  publishedAt: number;
  html: string;
}
