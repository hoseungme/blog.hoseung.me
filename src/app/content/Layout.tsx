import Link from "next/link";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="w-full px-5 py-3 flex justify-center">
        <div className="max-w-[700px] w-full flex items-center font-mono">
          <Link className="mr-auto" href="/">
            <h1 className="text-xl text-gray-500">hoseung</h1>
          </Link>
          <a className="mr-3 text-blue-600" href="https://about.hoseung.me">
            about
          </a>
          <a className="text-blue-600" href="https://github.com/hoseungme">
            github
          </a>
        </div>
      </header>
      <main className="w-full flex justify-center px-5">
        <div className="max-w-[700px] w-full flex items-center">{children}</div>
      </main>
      <footer className="w-full flex justify-center px-4 py-16">
        <a className="text-gray-500" href="https://github.com/hoseungme">
          ©hoseungme
        </a>
      </footer>
    </>
  );
}
