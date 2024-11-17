import { Page } from "./content/Page";
import { getPosts } from "@/utils/post";

export default function Home() {
  return <Page posts={getPosts()} />;
}
