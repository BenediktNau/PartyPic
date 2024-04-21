import axios from "axios";
import React from "react";

function Fotos() {
  return (
    <div>
      <button
        onClick={() => {
          axios
            .post(
              "http://localhost:3500/getfotos",
               {id: 1} ,
              {
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              }
            )
            .then(function (response) {
              console.log(response);
            })
            .catch(function (error) {
              console.log(error);
            });
        }}
      >
        Test
      </button>
      <div></div>
    </div>
  );
}

export default Fotos;
