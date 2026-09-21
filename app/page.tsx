import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/app-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getAppUser();
  redirect(user ? "/dashboard" : "/login");
}
