import { PublicCapsule } from "@/components/public-pages";
export default async function CapsulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicCapsule id={id} />;
}
