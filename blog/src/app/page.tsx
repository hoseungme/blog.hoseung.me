import { Metadata } from "next";
import { Page } from "./content/Page";
import { getPosts } from "@/utils/post";

export default function Home() {
  return <Page posts={getPosts()} />;
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
};
