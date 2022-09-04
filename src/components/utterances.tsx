import React from "react";

export default function () {
  const root = React.createRef<HTMLDivElement>();

  React.useEffect(() => {
    const element = document.createElement("script");

    element.setAttribute("src", "https://utteranc.es/client.js");
    element.setAttribute("repo", "HoseungJang/blog.hoseung.me");
    element.setAttribute("issue-term", "pathname");
    element.setAttribute("label", "comment");
    element.setAttribute("theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "github-dark" : "github-light");
    element.setAttribute("crossorigin", "anonymous");
    element.async = true;

    root.current?.appendChild(element);
  }, []);

  return <div ref={root} />;
}
