'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import { generate2Fa } from '@/lib/actions/securityAction';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { verifyTwoFa } from '@/lib/actions/twoFaAction';


const Authenticator = () => {
  const [state,setState] = useState<{
    qrcodeImage: string;
    secretKey:string
  } | null>(null);

  const [code,setCode] = useState<string>('')


  useEffect(()=>{
    generate2Fa().then(data=>{
      setState(data)
    })
  },[])
  
  const handleSubmit = () => {
    if(!code){
      alert("Please enter a code")
      return;
    }
    verifyTwoFa(code).then(res=>{
      console.log(res);

    })
  }

  return (
    <div>
      <h3>Authenticator app 2fa</h3>
      <Dialog>
        <DialogTrigger className={buttonVariants({variant: "default"})}>Enable</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authenticator 2fa Enable?</DialogTitle>
            <div>
              {state?.qrcodeImage &&
                <Image src={state.qrcodeImage} alt="" width={250} height={250}/>}
                <div>
                  <p className="prose break-normal truncate">{state?.secretKey}</p>
                </div>
            </div>
            <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={(value)=>setCode(value)}>
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
              <Button onClick={handleSubmit}>Verify</Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>


  );
};
export default Authenticator;
