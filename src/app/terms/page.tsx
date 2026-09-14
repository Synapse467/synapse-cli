import { PublicFrame } from "@/components/public-pages";
export default function Terms() {
  return (
    <PublicFrame>
      <main className="public-page-content legal-content">
        <span className="eyebrow">CLEAR EXPECTATIONS</span>
        <h1 style={{ marginTop: 25 }}>Using Synapse</h1>
        <p>
          These preview usage conditions explain the intended product
          boundaries. Commercial terms, operator identity, jurisdiction, and
          support policies require final review before public launch.
        </p>
        <h2>Share knowledge you have permission to share</h2>
        <p>
          Upload or publish material only when you have the necessary rights and
          permissions. Employment agreements, confidentiality obligations, and
          third-party rights still apply. Attribution and blockchain records do
          not create legal ownership.
        </p>
        <h2>Use each capsule within its license</h2>
        <p>
          Access grants define permitted purposes, audience, duration, usage
          limits, commercial use, derivative use, and AI-training permission.
          Access to ask questions is not permission for every other use.
        </p>
        <h2>Understand the answer</h2>
        <p>
          Synapse is an AI interface to approved capsule knowledge. It does not
          represent the expert speaking live. Review the cited source,
          conditions, and limitations when using an answer. Unsupported
          questions should not be answered as expert opinion.
        </p>
        <h2>Respect contributors and private material</h2>
        <p>
          Do not remove attribution, circumvent access controls, or attempt to
          retrieve unpublished or unauthorized knowledge. Preserve contributor
          identity when permitted reuse requires attribution.
        </p>
        <h2>Preview limitations</h2>
        <p>
          The interactive demo is a local simulation using synthetic data. Its
          extraction, evaluation results, publication records, and query
          retrieval are illustrative. It does not submit transactions, take
          payments, or establish real access agreements.
        </p>
      </main>
    </PublicFrame>
  );
}
