import { redirect } from "next/navigation";

// The carousel studio now lives in the Content Creation Studio.
export default function Page() {
  redirect("/studio/new?format=carousel");
}
