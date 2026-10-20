import { redirect } from "next/navigation";

/** The drafts list moved into the content library in step 5; old links keep working. */
export default async function StudioPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  redirect(status ? `/library?status=${encodeURIComponent(status)}` : "/library");
}
