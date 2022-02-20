import * as React from "react";
import { graphql, Link, PageProps } from "gatsby";

import Layout from "../components/layout";
import Seo from "../components/seo";
import Utterances from "../components/utterances";

import "../styles/templates/post.scss";

export default function ({ data }: PageProps<QueryResult>) {
  const post = data.markdownRemark;
  const thumbnail = post.frontmatter.thumbnail?.childImageSharp.gatsbyImageData.images.fallback;
  return (
    <Layout>
      <Seo
        title={post.frontmatter.title}
        description={post.frontmatter.description}
        url={`https://blog.hoseung.me${post.fields.slug}`}
        thumbnail={
          post.frontmatter.thumbnail ? `https://blog.hoseung.me${post.frontmatter.thumbnail.publicURL}` : undefined
        }
      />
      <article className="blog-post-wrapper" itemScope itemType="http://schema.org/Article">
        <header>
          <h1 className="title" itemProp="headline">
            {post.frontmatter.title}
          </h1>
          <p className="published-at">{post.frontmatter.date}</p>
          <ul className="tag-list">
            {post.frontmatter.tags.map((tag) => (
              <li key={tag} className="tag-list-item">
                <Link className="link" to={`/tags/${tag}`}>
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
          {thumbnail && (
            <img className="thumbnail" src={thumbnail.src} srcSet={thumbnail.srcSet} sizes={thumbnail.sizes} />
          )}
        </header>
        <section dangerouslySetInnerHTML={{ __html: post.html }} itemProp="articleBody" />
        <Utterances />
      </article>
    </Layout>
  );
}

interface QueryResult {
  markdownRemark: {
    html: string;
    fields: {
      slug: string;
    };
    frontmatter: {
      title: string;
      date: string;
      description: string;
      thumbnail: {
        publicURL: string;
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
  };
}

export const pageQuery = graphql`
  query ($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      fields {
        slug
      }
      frontmatter {
        title
        date(formatString: "YYYY년 M월 D일")
        description
        thumbnail {
          publicURL
          childImageSharp {
            gatsbyImageData
          }
        }
        tags
      }
    }
  }
`;
