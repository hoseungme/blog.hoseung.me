import { MetadataRoute } from "next";
import { getAllPosts } from "@/actions/post";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  return [
    {
      url: `https://blog.hoseung.me`,
      lastModified: new Date(posts[0].publishedAt),
      priority: 1,
    },
    ...posts.map((post) => ({
      url: `https://blog.hoseung.me/${post.id}`,
      lastModified: new Date(post.publishedAt),
      priority: 1,
    })),
  ];
}
