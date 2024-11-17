import { getPost } from "@/utils/post";
import { Page } from "./content/Page";

export default async function Post({ params }: { params: Promise<{ postId: string }> }) {
  return <Page post={getPost((await params).postId)} />;
}
