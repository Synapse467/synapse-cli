import Link from "next/link";
import { Brand } from "@/components/brand";
export default function NotFound() {
  return (
    <main className="not-found">
      <Brand />
      <h1>Lost the thread?</h1>
      <p>This page isn’t here. Let’s get you back to something useful.</p>
      <Link href="/" className="button button-dark">
        Back to Synapse ↗
      </Link>
    </main>
  );
}
