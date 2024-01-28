import React from "react";
import { AppProps } from "next/app";
import { Box, Button, Container } from "@mui/material";
import Register from "@/components/Register";

export default function AppWrapper({ Component, pageProps, router }: AppProps) {
  console.log(pageProps);
  return (
    <div>
      <Component {...pageProps} />
    </div>
  );
}
