import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";

import Filepond from "../components/filepond";
import DataTable from "../components/table";
function AdminPage() {
  const [data1, setData] = useState<{ message: string }>({ message: "" });

  const handleClick = async () => {
    try {
      const data = await axios.get("http://localhost:3500/people");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <button onClick={handleClick}> Test </button>
      <DataTable></DataTable>
    </div>
  );
}

export default AdminPage;
