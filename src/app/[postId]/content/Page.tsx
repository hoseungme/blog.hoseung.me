import "github-markdown-css/github-markdown-dark.css";
import "./style.scss";

import { Post } from "@/models/post";
import { formatUTC } from "@/utils/date";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Utterances } from "./Utterances";

export function Page({ post }: { post: Post }) {
  return (
    <article className="w-full" itemScope itemType="http://schema.org/Article">
      <header className="mt-4">
        <h1 className="text-3xl font-bold mb-1" itemProp="headline">
          {post.title}
        </h1>
        <p>{formatUTC(post.publishedAt, "yyyy-MM-dd")}</p>
      </header>
      <main className="my-8">
        <Markdown className="markdown-body" rehypePlugins={[rehypeRaw]}>
          {post.content}
        </Markdown>
      </main>
      <Utterances />
    </article>
  );
}
