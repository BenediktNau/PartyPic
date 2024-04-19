import { useCookies } from "react-cookie";
import FilePond from "../components/filepond";
import React from "react";

function Upload() {
  return (
    <div className=" flex justify-center">
      <FilePond />
      <div>
        Hallo <div>Test </div>Welt
      </div>
    </div>
  );
}

export default Upload;
