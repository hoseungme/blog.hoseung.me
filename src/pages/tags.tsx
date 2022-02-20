import React from "react";
import { graphql, Link, PageProps } from "gatsby";

import { Tag } from "../models/tag";

import Layout from "../components/layout";
import Seo from "../components/seo";

import "../styles/pages/tags.scss";

export default function ({ data }: PageProps<QueryResult>) {
  const tags = React.useMemo<Tag[]>(() => {
    const countMap: { [k: string]: number } = {};
    data.allMarkdownRemark.nodes.forEach((node) =>
      node.frontmatter.tags.forEach((tag) => (countMap[tag] ? countMap[tag]++ : (countMap[tag] = 1)))
    );
    return Object.entries(countMap)
      .map(([name, numberOfPosts]) => ({ name, numberOfPosts }))
      .sort((a, b) => b.numberOfPosts - a.numberOfPosts);
  }, [data]);
  return (
    <Layout>
      <Seo title="태그 목록" url="https://blog.hoseung.me/tags" />
      <div className="tags-page-wrapper">
        <ul className="tag-list">
          {tags.map((tag) => (
            <li key={tag.name} className="tag-list-item">
              <Link className="link" to={`/tags/${tag.name}`}>
                <div className="name">{tag.name}</div>
                <div className="number-of-posts">{tag.numberOfPosts}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}

interface QueryResult {
  allMarkdownRemark: {
    nodes: {
      frontmatter: {
        tags: string[];
      };
    }[];
  };
}

export const pageQuery = graphql`
  query {
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      nodes {
        frontmatter {
          tags
        }
      }
    }
  }
`;
