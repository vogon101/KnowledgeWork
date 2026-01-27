import { BrowseView } from "@/components/browse";

interface Props {
  params: Promise<{
    path: string[];
  }>;
}

export const dynamic = "force-dynamic";

export default async function BrowsePath({ params }: Props) {
  const { path: pathSegments } = await params;
  const relativePath = pathSegments.join("/");

  return <BrowseView path={relativePath} showSidebar={true} />;
}
