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
import { getCookie } from "typescript-cookie";
function FotosFree() {
  return (
    <div className=" flex justify-center w-full flex-col space-y-4">
      <div className=" bg-[#f1f0ef] rounded-lg px-4 space-y-8 ">
        <div>
          <div className="flex justify-center border-b-2 border-black ">
            <div className="flex flex-col text-center">
              <div>Teile deine Erlebnisse:</div>
            </div>
          </div>
          <div className="flex justify-center w-full">
            <div className=" w-5/6 sm:w-2/5 space-y-8">
              <FilePond
                credits={false}
                allowMultiple={true}
                server={{
                  url: "http://81.173.113.131:3500/upload",
                  headers: {
                    Name: `${getCookie("KekseFürAlle")}`,
                    Id: `100`,
                  },
                }}
              />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default FotosFree;
