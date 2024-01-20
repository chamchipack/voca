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
import { SelectChangeEvent } from '@mui/material';


import alphabet from "@/config/format/japanese";

interface LogicValue {
  [key: string]: {
    [subKey: string]: string;
  };
}

interface Logic {
  id: string;
  name: string;
  value: LogicValue;
}

interface WordData {
  japan: string;
  korean: string;
  roman: string;
  japanWithoutKanji: string;
  stemro: string;
  stemjp: string;
  endingro: string;
  endingjp: string;
  form: string;
  exception: boolean;
}

const Verbs: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordData>({
    japan: "",
    korean: "",
    roman: "",
    japanWithoutKanji: "",
    stemro: "",
    stemjp: "",
    endingro: "",
    endingjp: "",
    form: "",
    exception: false,
  });

  const [selectedLogic, setSelectedLogic] = useState("");
  const [wordData, setWordData] = useState<WordData[]>([]);
  const [logicData, setLogicData] = useState<Logic[]>([]);
  const [convert, setConvert] = useState("");

  const onLoadData = async () => {
    const { items } = await axios.get("/api/collections/verbs/records");
    setWordData(items);
  };

  const handleDataFromChild = (value: string) => {
    if (value) onLoadData()
  }

  const onLoadLogicData = async () => {
    const { items } = await axios.get("/api/collections/verb_logic/records");
    setLogicData(items);
  };

  useEffect(() => {
    onLoadData();
    onLoadLogicData();
  }, []);

  const handleOpen = (word: WordData) => {
    const { japan, korean, ...rest } = word
    setSelectedWord({ japan, korean, ...rest });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setConvert('')
    setSelectedLogic('')
    setSelectedWord({
      japan: "",
      korean: "",
      roman: "",
      japanWithoutKanji: "",
      stemro: "",
      stemjp: "",
      endingro: "",
      endingjp: "",
      form: "",
      exception: false,
    });
  };

  const handleLogicChange = (event: SelectChangeEvent<string>) => {
    const targetId = event.target.value;
    const logic = logicData.find(({ id }) => targetId === id);

    if (!logic || !logic.value) return;
    const romaji = logic.value[selectedWord.form][selectedWord.endingro].split("_");
    let result = "";
    romaji.map((o: string) => {
      Object.values(alphabet).forEach(data => {
        const { jp = "" } = data.find(({ ro: _ro }) => _ro === o) || {};
        if (jp) result += jp;
      });
    });

    setConvert(selectedWord.stemjp + result);

    setSelectedLogic(event.target.value as string);
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: "20px" }}>
      <Register onReceiveData={handleDataFromChild} />
      <Grid container spacing={2}>
        {wordData.map((word, index) => (
          <Grid item xs={6} key={index}>
            <Card
              variant="outlined"
              style={{ borderColor: "green", cursor: "pointer", height: '80px' }}
              onClick={() => handleOpen(word)}
            >
              <CardContent>
                <Typography variant="h5" component="h2">
                  {word.japan}
                </Typography>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="textSecondary">{word.korean}</Typography>
                  <Typography color="textSecondary">{word.roman}</Typography>
                </div>
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
            {logicData.map(({ id, name }) => (
              <MenuItem key={id} value={id}>
                {name}
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
