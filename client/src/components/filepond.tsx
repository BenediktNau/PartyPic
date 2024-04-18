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
//import { useState } from "react";

import "filepond/dist/filepond.min.css";
import axios from "axios";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview);
//
//
function Filepond() {
    const handleClick = () => {
        axios.get(`http://localhost:3500/save`)
    }

  return (
    <div className="w-screen">
      <FilePond
        allowMultiple={true}
        maxFiles={3}
        server="http://localhost:3500/upload"
      />
      <div className="flex justify-center">
        <button onClick={handleClick} className="border-b-2 border-gray-700 hover:border-blue-500">Submit</button>
      </div>
    </div>
  );
}

export default Filepond;
