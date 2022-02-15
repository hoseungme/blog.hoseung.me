import React from "react";
import { graphql } from "gatsby";

import { Post } from "../models/post";

import Layout from "../components/layout";
import Seo from "../components/seo";
import PostCard from "../components/post";

import "../styles/pages/index.scss";

export default function ({ data, location }: { data: QueryResult; location: any }) {
  const posts = React.useMemo<Post[]>(() => {
    return data.allMarkdownRemark.nodes.map((node) => ({
      title: node.frontmatter.title,
      description: node.frontmatter.description,
      tags: node.frontmatter.tags,
      url: node.fields.slug,
      publishedAt: node.frontmatter.date,
    }));
  }, [data]);
  return (
    <Layout location={location}>
      <Seo title="Home | blog.hoseung.me" />
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.url} className="post-list-item">
            <PostCard {...post} />
          </li>
        ))}
      </ul>
    </Layout>
  );
}

interface QueryResult {
  allMarkdownRemark: {
    nodes: {
      fields: {
        slug: string;
      };
      frontmatter: {
        title: string;
        date: string;
        description: string;
        tags: string[];
      };
    }[];
  };
}

export const pageQuery = graphql`
  query {
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      nodes {
        fields {
          slug
        }
        frontmatter {
          title
          date(formatString: "YYYY년 M월 D일")
          description
          tags
        }
      }
    }
  }
`;
