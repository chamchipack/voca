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
import Register from "@/components/Register";
import alphabet from "@/config/format/japanese";
import { Box } from "@mui/system";

interface Word {
  japan: string;
  roman: string;
  korean: string;
  example: string;
  examplekorean: string;
}

const Adjust: React.FC = () => {
  const [wordData, setWordData] = useState<Word[]>([]);

  const handleDataFromChild = (value: string) => {
    // if (value) onLoadData()
  };
  const onLoadData = async () => {
    const { items } = await axios.get("/api/collections/adjust/records");
    if (items != null) setWordData(items);
  };
  onLoadData();

  return (
    <Container maxWidth="sm" style={{ marginTop: "20px" }}>
      <Register onReceiveData={handleDataFromChild} />
      <Grid container spacing={2}>
        {wordData.map((word, index: number) => (
          <Grid item xs={12} key={index}>
            <Card
              variant="outlined"
              style={{ borderColor: "purple", cursor: "pointer" }}
            >
              <CardContent
                style={{
                  display: "flex",
                  paddingBottom: "0rem",
                  paddingTop: "0rem",
                  justifyContent: "space-between",
                  flexDirection: "column",
                }}
              >
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingBottom: "0rem",
                    paddingTop: "0rem",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      variant="h5"
                      component="h2"
                      style={{ marginRight: "0.5rem", fontSize: "1.2rem" }}
                    >
                      {word.japan}
                    </Typography>

                    <Typography
                      color="textSecondary"
                      style={{ fontSize: "0.7rem" }}
                    >
                      [{word.roman}]
                    </Typography>
                  </div>
                  <div style={{ alignItems: "center" }}>
                    <Typography
                      color="textSecondary"
                      style={{ fontSize: "1rem" }}
                    >
                      {word.korean}
                    </Typography>
                  </div>
                </Box>
                <Box>
                  <div>
                    <Typography
                      color="textSecondary"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {word.example}
                    </Typography>
                  </div>
                </Box>
                <Box>
                  <div>
                    <Typography
                      color="textSecondary"
                      style={{ fontSize: "0.6rem" }}
                    >
                      {word.examplekorean}
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
export default Adjust;
