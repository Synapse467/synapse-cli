import { Studio } from "@/components/studio";
export default async function StudioPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments } = await params;
  return <Studio segments={segments} />;
}
