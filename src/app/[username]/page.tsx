import { redirect } from "next/navigation";

export default async function LegacyUsernameProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  redirect(`/user/${encodeURIComponent(username)}`);
}
