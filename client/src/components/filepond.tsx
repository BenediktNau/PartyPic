import { FilePond, registerPlugin, FilePondProps } from "react-filepond";

// Import FilePond styles
import "filepond/dist/filepond.min.css";

//
//Imports for preview
//

import React, { useEffect, useState } from "react";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import {
  ActualFileObject,
  ProgressServerConfigFunction,
  create,
} from "filepond";
import "filepond/dist/filepond.min.css";
import { styled } from "@mui/material";
import axios from "axios";
import { getCookie, setCookie, removeCookie } from "typescript-cookie";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview);

function Filepond(): JSX.Element {
  const [randomLine, setRandomLine] = useState<{
    id: number | null;
    description: string;
  }>({ id: null, description: "Await Prompt" });

  useEffect(() => {
    fetchRandomLine();
  }, []);

  const fetchRandomLine = async () => {
    if ((getCookie("prompt"))) {
      console.log(getCookie("prompt"));
      setRandomLine(JSON.parse(getCookie("prompt")!));
    } else {
      try {
        const response = await axios.get("http://localhost:3500/random-line");
        if (!response.data) {
          throw new Error("Failed to fetch random line");
        }
        const data = await response.data;
        setRandomLine(data);
        setCookie("prompt", JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching random line:", error);
      }
    }
  };
  console.log(randomLine);

  document
    .querySelector(".filepond--root")
    ?.addEventListener("FilePond:processfiles", (e) => {});

  return (
    <React.Fragment>
      <div className="flex justify-center border-b-2 border-black ">
        <div className="flex flex-col text-center">
          <div>Fotografiere:</div>
          <div>{randomLine.description}</div>
        </div>
      </div>

      <div className="flex justify-center w-full">
        <div className=" w-5/6 sm:w-2/5">
          <FilePond
            credits={false}
            allowMultiple={true}
            maxFiles={1}
            server={{
              url: "http://localhost:3500/upload",
              headers: {
                Name: `${getCookie("KekseFürAlle")}`,
                Id: `${randomLine.id}`,
              },
            }}
            onprocessfile={() => {
              removeCookie("prompt");
              fetchRandomLine();
            }}
          />
        </div>
      </div>
    </React.Fragment>
  );
}

export default Filepond;
