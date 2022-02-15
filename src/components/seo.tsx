import * as React from "react";
import { Helmet } from "react-helmet";
import { useStaticQuery, graphql } from "gatsby";

import { SiteMetadata } from "../models/site-metadata";

interface SeoProps {
  title?: string;
  description?: string;
  thumbnail?: string;
  url?: string;
}

export default function ({ title, description, thumbnail, url }: SeoProps) {
  const defaultMeta = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
            description
            thumbnail
            siteUrl
          }
        }
      }
    `
  ).site.siteMetadata as SiteMetadata;

  const meta = {
    title: title ?? defaultMeta.title,
    description: description ?? defaultMeta.description,
    thumbnail: thumbnail ?? `${defaultMeta.thumbnail}`,
    url: url ?? `${defaultMeta.siteUrl}${window.location.pathname}`,
  };

  return (
    <Helmet
      title={meta.title}
      titleTemplate={`%s | ${meta.title}`}
      link={[
        {
          rel: "canonical",
          href: meta.url,
        },
      ]}
      meta={[
        {
          name: "description",
          content: meta.description,
        },
        {
          property: "og:locale",
          content: "ko_KR",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:title",
          content: meta.title,
        },
        {
          property: "og:description",
          content: meta.description,
        },
        {
          property: "og:image",
          content: meta.thumbnail,
        },
        {
          property: "og:url",
          content: meta.url,
        },

        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:title",
          content: meta.title,
        },
        {
          name: "twitter:description",
          content: meta.description,
        },
        {
          name: "twitter:image",
          content: meta.thumbnail,
        },
      ]}
    />
  );
}
