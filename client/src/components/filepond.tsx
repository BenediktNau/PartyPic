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
import FilePondPluginFileMetadata from 'filepond-plugin-file-metadata';
import { ActualFileObject, ProgressServerConfigFunction, create } from "filepond";

import "filepond/dist/filepond.min.css";
import { styled } from "@mui/material";


registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginFileMetadata);



function Filepond(): JSX.Element {
  const handleInit = () => {
    console.log("Filepond initialized");
  };
 
  
  const handleProcessFile = (fieldName: string, file: ActualFileObject, metadata: any, load: Function, error: Function, progress: Function, abort: Function) => {
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
        allowFileMetadata ={true}
        server={{
          process: (fieldName, file, metadata, load, error, progress, abort) => {
            handleProcessFile(fieldName, file, metadata, load, error, progress, abort);
          }, url: "http://localhost:3500/upload"
        }}
        oninit={() => handleInit()}
      
        
        
      />
    </div>



  );
}


export default Filepond;
