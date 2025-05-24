import "github-markdown-css/github-markdown-light.css";
import "highlight.js/styles/github.css";
import "./style.scss";

import { Post } from "@/models/post";
import { formatUTC } from "@/utils/date";
import { differenceInYears } from "date-fns";
import hljs from "highlight.js";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Utterances } from "./Utterances";

export function Page({ post }: { post: Post }) {
  const years = differenceInYears(Date.now(), post.publishedAt);

  return (
    <article className="w-full" itemScope itemType="http://schema.org/Article">
      <header className="mt-4">
        <h1 className="text-3xl font-bold mb-3" itemProp="headline">
          {post.title}
        </h1>
        <p className="text-gray-500 font-mono">{formatUTC(post.publishedAt, "PP")}</p>
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
          {years >= 1 ? `> 이 글을 쓴지 ${years}년이나 지났습니다. 누구에게나 흑역사는 있죠. 저도 이때의 제가 밉습니다. 😭\n\n` + post.content : post.content}
        </Markdown>
      </main>
      <Utterances />
    </article>
  );
}
