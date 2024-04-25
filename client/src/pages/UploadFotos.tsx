import { FilePond, registerPlugin, FilePondProps } from "react-filepond";

// Import FilePond styles
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond/dist/filepond.min.css";
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
                  url: "http://localhost:3500/upload",
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
