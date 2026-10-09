"use client";

import { usePathname } from "next/navigation";
import ProfileView from "../ProfileView";

export default function UsernameProfile() {
  const pathname = usePathname();
  const username = pathname.split("/").filter(Boolean)[0] || "";
  return <ProfileView forcedUsername={username} />;
}
