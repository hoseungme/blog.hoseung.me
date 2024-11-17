import { getPost } from "@/utils/post";
import { Page } from "./content/Page";
import { Metadata } from "next";

interface Props {
  params: Promise<{ postId: string }>;
}

export default async function Post({ params }: Props) {
  return <Page post={getPost((await params).postId)} />;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).postId);

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
    },
  };
}
