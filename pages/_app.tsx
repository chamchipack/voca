import React from "react";
import { AppProps } from "next/app";
import { Box, Button, Container } from '@mui/material';

export default function AppWrapper({ Component, pageProps, router }: AppProps) {
    return (
        <div>
            <Component {...pageProps} />
            <Box component="footer" sx={{ bgcolor: 'lightgrey', p: 3, position: 'fixed', bottom: 0, width: '90%', marginLeft: '-2%' }}>
                <Container maxWidth="md" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button variant="contained">홈</Button>
                    {/* <Button variant="contained">B</Button> */}
                    <Button variant="contained">등록</Button>
                </Container>
            </Box>
        </div>
    );
}
