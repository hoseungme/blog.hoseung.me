"use client";

import { getPosts } from "@/actions/post";
import { PostSummary } from "@/models/post";
import { formatUTC } from "@/utils/date";
import Link from "next/link";
import { useState } from "react";
import { ImpressionArea } from "./ImpressionArea";

export function Page({ posts }: { posts: PostSummary[] }) {
  const postsQuery = usePostsQuery(posts);

  return (
    <ul className="w-full flex flex-col m-0 p-0">
      {postsQuery.data.map((post) => (
        <li key={post.id} className="py-4">
          <Link href={`/${post.id}`}>
            <h2 className="text-xl mb-1 font-semibold">{post.title}</h2>
            <p className="font-light">{formatUTC(post.publishedAt, "yyyy-MM-dd")}</p>
          </Link>
        </li>
      ))}
      {postsQuery.hasNext && (
        <ImpressionArea onImpressed={postsQuery.fetchMore}>
          <div style={{ height: 1 }} />
        </ImpressionArea>
      )}
    </ul>
  );
}

let cache: { data: PostSummary[]; hasNext: boolean } | null = null;

function usePostsQuery(initialPosts: PostSummary[]) {
  const fetchCount = initialPosts.length;
  const [data, setData] = useState(() => cache?.data ?? initialPosts);
  const [offset, setOffset] = useState(() => cache?.data.length ?? initialPosts.length);
  const [hasNext, setHasNext] = useState(() => cache?.hasNext ?? initialPosts.length === fetchCount);
  const [isFetching, setIsFetching] = useState(() => false);

  const fetchMore = async () => {
    if (isFetching) {
      return;
    }

    setIsFetching(true);

    const fetched = await getPosts({ limit: fetchCount, offset });
    const newData = [...data, ...fetched];
    const newHasNext = fetched.length === fetchCount;

    setData(newData);
    setOffset(fetched.length + offset);
    setHasNext(newHasNext);

    cache = { data: newData, hasNext: newHasNext };

    setIsFetching(false);
  };

  return {
    data,
    hasNext,
    fetchMore,
    isFetching,
  };
}
