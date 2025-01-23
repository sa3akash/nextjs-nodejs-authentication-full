"use server";

import { api } from "@/lib/api";

import { getSession } from "@/lib/session";
import { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/browser';

export const getCurrentUser = async () => {
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
};

export const registerWebAuthRegister = async () => {
  const session = await getSession();

  return await api("/security/generateRegister", {
    method: "GET",
    headers: {
      authorization: session?.accessToken
        ? `Bearer ${session?.accessToken}`
        : "",
    },
  });
};

export const verifyWebAuthRegister = async (body: RegistrationResponseJSON) => {
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
};

export const startAuthenticationAction = async () => {
  const session = await getSession();

  return await api("/security/startAuthenticate", {
    method: "GET",
    headers: {
      authorization: session?.accessToken
        ? `Bearer ${session?.accessToken}`
        : "",
    },
  });
};

export const verifyAuthenticationAction = async (body: AuthenticationResponseJSON) => {
  const session = await getSession();

  return await api("/security/verifyAuthenticate", {
    method: "POST",
    headers: {
      authorization: session?.accessToken
        ? `Bearer ${session?.accessToken}`
        : "",
    },
    body: JSON.stringify(body),
  });
};
