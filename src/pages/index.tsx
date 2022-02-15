import React from "react";
import { graphql, PageProps } from "gatsby";

import { Post } from "../models/post";

import Layout from "../components/layout";
import Seo from "../components/seo";
import PostList from "../components/post";

import "../styles/pages/index.scss";

export default function ({ data, location }: PageProps<QueryResult>) {
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
    <Layout>
      <Seo title="Home | blog.hoseung.me" />
      <PostList posts={posts} />
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
