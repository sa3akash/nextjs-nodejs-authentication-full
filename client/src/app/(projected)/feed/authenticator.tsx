"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import { generate2Fa } from "@/lib/actions/securityAction";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { offTwoFaAction, verifyTwoFa } from "@/lib/actions/twoFaAction";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Authenticator = ({ data }: { data: any }) => {
  const [state, setState] = useState<{
    qrcodeImage: string;
    secretKey: string;
  } | null>(null);

  const [code, setCode] = useState<string>("");
  const { toast } = useToast();
  const [open, setOpen] = useState<boolean>(false);

  if(!data){
    return null
  }

  useEffect(() => {
    if (!data.twoFactorEnabled) {
      generate2Fa().then((data) => {
        setState(data);
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (!code) {
      alert("Please enter a code");
      return;
    }
    const res = await verifyTwoFa(code);

    if (res.status === "error") {
      toast({
        title: res.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: res.message,
      variant: "default",
    });

    setOpen(false);
    setCode('')
  };

  const handleOff = async () => {
    if (!code) {
      alert("Please enter a code");
      return;
    }
    const res = await offTwoFaAction(code);
    if (res?.status === "error") {
      toast({
        title: res.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: res.message,
      variant: "default",
    });

    setOpen(false);
    setCode('')
  };

  return (
    <div>
      <h3>Authenticator app 2fa</h3>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger
          className={cn(buttonVariants({ variant: "default" }), {
            "bg-rose-300": data.twoFactorEnabled,
          })}
        >
          {data.twoFactorEnabled ? "Disabled" : "Enable"}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Authenticator 2fa {data.twoFactorEnabled ? "Disabled" : "Enable"}?
            </DialogTitle>
            {!data.twoFactorEnabled && (
              <div>
                {state?.qrcodeImage && (
                  <Image
                    src={state.qrcodeImage}
                    alt=""
                    width={250}
                    height={250}
                  />
                )}
                <div>
                  <p className="prose break-normal truncate">
                    {state?.secretKey}
                  </p>
                </div>
              </div>
            )}
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={code}
              onChange={(value) => setCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <DialogDescription>
              {data.twoFactorEnabled ? (
                <Button onClick={handleOff}>Off 2fa</Button>
              ) : (
                <Button onClick={handleSubmit}>Verify</Button>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Authenticator;
