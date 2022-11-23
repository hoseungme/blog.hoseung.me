const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.createPages = async ({ graphql, actions: { createPage } }) => {
  async function fetchPostNodes() {
    const postsQuery = await graphql(`
      query {
        allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
          nodes {
            fields {
              slug
            }
            frontmatter {
              title
              date
              description
              thumbnail {
                childImageSharp {
                  gatsbyImageData
                }
              }
              tags
            }
            html
          }
        }
      }
    `);
    return postsQuery.data.allMarkdownRemark.nodes;
  }

  function normalizePostNodesToPosts(nodes) {
    return nodes.map((node) => ({
      id: node.fields.slug,
      title: node.frontmatter.title,
      description: node.frontmatter.description,
      thumbnail:
        node.frontmatter.thumbnail != null
          ? {
              public: node.frontmatter.thumbnail?.publicURL,
              optimized: node.frontmatter.thumbnail?.childImageSharp.gatsbyImageData.images.fallback ?? null,
            }
          : null,
      tags: node.frontmatter.tags,
      url: node.fields.slug,
      publishedAt: new Date(node.frontmatter.date).valueOf(),
      html: node.html,
    }));
  }

  function createPostPages({ posts }) {
    const PostPage = path.resolve(`./src/templates/post.tsx`);

    posts.forEach((post) => {
      createPage({
        path: post.id,
        component: PostPage,
        context: {
          og: {
            title: post.title,
            description: post.description,
            url: `https://blog.hoseung.me${post.id}`,
            thumbnail: post.thumbnail != null ? `https://blog.hoseung.me${post.thumbnail.public}` : undefined,
          },
          post,
        },
      });
    });
  }

  function normalizePostsToPostsByTagName(posts) {
    const postsByTagName = {};

    posts.forEach((post) => {
      post.tags.map((tagName) => {
        if (postsByTagName[tagName] == null) {
          postsByTagName[tagName] = [post];
        } else {
          postsByTagName[tagName].push(post);
        }
      });
    });

    return postsByTagName;
  }

  function normalizePostsByTagNameToTags(postsByTagName) {
    return Object.entries(postsByTagName).map(([tagName, posts]) => ({ name: tagName, numberOfPosts: posts.length }));
  }

  function createTagPostsPages({ tags, postsByTagName }) {
    const PostsPage = path.resolve(`./src/templates/posts.tsx`);

    tags.forEach((tag) => {
      createPage({
        path: `/tags/${tag.name}`,
        component: PostsPage,
        context: {
          og: {
            title: `${tag.name} 태그의 포스트`,
            url: `https://blog.hoseung.me/tags/${encodeURIComponent(tag.name)}`,
          },
          allTags: tags,
          currentTag: tag,
          posts: postsByTagName[tag.name],
        },
      });
    });
  }

  function createIndexPage({ posts, tags }) {
    const PostsPage = path.resolve(`./src/templates/posts.tsx`);

    createPage({
      path: `/`,
      component: PostsPage,
      context: {
        og: {
          title: "장호승 기술 블로그",
          description: "글을 잘 쓰고 싶어요",
        },
        allTags: tags,
        currentTag: null,
        posts,
      },
    });
  }

  const postNodes = await fetchPostNodes();

  if (postNodes.length === 0) {
    return;
  }

  const posts = normalizePostNodesToPosts(postNodes);

  createPostPages({ posts });

  const postsByTagName = normalizePostsToPostsByTagName(posts);
  const tags = normalizePostsByTagNameToTags(postsByTagName);

  createTagPostsPages({ tags, postsByTagName });
  createIndexPage({ posts, tags });
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
