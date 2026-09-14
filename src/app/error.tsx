"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="not-found">
      <span className="eyebrow">SOMETHING DIDN’T CONNECT</span>
      <h1>Let’s try that again.</h1>
      <p>
        The page couldn’t finish loading. Your saved work remains in its
        workspace.
      </p>
      <button className="button button-dark" onClick={reset}>
        Reload this page
      </button>
    </main>
  );
}
