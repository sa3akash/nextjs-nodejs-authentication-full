import React, { PropsWithChildren } from "react";
import Navbar from "@/components/navbar";

const Layout = ({ children }: PropsWithChildren) => {
  return (
      <div>
        <Navbar />
        {children}
      </div>
  );
};
export default Layout;
