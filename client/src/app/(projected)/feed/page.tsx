import React from "react";
import { getSession } from "@/lib/session";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

const Authenticator = dynamic(() => import('@/app/(projected)/feed/authenticator'), {
  loading: () => <p>Loading...</p>,
})

const FeedPage = async () => {
  const sesstion = await getSession();

  return (
    <div className="flex max-w-prose mx-auto flex-col gap-10">
        <Authenticator />

    </div>
  );
};
export default FeedPage;
