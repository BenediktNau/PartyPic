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
  console.log(randomLine)


  const handleProcessFile = (
    fieldName: string,
    file: ActualFileObject,
    metadata: any,
    load: Function,
    error: Function,
    progress: Function,
    abort: Function
  ) => {
    // You can access metadata here and perform any required actions
    const randomNumber = Math.floor(Math.random() * 1000);

    // Add the random number to the metadata
    const updatedMetadata = { ...metadata, randomNumber };

    // You can access metadata here and perform any required actions
    console.log("Metadata with Random Number:", updatedMetadata);

    // To handle file processing, you can use the provided functions
    load(file);
  };

  return (
    <div className=" w-5/6 sm:w-2/5">
      <FilePond
        credits={false}
        allowMultiple={true}
        maxFiles={3}
        allowFileMetadata={true}
        server={{
          process: (
            fieldName,
            file,
            metadata,
            load,
            error,
            progress,
            abort
          ) => {
            handleProcessFile(
              fieldName,
              file,
              metadata,
              load,
              error,
              progress,
              abort
            );
          },
          url: "http://localhost:3500/upload",
        }}
        oninit={() => {}}
      />
    </div>
  );
}

export default Filepond;
