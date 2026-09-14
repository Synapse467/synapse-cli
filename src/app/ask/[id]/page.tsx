import { LicensedAsk } from "@/components/public-pages";
export default async function AskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LicensedAsk id={id} />;
}
