import { getMeetings } from "@/lib/knowledge-base";
import { MeetingsPageClient } from "./meetings-client";

export default async function MeetingsPage() {
  const meetings = await getMeetings();
  return <MeetingsPageClient meetings={meetings} />;
}
