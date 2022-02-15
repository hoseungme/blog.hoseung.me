import * as React from "react";
import { Link } from "gatsby";

import Layout from "../components/layout";
import Seo from "../components/seo";

import "../styles/pages/404.scss";

const NotFoundPage = () => {
  return (
    <Layout>
      <Seo title="Not Found" />
      <div className="error-404-wrapper">
        <img className="image" src="/404.png" alt="404 NOT FOUND" />
        <p className="message">아무 것도 없어요..</p>
        <Link className="link-to-home" to="/">홈으로</Link>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
