import React from "react";
import { getSession } from "@/lib/session";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/actions/fetchCall";
import WebAuth from '@/app/(projected)/feed/WebAuth';

const Authenticator = dynamic(
  () => import("@/app/(projected)/feed/authenticator"),
  {
    loading: () => <p>Loading...</p>,
  },
);

const FeedPage = async () => {
  const session = await getSession();

  if (!session?.user) {
    return <div>Unauthorized!</div>;
  }

  const user = await getCurrentUser();

  return (
    <div className="flex max-w-prose mx-auto flex-col gap-10">
      <Authenticator data={user} />
      <WebAuth />
    </div>
  );
};
export default FeedPage;
