import { PostSummary } from "@/models/post";
import { format } from "date-fns";
import Link from "next/link";

export function Page({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="w-full flex flex-col m-0 p-0">
      {posts.map((post) => (
        <li key={post.id} className="py-4">
          <Link href={`/${post.id}`}>
            <h2 className="text-xl mb-1 font-semibold">{post.title}</h2>
            <p className="font-light">{format(post.publishedAt, "yyyy-MM-dd")}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
