import React from "react";
import { graphql, PageProps } from "gatsby";

import { Post } from "../models/post";

import Layout from "../components/layout";
import Seo from "../components/seo";
import PostList from "../components/post";

export default function ({ data, pageContext, location }: PageProps<QueryResult>) {
  const tag = (pageContext as any).tag;
  const posts = React.useMemo<Post[]>(() => {
    return data.allMarkdownRemark.nodes.map((node) => ({
      title: node.frontmatter.title,
      description: node.frontmatter.description,
      thumbnail: node.frontmatter.thumbnail?.childImageSharp.gatsbyImageData.images.fallback ?? null,
      tags: node.frontmatter.tags,
      url: node.fields.slug,
      publishedAt: node.frontmatter.date,
    }));
  }, [data]);
  return (
    <Layout>
      <Seo title={`${tag} 태그의 포스트`} url={`https://blog.hoseung.me/tags/${encodeURIComponent(tag)}`} />
      <PostList posts={posts} pathname={location.pathname} />
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
        thumbnail: {
          childImageSharp: {
            gatsbyImageData: {
              images: {
                fallback: {
                  src: string;
                  srcSet: string;
                  sizes: string;
                };
              };
            };
          };
        } | null;
        tags: string[];
      };
    }[];
  };
}

export const pageQuery = graphql`
  query ($tag: String!) {
    allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
      filter: { frontmatter: { tags: { in: [$tag] } } }
    ) {
      nodes {
        fields {
          slug
        }
        frontmatter {
          title
          date(formatString: "YYYY년 M월 D일")
          description
          thumbnail {
            childImageSharp {
              gatsbyImageData
            }
          }
          tags
        }
      }
    }
  }
`;
