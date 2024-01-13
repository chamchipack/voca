import React from "react";
import { AppProps } from "next/app";
import { Box, Button, Container } from '@mui/material';
import Register from '@/components/Register'

export default function AppWrapper({ Component, pageProps, router }: AppProps) {
    return (
        <div>
            <Component {...pageProps} />
            <Register />
        </div>
    );
}
