import React, { useEffect, useState } from 'react';
import { Button, Container, Grid } from '@mui/material';

const WordbookPage: React.FC = () => {
  const words = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];
  const [data, setData] = useState(1)


  useEffect(() => {
    console.info("렌더링")
  }, [data])
  return (
   <div>
    <button onClick={() => {setData(data + 1)}}>+</button>
    <button onClick={() => {setData(data - 1)}}>-</button>
    <div>{data}</div>
   </div>
  );
};

export default WordbookPage;
