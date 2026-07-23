import { ApplicationDetailView } from "@/components/application-detail-view";

export default async function ApplicationDetailPage({
  params,
}: PageProps<"/historico/[id]">) {
  const { id } = await params;

  return <ApplicationDetailView id={id} />;
}
