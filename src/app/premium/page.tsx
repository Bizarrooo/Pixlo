import { redirect } from "next/navigation";

type PremiumPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PremiumPage({ searchParams }: PremiumPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["checkout", "session_id"]) {
    const value = params[key];
    if (typeof value === "string" && value.length <= 200) query.set(key, value);
  }
  const suffix = query.toString();
  redirect("/pricing" + (suffix ? "?" + suffix : ""));
}
