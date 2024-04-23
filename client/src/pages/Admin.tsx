import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";

import Filepond from "../components/filepond";

function AdminPage() {
  const [data1, setData] = useState<{ message: string }>({ message: "" });

  console.log(data1!.message);
  const handleClick = async () => {
    try {
      const data = await axios.get(`http://81.173.113.131:3500/api`);
      setData(data.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <button onClick={handleClick}> Test </button>
      <Filepond />
    </div>
  );
}

export default AdminPage;
