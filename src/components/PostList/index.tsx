import { format } from "date-fns";
import React from "react";
import { useInView } from "react-intersection-observer";
import { Link } from "gatsby";
import { wrapSessionStorage } from "storage-cover";

import { Post } from "../../models/post";

import { path } from "../../utils/path";

import "../../styles/components/post-list.scss";

const sessionStorage = wrapSessionStorage();

export function PostList({ posts, pathname }: { posts: Post[]; pathname: string }) {
  const [ref, inView] = useInView();

  const [fetchedCount, fetchMore] = React.useReducer((prev) => {
    const next = prev + 1;
    sessionStorage.set(`POST_FETCHED_COUNT${pathname}`, next);
    return next;
  }, sessionStorage.get(`POST_FETCHED_COUNT${pathname}`) ?? 0);

  const slicedPosts = React.useMemo(() => posts.slice(0, 10 * (fetchedCount + 1)), [posts, fetchedCount]);

  React.useEffect(() => {
    if (inView) {
      fetchMore();
    }
  }, [inView]);

  return (
    <>
      <ul className="component-post-list">
        {slicedPosts.map((post) => (
          <li key={post.url} className="post-list-item">
            <Link to={path(post.url, post.locale)} itemProp="url">
              {post.thumbnail && (
                <div className="responsive-thumbnail">
                  <div className="padding" />
                  <div className="content">
                    <img
                      className="thumbnail"
                      src={post.thumbnail.optimized.src}
                      srcSet={post.thumbnail.optimized.srcSet}
                      sizes={post.thumbnail.optimized.sizes}
                    />
                  </div>
                </div>
              )}
              <h2 className="title">
                <span itemProp="headline">{post.title}</span>
              </h2>
              <p className="published-at">
                {format(post.publishedAt, post.locale === "ko" ? "yyyy년 M월 d일" : "yyyy-MM-dd")}
              </p>
              <p className="description">{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div ref={ref} />
    </>
  );
}
