import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Container,
  Modal,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "@/config/axios/axios";

import alphabet from "@/config/format/japanese";

const wordData = [{
    japan: "家",
    korean:"집",
    roman: "ie",
}, {
    japan: "本",
    korean:"책",
    roman: "hon",
}]

const Nouns: React.FC = () => {
    return (
        <Container maxWidth="sm" style={{ marginTop: "20px" }}>
      <Grid container spacing={2}>
        {wordData.map((word, index) => (
          <Grid item xs={12} key={index}>
            <Card
              variant="outlined"
              style={{ borderColor: "purple", cursor: "pointer" }}
            >
             <CardContent style={{display:'flex', alignItems: 'center', paddingBottom:'0rem',  paddingTop:'0rem', justifyContent: "space-between"}}>
                <div style={{display:'flex', alignItems: 'center'}}>
                <Typography variant="h5" component="h2" style={{paddingRight:"1rem"}}>
                  {word.japan}
                </Typography>
                
                <Typography color="textSecondary" >{word.roman}</Typography>
                
                </div>
                <div style={{ alignItems: 'center', paddingLeft:"1rem"}}>
                <Typography color="textSecondary" style={{}}>{word.korean}</Typography>
                </div>
                
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
     
    </Container>
    )
}
export default Nouns