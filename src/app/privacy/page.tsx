import { PublicFrame } from "@/components/public-pages";
export default function Privacy() {
  return (
    <PublicFrame>
      <main className="public-page-content legal-content">
        <span className="eyebrow">YOUR KNOWLEDGE, HANDLED WITH INTENTION</span>
        <h1 style={{ marginTop: 25 }}>Privacy & data controls</h1>
        <p>
          This development preview demonstrates how Synapse handles expertise.
          Deployment-specific operator details, retention periods, provider
          disclosures, and a privacy contact must be finalised before accepting
          live customer data.
        </p>
        <h2>The interactive demo</h2>
        <p>
          The demo uses fictional people and sample knowledge. Changes you make
          in demo mode are saved in this browser’s local storage. Use “Reset” in
          the demo banner to remove that saved demo workspace. Do not enter
          confidential information into the demo.
        </p>
        <h2>Your source material</h2>
        <p>
          In the connected product, source documents, interview recordings,
          transcripts, and unpublished insights are private content. Source
          access and queries are mediated by the API’s authorization and
          licensing checks. Knowledge becomes available to licensees only
          through an approved published version.
        </p>
        <h2>AI training is a separate permission</h2>
        <p>
          Permission to ask a capsule questions does not grant permission to use
          its contents for AI model training. Each license has an explicit
          AI-training setting, disabled by default.
        </p>
        <h2>Proofs without private content</h2>
        <p>
          Blockchain records are intended for opaque identifiers, version
          hashes, license attestations, and optional usage or settlement proofs.
          Source documents, transcripts, and question text do not belong
          on-chain.
        </p>
        <h2>Control and history</h2>
        <p>
          Revoking access stops future queries under the revoked grant.
          Published version manifests preserve the history of approved
          knowledge; corrections create new versions. Deletion and retention
          policies must account for this distinction.
        </p>
      </main>
    </PublicFrame>
  );
}
