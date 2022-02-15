import * as React from "react";
import { graphql } from "gatsby";

import Layout from "../components/layout";
import Seo from "../components/seo";

import "../styles/templates/post.scss";

export default function ({ data, location }: { data: QueryResult; location: any }) {
  const post = data.markdownRemark;
  return (
    <Layout>
      <Seo title={post.frontmatter.title} description={post.frontmatter.description} />
      <article className="blog-post" itemScope itemType="http://schema.org/Article">
        <header>
          <h1 itemProp="headline">{post.frontmatter.title}</h1>
          <p>{post.frontmatter.date}</p>
        </header>
        <section dangerouslySetInnerHTML={{ __html: post.html }} itemProp="articleBody" />
      </article>
    </Layout>
  );
}

interface QueryResult {
  markdownRemark: {
    html: string;
    frontmatter: {
      title: string;
      date: string;
      description: string;
      tags: string[];
    };
  };
}

export const pageQuery = graphql`
  query ($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      frontmatter {
        title
        date(formatString: "YYYY년 M월 D일")
        description
      }
    }
  }
`;
