import { OtpVerifyForm } from '@/components/auth/otp-form';
import { Separator } from '@/components/ui/separator';

export default function OtpVerify() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="max-w-sm w-full" >
        <div className="mb-6">
          <h1
            className="text-xl tracking-[-0.16px] dark:text-[#fcfdffef] font-bold mt-4
        text-center sm:text-left"
          >
            Multi-Factor Authentication
          </h1>
          <p className="mb-4 text-center sm:text-left text-[15px] dark:text-[#f1f7feb5] font-normal">
            Enter the code from your authenticator app.
          </p>
        <Separator />
        </div>
        <OtpVerifyForm />
      </div>
    </div>
  )
}
