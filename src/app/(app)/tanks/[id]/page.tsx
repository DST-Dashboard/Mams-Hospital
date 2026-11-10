import { notFound } from "next/navigation";
import { TankDetailView } from "@/features/tank-detail/TankDetailView";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <TankDetailView id={id} />;
}
