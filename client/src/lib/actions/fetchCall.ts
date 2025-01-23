'use server';

import { api } from "@/lib/api";

import { getSession } from "@/lib/session";
import { RegistrationResponseJSON } from '@simplewebauthn/browser';

export const getCurrentUser = async () => {
  try {
    const session = await getSession();

    return await api("/auth/getUser", {
      method: "GET",
      headers: {
        authorization: session?.accessToken
          ? `Bearer ${session?.accessToken}`
          : "",
      },
      next: { tags: ["currentUsers"] },
    });
  }catch(err){
    throw new Error("Server Error")
  }
};

export const registerWebAuthRegister = async () => {
  try {
    const session = await getSession();

    return await api("/security/generateRegister", {
      method: "GET",
      headers: {
        authorization: session?.accessToken
          ? `Bearer ${session?.accessToken}`
          : "",
      },
    });
  }catch(err){
    throw new Error("Server Error")
  }
};

export const verifyWebAuthRegister = async (body: RegistrationResponseJSON) => {
 try {
   const session = await getSession();

   return await api("/security/verifyRegister", {
     method: "POST",
     headers: {
       authorization: session?.accessToken
         ? `Bearer ${session?.accessToken}`
         : "",
     },
     body: JSON.stringify(body),
   });
 }catch(err){
   throw new Error("Server Error")
 }
};
