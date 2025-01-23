'use client';

import React, { PropsWithChildren, useEffect } from 'react';
import { updateUser } from '@/lib/actions/updateUser';
import { useAuth } from '@/lib/store/useAuth';
import { Toaster } from "@/components/ui/toaster"

const RootProviders = ({children}:PropsWithChildren) => {
  const {setLoading,setSession} = useAuth()
  useEffect(()=>{
    setLoading(true);
    updateUser().then(data=>{
      setSession(data);
      setLoading(false);
    });
  },[])
  return (
    <>
      {children}
      <Toaster />
    </>
  );
};
export default RootProviders;
