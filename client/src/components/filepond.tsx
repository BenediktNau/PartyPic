import { FilePond, registerPlugin, FilePondProps } from "react-filepond";


// Import FilePond styles
import "filepond/dist/filepond.min.css";

//
//Imports for preview
//

import React, { useState } from 'react';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
//import { useState } from "react";

import 'filepond/dist/filepond.min.css';

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview);
//
//
function Filepond() {
  return (
    <div>
      <FilePond
        allowMultiple={true}
        maxFiles={3}
        server="http://localhost:3500/upload"
      />
    </div>
  );
}

export default Filepond;
