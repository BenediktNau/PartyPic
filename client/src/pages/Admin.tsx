import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";

import Filepond from "../components/filepond";
import DataTable from "../components/table";
function AdminPage() {
  const [data, setData] = useState<string>();
  function handleSubmit() {}

  return (
    <div className="flex justify-center">
      <div className="flex flex-col space-y-3">
        <div>
          <form onSubmit={() => {}}>
            <input
              className="shadow-md"
              name="prompt"
              value={data}
              type="text"
            ></input>{" "}
            <button className="border-b-2 border-black">Submit</button>
          </form>
        </div>
        <DataTable></DataTable>
      </div>
    </div>
  );
}

export default AdminPage;
