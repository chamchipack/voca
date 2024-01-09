import React from 'react';
import { Button, Container, Grid } from '@mui/material';
import menu from '@/config/menu-config'
import { useRouter } from "next/router";

const WordbookPage: React.FC = () => {
    const words = ['동사', '명사', '형용사', '부사', '기타'];
    const router = useRouter()

    const onClickMove = (target: string) => {
        router.push(target)
    }

    return (
        <Container maxWidth="sm" style={{ marginTop: '20px' }}>
            <Grid container spacing={2}>
                {menu.map(({ name, id, target }, index) => (
                    <Grid item xs={12} key={id} style={{ height: '50px' }}>
                        <Button variant="outlined" fullWidth onClick={() => { onClickMove(target) }}>
                            {name}
                        </Button>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default WordbookPage;
