import React from "react";
import { Link } from "gatsby";

import { Post } from "../models/post";

import "../styles/pages/index.scss";

export default function (post: Post) {
  return (
    <Link to={post.url} itemProp="url">
      <article className="post-container" itemScope itemType="http://schema.org/Article">
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
  );
}
