import React from "react";
import { graphql } from "gatsby";

import Layout from "../components/layout";
import Seo from "../components/seo";
import Post from "../components/post";

import "../styles/pages/index.scss";

export default function ({ data, location }: { data: QueryResult; location: any }) {
  const posts = data.allMarkdownRemark.nodes;
  return (
    <Layout location={location}>
      <Seo title="Home | blog.hoseung.me" />
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.fields.slug} className="post-list-item">
            <Post
              title={post.frontmatter.title}
              description={post.frontmatter.description}
              tags={post.frontmatter.tags}
              url={post.fields.slug}
              publishedAt={post.frontmatter.date}
            />
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
