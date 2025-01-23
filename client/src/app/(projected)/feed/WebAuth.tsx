"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { startRegistration } from "@simplewebauthn/browser";
import {
  registerWebAuthRegister,
  verifyWebAuthRegister,
} from "@/lib/actions/fetchCall";

const WebAuth = () => {
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleWebAuthRegister = async () => {
    setLoading(true);
    try {

      const options = await registerWebAuthRegister();
      // console.log("options", options);

      const attestationResponse = await startRegistration({
        optionsJSON: options,
        // useAutoRegister: true
      });

      // console.log("attestationResponse", attestationResponse);

      const result = await verifyWebAuthRegister(attestationResponse);

      // console.log({ result });
      setLoading(false);

    } catch (err) {
      console.log({ err });
      alert((err as {message:string}).message);
      setLoading(false);

    }
  };

  return (
    <div>
      <h1>Web auth</h1>
      <Button disabled={loading} onClick={handleWebAuthRegister}>
        {loading ? "Loading ..." : "Register WebAuth"}
      </Button>
    </div>
  );
};
export default WebAuth;
