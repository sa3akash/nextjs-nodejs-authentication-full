'use client'

import { useAuth } from '@/lib/store/useAuth';

export default function Home() {
  const {session,loading} = useAuth();

  if(loading){
    return (
      <h1>
        Loading...
      </h1>
    )
  }


  return <div>Home page {session?.user.name}</div>;
}
