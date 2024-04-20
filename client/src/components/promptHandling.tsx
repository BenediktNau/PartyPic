import axios from "axios";
import React, { useEffect, useState } from "react";

function RandomLineFetcher() {
  const [randomLine, setRandomLine] = useState<{
    id: number | null;
    description: string;
  }>({ id: null, description: "Await Prompt" });

  useEffect(() => {
    fetchRandomLine();
  }, []);

  const fetchRandomLine = async () => {
    try {
      const response = await axios.get("http://localhost:3500/random-line");
      if (!response.data) {
        throw new Error("Failed to fetch random line");
      }
      const data = await response.data;
      setRandomLine(data);
    } catch (error) {
      console.error("Error fetching random line:", error);
    }
  };

  return <div>{randomLine.description}</div>;
}

export default RandomLineFetcher;
