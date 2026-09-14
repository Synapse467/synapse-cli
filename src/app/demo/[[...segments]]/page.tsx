import { Studio } from "@/components/studio";
export default async function DemoPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments } = await params;
  return <Studio segments={segments} demo />;
}
