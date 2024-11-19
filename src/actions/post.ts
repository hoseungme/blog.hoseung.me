"use server";

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { Post, PostSummary } from "@/models/post";

export async function getPosts({ limit, offset }: { limit: number; offset: number }): Promise<PostSummary[]> {
  return posts.slice(offset, offset + limit).map((post) => ({
    id: post.id,
    thumbnailURL: post.thumbnailURL,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
  }));
}

export async function getPost(id: string): Promise<Post> {
  const post = postById.get(id);
  if (!post) {
    throw new Error("Post doesn't exist");
  }
  return post;
}

const posts = readdirSync(join(process.cwd(), "posts"))
  .filter((filename) => !filename.startsWith("."))
  .map((filename) => readPost(filename))
  .sort((a, b) => b.publishedAt - a.publishedAt);

const postById = new Map(posts.map((post) => [post.id, post]));

function readPost(id: string): Post {
  const markdown = readFileSync(join(process.cwd(), "posts", id, "index.md")).toString();
  const { metadata, content } = parsePostMarkdown(markdown);

  return {
    id,
    thumbnailURL: readPostThumbnailURL(id),
    title: metadata.title,
    description: metadata.description,
    content,
    publishedAt: new Date(metadata.date).valueOf(),
  };
}

function readPostThumbnailURL(id: string) {
  const dirPath = join(process.cwd(), "public/images/posts", id);
  if (!existsSync(dirPath)) {
    return null;
  }

  const thumbnailFilename = readdirSync(dirPath).find((filename) => filename.startsWith("thumbnail."));
  if (!thumbnailFilename) {
    return null;
  }

  return `/images/posts/${id}/${thumbnailFilename}`;
}

interface Metadata {
  title: string;
  description: string;
  date: string;
}

function parsePostMarkdown(markdown: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  let match = frontmatterRegex.exec(markdown);
  let frontMatterBlock = match![1];
  let content = markdown.replace(frontmatterRegex, "").trim();
  let frontMatterLines = frontMatterBlock.trim().split("\n");
  let metadata: Partial<Metadata> = {};

  frontMatterLines.forEach((line) => {
    let [key, ...valueArr] = line.split(": ");
    let value = valueArr.join(": ").trim();
    value = value.replace(/^['"](.*)['"]$/, "$1");
    metadata[key.trim() as keyof Metadata] = value;
  });

  return { metadata: metadata as Metadata, content };
}
