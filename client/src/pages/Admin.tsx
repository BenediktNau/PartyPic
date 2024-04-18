import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";


import FilePond from "../components/filepond";

function AdminPage() {
  const [data1, setData] = useState<{message: string}>({message: ""});

  console.log(data1!.message);
  const handleClick = async () => {
    try {
      const data = await axios.get(`http://localhost:3500/api`);
      setData(data.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <button onClick={handleClick}> Test </button>
    </div>
  );
}

export default AdminPage;
