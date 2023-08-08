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
                publicURL
              }
              locale
              tags
            }
            html
          }
        }
      }
    `);
    return postsQuery.data.allMarkdownRemark.nodes;
  }

  function normalizeTag({ tag }) {
    return { id: tag.toLowerCase(), name: tag };
  }

  function normalizePostNodesToPosts(nodes) {
    return nodes.map((node) => ({
      id: node.fields.slug.split("/")[1],
      title: node.frontmatter.title,
      description: node.frontmatter.description,
      thumbnail:
        node.frontmatter.thumbnail != null
          ? {
              public: node.frontmatter.thumbnail?.publicURL,
              optimized: node.frontmatter.thumbnail?.childImageSharp.gatsbyImageData.images.fallback ?? null,
            }
          : null,
      locale: node.frontmatter.locale ?? "ko",
      tags: node.frontmatter.tags.map((tag) => normalizeTag({ tag })),
      url: `/${node.fields.slug.split("/")[1]}`,
      publishedAt: new Date(node.frontmatter.date).valueOf(),
      html: node.html,
    }));
  }

  function normalizePostsToPostsByLocale({ posts }) {
    const postsByLocale = {};

    posts.forEach((post) => {
      const locale = post.locale;
      if (postsByLocale[locale] == null) {
        postsByLocale[locale] = [post];
      } else {
        postsByLocale[locale].push(post);
      }
    });

    return postsByLocale;
  }

  function normalizePostsToPostsByTagId(posts) {
    const postsByTagId = {};

    posts.forEach((post) => {
      post.tags.map((tag) => {
        if (postsByTagId[tag.id] == null) {
          postsByTagId[tag.id] = [post];
        } else {
          postsByTagId[tag.id].push(post);
        }
      });
    });

    return postsByTagId;
  }

  function uniqBy(list, callback) {
    const map = {};
    list.forEach((item) => {
      const key = callback(item);
      if (map[key] == null) {
        map[key] = item;
      }
    });
    return Object.values(map);
  }

  function normalizePostsByTagIdToTags({ posts, postsByTagId }) {
    const tags = uniqBy(posts.map(({ tags }) => tags).flat(), (tag) => tag.id);
    return tags.map((tag) => ({ ...tag, numberOfPosts: postsByTagId[tag.id].length }));
  }

  function createKoPostPages({ posts }) {
    const PostPage = path.resolve(`./src/templates/post.tsx`);

    posts.forEach((post) => {
      createPage({
        path: post.url,
        component: PostPage,
        context: {
          og: {
            title: post.title,
            description: post.description,
            url: `https://blog.hoseung.me${post.url}`,
            thumbnail: post.thumbnail != null ? `https://blog.hoseung.me${post.thumbnail.public}` : undefined,
          },
          post,
          locale: "ko",
        },
      });
    });
  }

  function createKoTagPostsPages({ tags, postsByTagId }) {
    const PostsPage = path.resolve(`./src/templates/posts.tsx`);

    tags.forEach((tag) => {
      createPage({
        path: `/tags/${tag.id}`,
        component: PostsPage,
        context: {
          og: {
            title: `${tag.name} 태그의 포스트`,
            url: `https://blog.hoseung.me/tags/${encodeURIComponent(tag.id)}`,
          },
          allTags: tags,
          currentTag: tag,
          posts: postsByTagId[tag.id],
          locale: "ko",
        },
      });
    });
  }

  function createKoIndexPage({ posts, tags }) {
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
        locale: "ko",
      },
    });
  }

  function createKoPages({ posts }) {
    const postsByTagId = normalizePostsToPostsByTagId(posts);
    const tags = normalizePostsByTagIdToTags({ posts, postsByTagId });

    createKoIndexPage({ posts, tags });
    createKoPostPages({ posts });
    createKoTagPostsPages({ tags, postsByTagId });
  }

  function createEnPostPages({ posts }) {
    const PostPage = path.resolve(`./src/templates/post.tsx`);

    posts.forEach((post) => {
      createPage({
        path: `/en${post.url}`,
        component: PostPage,
        context: {
          og: {
            title: post.title,
            description: post.description,
            url: `https://blog.hoseung.me/en${post.url}`,
            thumbnail: post.thumbnail != null ? `https://blog.hoseung.me${post.thumbnail.public}` : undefined,
          },
          post,
          locale: "en",
        },
      });
    });
  }

  function createEnTagPostsPages({ tags, postsByTagId }) {
    const PostsPage = path.resolve(`./src/templates/posts.tsx`);

    tags.forEach((tag) => {
      createPage({
        path: `/en/tags/${tag.id}`,
        component: PostsPage,
        context: {
          og: {
            title: `Posts of ${tag.name} Tag`,
            url: `https://blog.hoseung.me/en/tags/${encodeURIComponent(tag.id)}`,
          },
          allTags: tags,
          currentTag: tag,
          posts: postsByTagId[tag.id],
          locale: "en",
        },
      });
    });
  }

  function createEnIndexPage({ posts, tags }) {
    const PostsPage = path.resolve(`./src/templates/posts.tsx`);

    createPage({
      path: `/en`,
      component: PostsPage,
      context: {
        og: {
          title: "Hoseung.me: development blog",
          description: "Do my best to write high-quality article",
        },
        allTags: tags,
        currentTag: null,
        posts,
        locale: "en",
      },
    });
  }

  function craeteEnPages({ posts }) {
    const postsByTagId = normalizePostsToPostsByTagId(posts);
    const tags = normalizePostsByTagIdToTags({ posts, postsByTagId });

    createEnIndexPage({ posts, tags });
    createEnPostPages({ posts });
    createEnTagPostsPages({ tags, postsByTagId });
  }

  const postNodes = await fetchPostNodes();

  if (postNodes.length === 0) {
    return;
  }

  const posts = normalizePostNodesToPosts(postNodes);
  const postsByLocale = normalizePostsToPostsByLocale({ posts });

  const koPosts = postsByLocale.ko;
  const enPosts = postsByLocale.en;

  createKoPages({ posts: koPosts });
  craeteEnPages({ posts: enPosts });
};
exports.onCreatePage = async ({ page, actions }) => {
  const { createPage, deletePage } = actions;

  if (page.path.match(/^\/[a-z]{2}\/404\/$/)) {
    const newPage = { ...page };
    const locale = page.path.split(`/`)[1];

    newPage.matchPath = `/${locale}/*`;

    deletePage(page);
    createPage(newPage);
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
