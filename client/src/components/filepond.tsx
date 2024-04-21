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
import FilePondPluginFileMetadata from "filepond-plugin-file-metadata";
import {
  ActualFileObject,
  ProgressServerConfigFunction,
  create,
} from "filepond";

import "filepond/dist/filepond.min.css";
import { styled } from "@mui/material";
import axios from "axios";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileMetadata
);

function Filepond(): JSX.Element {
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
  console.log(randomLine);

  return (
    <div className=" w-5/6 sm:w-2/5">
      <FilePond
        credits={false}
        allowMultiple={true}
        maxFiles={3}
        allowFileMetadata={true}
        fileMetadataObject={{ hallo: "sdad" }}
        server={{
          url: "http://localhost:3500/upload",
        }}
        oninit={() => {}}
      />
    </div>
  );
}

export default Filepond;
