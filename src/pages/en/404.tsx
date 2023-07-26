import * as React from "react";
import { Link } from "gatsby";

import { Layout } from "../../components/Layout";
import { Seo } from "../../components/Seo";

import "../../styles/pages/404.scss";

export default function Page() {
  return (
    <Layout locale="en">
      <Seo title="Not Found" />
      <div className="page-404">
        <img className="image" src="/404.png" alt="404 NOT FOUND" />
        <p className="message">Not Found</p>
        <div className="links">
          <Link className="link-to-home" to="/en">
            Go to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
