const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  const Post = path.resolve(`./src/templates/post.tsx`);
  const postResult = await graphql(
    `
      {
        allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
          nodes {
            id
            fields {
              slug
            }
          }
        }
      }
    `
  );
  const posts = postResult.data.allMarkdownRemark.nodes;
  if (posts.length > 0) {
    posts.forEach((post) => {
      createPage({
        path: post.fields.slug,
        component: Post,
        context: { id: post.id },
      });
    });
  }

  const Tag = path.resolve(`./src/templates/tag.tsx`);
  const tagResult = await graphql(
    `
      {
        allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
          nodes {
            frontmatter {
              tags
            }
          }
        }
      }
    `
  );
  const tags = tagResult.data.allMarkdownRemark.nodes.map((node) => node.frontmatter.tags).flat();
  if (tags.length > 0) {
    tags.forEach((tag) => {
      createPage({
        path: `/tags/${tag}`,
        component: Tag,
        context: { tag },
      });
    });
  }
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode });

    createNodeField({
      name: `slug`,
      node,
      value,
    });
  }
};
