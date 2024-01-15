import React, { useState } from "react";
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FileCopyIcon from '@mui/icons-material/FileCopyOutlined';
import alphabet from "@/config/format/japanese";
import {
    Box, Button, Container, SpeedDial, SpeedDialAction, SpeedDialIcon,
    Select, FormControl, MenuItem, TextField, InputLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, FormControlLabel,
    Checkbox
} from '@mui/material';
import axios from "@/config/axios/axios";

const actions = [
    { icon: <SaveIcon />, name: '등록', id: 'create' },
];

interface RegisterProps {
    onReceiveData: (value: string) => void;
}

const initialWordState = {
    korean: '',
    japan: '',
    japanWithoutKanji: '',
    roman: '',
    form: '',
    exception: false,
};

export default function Register({ onReceiveData }: RegisterProps) {
    const [open, setOpen] = useState(false);
    const [word, setWord] = useState(initialWordState);
    const [partOfSpeech, setPartOfSpeech] = useState('')

    const speedDialClick = (value: string) => {
        if ('create' === value) setOpen(true);
    };

    const dialogClose = async () => {
        const ww = Object.values(word).every(value => value !== null && value !== undefined && value !== '');
        if (!ww) return alert('칸을 비우지마세요')

        const { japan = '', roman, ...rest } = word
        const data = {
            japan,
            roman,
            stemjp: japan.slice(0, -1),
            stemro: '',
            endingjp: japan[japan.length - 1] || '',
            endingro: '',
            ...rest
        }
        Object.values(alphabet).forEach(val => {
            const { ro = '' } = val.find(({ jp = '' }) => jp === japan[japan.length - 1]) || {}
            if (ro) data.endingro = ro
        })
        data.stemro = roman.endsWith(data.endingro) ? roman.slice(0, -data.endingro.length) : roman;

        try {
            await axios.post("/api/collections/verbs/records", data)
        } catch (err) {
            return
        }
        setOpen(false);
        // 다이얼로그가 닫힐 때 상태 초기화
        setWord(initialWordState);
        onReceiveData('send');
    };

    const dialogCancel = () => {
        setOpen(false);
        setWord(initialWordState);
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => { // Changed event type
        const { name, value, type, checked } = event.target;
        // input 요소의 name에 따라 해당 프로퍼티를 업데이트
        setWord((prevWord) => ({
            ...prevWord,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    return (
        <div>
            <SpeedDial
                ariaLabel="SpeedDial basic"
                sx={{ position: 'absolute', bottom: 20, right: 15 }}
                icon={<SpeedDialIcon openIcon={<EditIcon />} />}
            >
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={() => speedDialClick(action.id)}
                    />
                ))}
            </SpeedDial>

            <Dialog onClose={dialogClose} open={open}>
                <DialogTitle>단어 등록</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth size="small">
                        <InputLabel id="part-of-speech-label">품사</InputLabel>
                        <Select
                            size="small"
                            autoWidth
                            labelId="part-of-speech-label"
                            id="part-of-speech"
                            name="partOfSpeech"
                            value={partOfSpeech}
                            label="품사"
                            onChange={(e) => setPartOfSpeech(e.target.value as string,)}
                        >
                            <MenuItem value={'verb'}>동사</MenuItem>
                            <MenuItem value={'noun'}>명사</MenuItem>
                            <MenuItem value={'adjust'}>형용사</MenuItem>
                            <MenuItem value={'adverb'}>부사</MenuItem>
                        </Select>
                    </FormControl>
                    {
                        partOfSpeech === 'verb' ? <Box
                            component="form"
                            sx={{
                                '& .MuiTextField-root': { m: 1, width: '25ch' },
                            }}
                            noValidate
                            autoComplete="off"
                        >
                            <TextField
                                label="한국어"
                                variant="outlined"
                                size="small"
                                name="korean"
                                value={word.korean}
                                onChange={handleInputChange}
                            />
                            <TextField
                                label="일본어"
                                variant="outlined"
                                size="small"
                                name="japan"
                                value={word.japan}
                                onChange={handleInputChange}
                            />
                            <TextField
                                label="일본어 (칸지 제외)"
                                variant="outlined"
                                size="small"
                                name="japanWithoutKanji"
                                value={word.japanWithoutKanji}
                                onChange={handleInputChange}
                            />
                            <TextField
                                label="로마자"
                                variant="outlined"
                                size="small"
                                name="roman"
                                value={word.roman}
                                onChange={handleInputChange}
                            />
                            <TextField
                                label="형태"
                                variant="outlined"
                                size="small"
                                name="form"
                                value={word.form}
                                onChange={handleInputChange}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="exception"
                                        checked={word.exception}
                                        onChange={handleInputChange}
                                    />
                                }
                                label="예외"
                            />
                        </Box> : null
                    }
                </DialogContent>
                <DialogActions>
                    <Button onClick={dialogCancel}>취소</Button>
                    <Button onClick={dialogClose}>저장</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
