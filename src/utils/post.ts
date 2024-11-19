import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { Post, PostSummary } from "@/models/post";

export function getPosts(): PostSummary[] {
  const dir = readdirSync(join(process.cwd(), "posts"));
  const posts = dir.filter((file) => !file.startsWith(".")).sort((a, b) => (a < b ? 1 : -1));
  return posts.map(getPostSummary);
}

function getPostSummary(id: string): PostSummary {
  const post = getPost(id);

  return {
    id: post.id,
    thumbnailURL: post.thumbnailURL,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
  };
}

export function getPost(id: string): Post {
  const markdown = readFileSync(join(process.cwd(), "posts", id, "index.md")).toString();
  const { metadata, content } = parsePostMarkdown(markdown);

  return {
    id,
    thumbnailURL: getPostThumbnailURL(id),
    title: metadata.title,
    description: metadata.description,
    content,
    publishedAt: new Date(metadata.date).valueOf(),
  };
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

function getPostThumbnailURL(id: string) {
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
