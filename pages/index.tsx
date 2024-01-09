import React from 'react';
import { Button, Container, Grid } from '@mui/material';

const WordbookPage: React.FC = () => {
  const words = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

  return (
    <Container maxWidth="sm" style={{ marginTop: '20px' }}>
      <Grid container spacing={2}>
        {words.map((word, index) => (
          <Grid item xs={12} key={index}>
            <Button variant="outlined" fullWidth>
              {word}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default WordbookPage;
