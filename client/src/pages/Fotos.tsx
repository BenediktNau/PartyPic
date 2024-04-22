import axios from "axios";
import React, { useEffect, useState } from "react";

function Fotos() {
  const [prompts, setPrompts] = useState<
    { id: number | 0; description: string }[]
  >([]);

  const [fotoPaths, setFilePaths] = useState<string[][]>([]);

  useEffect(() => {
    test();
    fetchFotoPath(3);
  }, []);

  const test = async () => {
    const response = await axios.get("http://localhost:3500/getPrompts");
    if (!response.data) {
      throw new Error("Failed to fetch Prompts");
    }
    const data = await response.data;
    setPrompts(data);
  };

  const fetchFotoPath = (id: number) => {
    axios
      .post(
        "http://localhost:3500/getfotopaths",
        { id: id },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .then(function (response) {
        setFilePaths([...fotoPaths, response.data]);
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  const fetchFoto = (fileName: string) => {
    return axios.get(`http://localhost:3500/images/${fileName}`);
  };
  console.log(fotoPaths);

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-5/6 ">
        <div className="text-3xl text-center border-b-2 border-black font-bold ">
          Promts And Fotos:
        </div>
        <div>
          {prompts.map((elem) => (
            <div key={elem.id}>
              <div className="flex  flex-col text-xl">
                <div>{elem.description}:</div>
                <div>
                  {
                    fotoPaths[elem.id].map((e)=> <img src={`http://localhost:3500/images/${e}`}></img>)
                  }
                  
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4"></div>
      </div>
    </div>
  );
}

export default Fotos;
