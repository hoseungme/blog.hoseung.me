import React from "react";
import { Link } from "gatsby";

import { Post } from "../models/post";

import "../styles/components/post.scss";

export default function ({ posts }: { posts: Post[] }) {
  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.url} className="post-list-item">
          <Link to={post.url} itemProp="url">
            <article itemScope itemType="http://schema.org/Article">
              <header>
                <h2 className="title">
                  <span itemProp="headline">{post.title}</span>
                </h2>
                <p className="published-at">{post.publishedAt}</p>
              </header>
              <section>
                <p className="description">{post.description}</p>
              </section>
            </article>
          </Link>
        </li>
      ))}
    </ul>
  );
}
