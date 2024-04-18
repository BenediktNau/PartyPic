import React from "react";
import { FilePond, registerPlugin } from "react-filepond";

// Import FilePond styles
import "filepond/dist/filepond.min.css";

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
