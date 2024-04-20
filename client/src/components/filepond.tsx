import { FilePond, registerPlugin, FilePondProps } from "react-filepond";

// Import FilePond styles
import "filepond/dist/filepond.min.css";

//
//Imports for preview
//

import React, { useState } from "react";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginFileMetadata from 'filepond-plugin-file-metadata';
import { create } from "filepond";

import "filepond/dist/filepond.min.css";
import { styled } from "@mui/material";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginFileMetadata);



function Filepond() {
  
    return (
    <div className=" w-5/6 sm:w-2/5">
      <FilePond

        credits={false}
        allowMultiple={true}
        maxFiles={3}
        server="http://localhost:3500/upload"
        allowFileMetadata ={true}
        
        
      />
    </div>



  );
}


export default Filepond;
