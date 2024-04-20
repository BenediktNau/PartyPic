import React, { useState } from 'react';

function RandomLineFetcher() {
  const [randomLine, setRandomLine] = useState('');

  const fetchRandomLine = async () => {
    try {
      const response = await fetch('/random-line');
      if (!response.ok) {
        throw new Error('Failed to fetch random line');
      }
      const data = await response.text();
      setRandomLine(data);
    } catch (error) {
      console.error('Error fetching random line:', error);
    }
  };

  return (
    <div>
      <button onClick={fetchRandomLine}>Get Random Line</button>
      <p>{randomLine}</p>
    </div>
  );
}

export default RandomLineFetcher;