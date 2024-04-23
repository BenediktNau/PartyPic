import axios from "axios";
import React, { useEffect, useState } from "react";

function SeeAllFotos() {
  const [prompts, setPrompts] = useState<
    { id: number | 0; description: string }[]
  >([]);

  const [fotoPaths, setFilePaths] = useState<
    { id: number; name: string; promptid: number; user: string }[]
  >([]);

  useEffect(() => {
    fetchPromps();
  }, []);

  useEffect(() => {
    fetchFotoPath(prompts.length);

    setFilePaths([]);
  }, [prompts]);

  const fetchPromps = async () => {
    const response = await axios.get("http://81.173.113.131:3500/getPrompts");
    if (!response.data) {
      throw new Error("Failed to fetch Prompts");
    }
    const data = await response.data;
    setPrompts(data);
  };
  console.log(fotoPaths);

  const fetchFotoPath = (id: number) => {
    axios
      .post(
        "http://81.173.113.131:3500/getfotopaths",
        { id: id },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .then(function (response) {
        !!response.data ? setFilePaths(response.data) : setFilePaths([]);
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-5/6 space-y-4 ">
        <div className="text-3xl text-center border-b-2 border-black font-bold ">
          Fotos:
        </div>
        <div className="space-y-4 p-2">
          <div className="flex  flex-col text-xl border-black border-2 p-2">
            <div className="grid grid-cols-2 gap-2">
              {fotoPaths.map((e) => {
                return (
                  
                    <img className="h-40 max-w-full rounded-lg object-cover object-center md:h-60" src={`http://81.173.113.131:3500/images/${e.name}`}></img>
                
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4"></div>
      </div>
    </div>
  );
}

export default SeeAllFotos;
