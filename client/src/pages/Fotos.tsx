import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Fotos() {
  const navigate = useNavigate();

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

  const fetchFoto = (fileName: string) => {
    return axios.get(`http://81.173.113.131:3500/images/${fileName}`);
  };

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-5/6 space-y-4 ">
        <div className="flex justify-end">
          <button
            onClick={() => {
              navigate("/fotos");
            }}
          >
            Schau dir Alle Fotos an!
          </button>
        </div>
        <div className="text-3xl text-center border-b-2 border-black font-bold ">
          Promts And Fotos:
        </div>
        <div className="space-y-4 p-2">
          {prompts.map((elem) => (
            <div key={elem.id}>
              <div className="flex  flex-col text-xl border-black border-2 p-2">
                <div>{elem.description}:</div>
                {fotoPaths.find((e) => e.promptid === elem.id) ? (
                  <div className="grid grid-cols-3">
                    {fotoPaths.map((e) => {
                      if (e.promptid === elem.id) {
                        return (
                          <div className="w-1/3">
                            <img
                              src={`http://81.173.113.131:3500/images/${e.name}`}
                            ></img>
                          </div>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <div>Noch kein BILD!</div>
                )}
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
