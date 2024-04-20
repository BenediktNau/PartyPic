import { useCookies } from "react-cookie";
import FilePond from "../components/filepond";
import React from "react";

function Upload() {
  return (
    <div className=" flex justify-center">
      <div className="w-5/6 sm:w-2/5">
        <div className="flex justify-center  ">
          <div className="">placeHolder</div>
        </div>
        <FilePond />
      </div>
    </div>
  );
}

export default Upload;
