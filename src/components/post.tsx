import React from "react";
import { useInView } from "react-intersection-observer";
import { Link } from "gatsby";

import { Post } from "../models/post";

import { Storage } from "../utils/storage";

import "../styles/components/post.scss";

export default function ({ posts, pathname }: { posts: Post[]; pathname: string }) {
  const [ref, inView] = useInView();

  const [fetchedCount, fetchMore] = React.useReducer((prev) => {
    const next = prev + 1;
    Storage.session.set(`POST_FETCHED_COUNT${pathname}`, next);
    return next;
  }, Storage.session.get(`POST_FETCHED_COUNT${pathname}`) ?? 0);

  const slicedPosts = React.useMemo(() => posts.slice(0, 10 * (fetchedCount + 1)), [posts, fetchedCount]);

  React.useEffect(() => {
    if (inView) {
      fetchMore();
    }
  }, [inView]);

  return (
    <>
      <ul className="post-list">
        {slicedPosts.map((post) => (
          <li key={post.url} className="post-list-item">
            <Link to={post.url} itemProp="url">
              <article itemScope itemType="http://schema.org/Article">
                <header>
                  {post.thumbnail && (
                    <div className="responsive-thumbnail-wrapper">
                      <div className="padding" />
                      <div className="content">
                        <img className="thumbnail" src={post.thumbnail.src} />
                      </div>
                    </div>
                  )}
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
      <div ref={ref} />
    </>
  );
}
