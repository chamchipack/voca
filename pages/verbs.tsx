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

const Verbs: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState({ japan: "", korean: "" });
  const [selectedLogic, setSelectedLogic] = useState("");
  const [wordData, setWordData] = useState([]);
  const [logicData, setLogicData] = useState([]);
  const [convert, setConvert] = useState("");

  const onLoadData = async () => {
    const { items } = await axios.get("/api/collections/verbs/records");
    setWordData(items);
  };

  const onLoadLogicData = async () => {
    const { items } = await axios.get("/api/collections/verb_logic/records");
    setLogicData(items);
  };

  useEffect(() => {
    onLoadData();
    onLoadLogicData();
  }, []);

  const handleOpen = (word: any) => {
    setSelectedWord({ japan: word.japan, korean: word.korean, ...word });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleLogicChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const targetId = event.target.value;
    console.info(logicData)
    const { value: _value } = logicData.find(({ id }) => targetId === id);

    const romaji = _value[selectedWord.form][selectedWord.endingro].split("_");
    let result = "";
    romaji.map((o) => {
      Object.values(alphabet).reduce((acc, data) => {
        const { jp = "" } = data.find(({ ro: _ro }) => _ro === o) || {};
        if (jp) result += jp;
      }, "");
    });

    setConvert(selectedWord.stemjp + result);

    setSelectedLogic(event.target.value as string);
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: "20px" }}>
      <Grid container spacing={2}>
        {wordData.map((word, index) => (
          <Grid item xs={6} key={index}>
            <Card
              variant="outlined"
              style={{ borderColor: "green", cursor: "pointer" }}
              onClick={() => handleOpen(word)}
            >
              <CardContent>
                <Typography variant="h5" component="h2">
                  {word.japan}
                </Typography>
                <Typography color="textSecondary">{word.korean}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 300,
            background: "white",
            padding: "20px",
            outline: "none",
          }}
        >
          <Typography id="simple-modal-title" variant="h6" component="h2">
            {selectedWord.japan}
          </Typography>
          <Typography id="simple-modal-description" sx={{ mt: 2 }}>
            {selectedWord.korean}
          </Typography>
          <Select
            size="small"
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={selectedLogic}
            onChange={handleLogicChange}
            fullWidth
            style={{ marginBottom: "10px" }}
          >
            {logicData.map((item, index) => (
              <MenuItem key={index} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </Select>
          {convert && <Typography>{convert}</Typography>}
        </div>
      </Modal>
    </Container>
  );
};

export default Verbs;
