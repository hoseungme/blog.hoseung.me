import Link from "next/link";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="w-full sticky top-0 left-0 right-0 z-[9999] px-5 py-4 flex justify-center backdrop-blur-md">
        <div className="max-w-[700px] w-full flex items-center">
          <Link className="mr-auto" href="/">
            <h1 className="text-xl font-bold">hoseung.me</h1>
          </Link>
          <a className="mr-3 text-base" href="https://about.hoseung.me">
            about
          </a>
          <a className="text-base" href="https://github.com/hoseungme">
            github
          </a>
        </div>
      </header>
      <main className="w-full flex justify-center px-5 mt-1">
        <div className="max-w-[700px] w-full flex items-center">{children}</div>
      </main>
      <footer className="w-full flex justify-center px-4 py-16">
        <a className="font-bold" href="https://github.com/hoseungme">
          ©hoseungme
        </a>
      </footer>
    </>
  );
}
