import React from 'react';
import { getSession } from '@/lib/session';

const FeedPage = async () => {
  const session = await getSession();
  console.log(session);

  return (
    <div>FeedPage {session?.user.name}</div>
  );
};
export default FeedPage;
