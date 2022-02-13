import * as React from "react";
import { Link } from "gatsby";

export default function ({ location, children }) {
  const isRootPath = location.pathname === "/";

  return (
    <div className="global-wrapper" data-is-root-path={isRootPath}>
      <header className="global-header">
        {isRootPath ? (
          <h1 className="main-heading">
            <Link to="/">장호승 개발 블로그 😎</Link>
          </h1>
        ) : (
          <Link className="sub-heading" to="/">
            장호승 개발 블로그 😎
          </Link>
        )}
      </header>
      <main>{children}</main>
      <footer>
        © {new Date().getFullYear()}, Built with
        {` `}
        <a href="https://www.gatsbyjs.com">Gatsby</a>
      </footer>
    </div>
  );
}
