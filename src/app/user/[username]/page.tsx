"use client";

import { usePathname } from "next/navigation";
import ProfileView from "../../ProfileView";

export default function UsernameProfile() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const username = parts[1] || "";
  return <ProfileView forcedUsername={username} />;
}
