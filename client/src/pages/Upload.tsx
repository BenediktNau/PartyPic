import { Modal } from "@mui/material";
import FilePond from "../components/filepond";
import React, { useEffect, useState } from "react";
import { getCookie, setCookie } from "typescript-cookie";
import randomToken from "random-token";
import { useNavigate } from "react-router";

function Upload() {
  const navigate = useNavigate();

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    console.log(getCookie("KekseFürAlle"));
    if (
      getCookie("KekseFürAlle") === "" ||
      getCookie("KekseFürAlle") === undefined
    ) {
      setOpenModal(true);
    }
  });

  return (
    <div className=" flex justify-center w-full flex-col space-y-4">
      <div className=" bg-[#f1f0ef] rounded-lg px-4 space-y-8 ">
        <FilePond />
      </div>
      <button
        onClick={() => {
          navigate("/scoreboard");
        }}
        className="flex justify-center pt-12"
      >
        Hier geht´s zum Scoreboard!
      </button>

      <Modal
        className="flex justify-center items-center font-[Myfont] "
        open={openModal}
        onClose={() => {}}
      >
        <div className="flex w-5/6 h-40 items-center bg-gray-300  p-8 justify-center rounded-md">
          <div className="flex flex-col space-y-2">
            <div>Name:</div>
            <input
              type="text"
              onChange={(e) => setName(e.target.value)}
              className="border-b-2 p-2 border-black rounded-md"
            />
            <button
              className="border-black border-2 rounded-md"
              onClick={() => {
                setCookie("KekseFürAlle", name);
                setCookie("sessionId", String(randomToken(16)));
                setOpenModal(false);
              }}
            >
              PicME
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Upload;
