import "github-markdown-css/github-markdown-light.css";
import "highlight.js/styles/github.css";
import "./style.scss";

import { Post } from "@/models/post";
import { formatUTC } from "@/utils/date";
import hljs from "highlight.js";
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
        <Markdown
          className="markdown-body"
          rehypePlugins={[rehypeRaw]}
          components={{
            code: (props) => {
              return (
                <code
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlight(props.children?.toString() ?? "", {
                      language: props.className?.match(/language-(\w+)/)?.[1] ?? "text",
                    }).value,
                  }}
                />
              );
            },
          }}
        >
          {post.content}
        </Markdown>
      </main>
      <Utterances />
    </article>
  );
}
