import React from "react";
import { Link, graphql } from "gatsby";
import dayjs from "dayjs";

import Layout from "../components/layout";
import Seo from "../components/seo";

import "../styles/pages/index.scss";

const BlogIndex = ({ data, location }) => {
  const posts = data.allMarkdownRemark.nodes;

  return (
    <Layout location={location}>
      <Seo title="Home | blog.hoseung.me" />
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.fields.slug} className="post-list-item">
            <Link to={post.fields.slug} itemProp="url">
              <article itemScope itemType="http://schema.org/Article">
                <header>
                  <h2 className="title">
                    <span itemProp="headline">{post.frontmatter.title}</span>
                  </h2>
                  <p className="published-at">{dayjs(post.frontmatter.date).format("YYYY년 M월 D일")}</p>
                </header>
                <section>
                  <p className="description">{post.frontmatter.description || post.excerpt}</p>
                </section>
              </article>
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
};

export default BlogIndex;

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      nodes {
        excerpt
        fields {
          slug
        }
        frontmatter {
          date(formatString: "MMMM DD, YYYY")
          title
          description
        }
      }
    }
  }
`;
