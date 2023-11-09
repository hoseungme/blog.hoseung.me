import React from "react";
import { Link, PageProps } from "gatsby";

import { PostSummary } from "../models/post";
import { Tag } from "../models/tag";
import { Locale } from "../models/locale";

import { Layout } from "../components/Layout";
import { Seo, SeoProps } from "../components/Seo";
import { PostList } from "../components/PostList";

import { classNames } from "../utils/classNames";
import { path } from "../utils/path";

import "../styles/templates/posts.scss";

interface PageContext {
  og: SeoProps;
  allTags: Tag[];
  currentTag: Tag | null;
  posts: PostSummary[];
  locale: Locale;
}

export default function Page({ pageContext, location }: PageProps<{}, PageContext>) {
  const { og, allTags, currentTag, posts, locale } = pageContext;

  return (
    <Layout locale={locale}>
      <Seo {...og} />
      <div className="template-posts">
        <ul className="tag-list">
          <li className={classNames("tag-list-item", { selected: currentTag == null })}>
            <Link className="link" to={path("/", locale)}>
              <div className="name">{locale === "ko" ? "전체보기" : "All Posts"}</div>
            </Link>
          </li>
          {allTags.map((tag) => (
            <li key={tag.name} className={classNames("tag-list-item", { selected: currentTag?.id === tag.id })}>
              <Link className="link" to={path(`/tags/${encodeURIComponent(tag.id)}`, locale)}>
                <div className="name">#{tag.name}</div>
                <div className="number-of-posts">{tag.numberOfPosts}</div>
              </Link>
            </li>
          ))}
        </ul>
        <PostList posts={posts} pathname={location.pathname} />
      </div>
    </Layout>
  );
}
