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

const item = [
  {
    collectionId: "f4rh1gs6e04gz51",
    collectionName: "verbs",
    created: "2024-01-09 01:19:42.611Z",
    endingjp: "く",
    endingro: "ku",
    exception: false,
    form: "1",
    id: "31jpzxrhrqx96rj",
    japan: "書く",
    japanWithoutKanji: "かく",
    korean: "글을쓰다",
    roman: "kaku",
    stemjp: "書",
    stemro: "ka",
    updated: "2024-01-09 04:06:40.828Z",
  },
  {
    collectionId: "f4rh1gs6e04gz51",
    collectionName: "verbs",
    created: "2024-01-09 01:19:42.611Z",
    endingjp: "す",
    endingro: "su",
    exception: false,
    form: "1",
    id: "31diwlahrqx96rj",
    japan: "話す",
    japanWithoutKanji: "はなす",
    korean: "말하다",
    roman: "hanasu",
    stemjp: "話",
    stemro: "hana",
    updated: "2024-01-09 04:06:40.828Z",
  },
];

const logic = [
  {
    collectionId: "dryyg11q7rqqhga",
    collectionName: "verb_logic",
    created: "2024-01-09 05:02:35.848Z",
    id: "6sbhlhlv5fgoyj1",
    name: "했다",
    updated: "2024-01-09 06:32:50.613Z",
    value: {
      u: "t_ta",
      ku: "i_ta",
      su: "shi_ta",
      tsu: "t_ta",
      nu: "n_da",
      mu: "n_da",
      ru: "t_ta",
    },
  },
  {
    collectionId: "dryyg11q7rqqhga",
    collectionName: "verb_logic",
    created: "2024-01-09 05:02:35.848Z",
    id: "6qpelflv5fgoyj1",
    name: "안하다",
    updated: "2024-01-09 06:32:50.613Z",
    value: {
      u: "wa_na_i",
      ku: "ka_na_i",
      su: "sa_na_i",
      tsu: "ta_na_i",
      nu: "na_na_i",
      mu: "ma_na_i",
      ru: "ra_na_i",
    },
  },
];

const menuItem = [
  { value: "acoi4dr36fg8ber", text: "하고싶지않았다" },
  { value: "awndzqwq4s6edgs", text: "하고싶었다" },
  { value: "pf9d0v2fmfiesqi", text: "하고싶지않다" },
  { value: "1i4uvpokwlhfmk4", text: "하고싶다" },
  { value: "4pjxhcs9bl0mcnd", text: "안했습니다" },
  { value: "zadv7mjq9x5ua10", text: "안합니다" },
  { value: "dc6s612g7bmun7m", text: "했습니다" },
  { value: "wzscccggcuknvv7", text: "합니다" },
  { value: "k0a276xr2gseu97", text: "안했다" },
  { value: "3l8j5be92fte4vq", text: "안하다" },
  { value: "6sbhlhlv5fgoyj1", text: "했다" },
];

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
    console.info(items);
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
