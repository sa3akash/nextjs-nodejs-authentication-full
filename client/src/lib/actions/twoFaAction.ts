"use server";




import { api } from '@/lib/api';
import { getSession } from '@/lib/session';

export const verifyTwoFa = async (code: string) => {

  const session = await getSession();

  if(!session){
    return {
      error: true,
      message: 'Unauthorized',
    }
  }

  const response = await api('/security/verify',{
    method: 'POST',
    headers: {
      authorization: session?.accessToken
        ? `Bearer ${session?.accessToken}`
        : "",
    },
    body: JSON.stringify({code})
  })

}