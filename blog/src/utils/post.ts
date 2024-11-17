import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Post, PostSummary } from "@/models/post";

export function getPosts(): PostSummary[] {
  const dir = readdirSync(join(process.cwd(), "src/posts"));
  const posts = dir.filter((file) => !file.startsWith(".")).sort((a, b) => (a < b ? 1 : -1));
  return posts.map(getPostSummary);
}

function getPostSummary(id: string): PostSummary {
  const post = getPost(id);
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
  };
}

export function getPost(id: string): Post {
  const file = readFileSync(join(process.cwd(), "src/posts", id, "index.md")).toString();
  const { metadata, content } = parsePost(file);

  return {
    id,
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

function parsePost(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  let match = frontmatterRegex.exec(fileContent);
  let frontMatterBlock = match![1];
  let content = fileContent.replace(frontmatterRegex, "").trim();
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
