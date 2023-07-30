import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Link } from "gatsby";

import { Locale } from "../../models/locale";

import "../../styles/components/layout.scss";
import { path } from "../../utils/path";

export function Layout({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [ref, isScrollTop] = useInView({ initialInView: true });

  return (
    <>
      <div ref={ref} />
      <div className="component-layout">
        <header className={!isScrollTop ? "scrolled" : undefined}>
          <div className="content">
            <Link className="link-to-home" to={path("/", locale)}>
              <h1>hoseung.me</h1>
            </Link>
            <a className="link-to-about" href="https://about.hoseung.me">
              about
            </a>
            <a className="link-to-github" href="https://github.com/HoseungJang">
              github
            </a>
          </div>
        </header>
        <main>
          <div className="content">{children}</div>
        </main>
        <footer>
          <div className="content">
            <a href="https://github.com/HoseungJang">©HoseungJang</a>
          </div>
        </footer>
      </div>
    </>
  );
}
