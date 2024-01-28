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
import Register from '@/components/Register'
import alphabet from "@/config/format/japanese";




const Nouns: React.FC = () => {
  const [wordData, setWordData] = useState([]);

  const handleDataFromChild = (value: string) => {
    // if (value) onLoadData()
  };
  const onLoadData = async () => {
    const { items } = await axios.get("/api/collections/nouns/records");
    setWordData(items);

  };
  onLoadData();

  return (
    <Container maxWidth="sm" style={{ marginTop: "20px" }}>
      <Register onReceiveData={handleDataFromChild} />
      <Grid container spacing={2}>
        {wordData.map((word: any, index) => (
          <Grid item xs={12} key={index}>
            <Card
              variant="outlined"
              style={{ borderColor: "purple", cursor: "pointer" }}
            >
              <CardContent style={{ display: 'flex', alignItems: 'center', paddingBottom: '0rem', paddingTop: '0rem', justifyContent: "space-between" }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h5" component="h2" style={{ paddingRight: "1rem" }}>
                    {word.japan}
                  </Typography>

                  <Typography color="textSecondary" >{word.roman}</Typography>

                </div>
                <div style={{ alignItems: 'center', paddingLeft: "1rem" }}>
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