import React from "react";
import { Link, PageProps } from "gatsby";

import { Post } from "../models/post";
import { Tag } from "../models/tag";

import { Layout } from "../components/Layout";
import { Seo, SeoProps } from "../components/Seo";
import { PostList } from "../components/PostList";

import "../styles/templates/posts.scss";
import { classNames } from "../utils/classNames";

interface PageContext {
  og: SeoProps;
  allTags: Tag[];
  currentTag: Tag | null;
  posts: Post[];
}

export default function Page({ pageContext, location }: PageProps<{}, PageContext>) {
  const { og, allTags, currentTag, posts } = pageContext;

  return (
    <Layout>
      <Seo {...og} />
      <div className="template-posts">
        <ul className="tag-list">
          <li className={classNames("tag-list-item", { selected: currentTag == null })}>
            <Link className="link" to={`/`}>
              <div className="name">전체보기</div>
            </Link>
          </li>
          {allTags.map((tag) => (
            <li key={tag.name} className={classNames("tag-list-item", { selected: currentTag?.name === tag.name })}>
              <Link className="link" to={`/tags/${tag.name}`}>
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
