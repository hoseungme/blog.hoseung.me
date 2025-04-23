import { Metadata } from "next";
import { Page } from "./content/Page";
import { getPosts } from "@/actions/post";

export default async function Home() {
  return <Page initialPosts={await getPosts({ limit: 10, offset: 0 })} />;
}

const title = "hoseung.me";
const description = "장호승 기술 블로그";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
  alternates: {
    canonical: "https://blog.hoseung.me",
  },
};
