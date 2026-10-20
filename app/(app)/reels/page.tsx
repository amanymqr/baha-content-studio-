import { redirect } from "next/navigation";

// The reels studio now lives in the Content Creation Studio.
export default function Page() {
  redirect("/studio/new?format=reel");
}
