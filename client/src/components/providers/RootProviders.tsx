'use client';

import React, { PropsWithChildren, useEffect } from 'react';
import { updateUser } from '@/lib/actions/updateUser';
import { useAuth } from '@/lib/store/useAuth';

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
    <>{children}</>
  );
};
export default RootProviders;
