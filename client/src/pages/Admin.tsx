import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";

import Filepond from "../components/filepond";
import DataTable from "../components/table";
function AdminPage() {
  const [data, setData] = useState<string>("");

  return (
    <div className="flex justify-center">
      <div className="flex flex-col space-y-3">
        <DataTable></DataTable>
      </div>
    </div>
  );
}

export default AdminPage;
