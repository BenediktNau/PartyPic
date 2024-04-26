import * as React from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import axios from "axios";

const columns: GridColDef[] = [
  { field: "user", headerName: "User", width: 160 },
  { field: "sessionId", headerName: "SessionID", width: 160 },
  { field: "uploads_count", headerName: "Uploads", width: 170 },
];

export default function DataTable() {
  const [scorebord, setscorebord] = useState<
    { user: string; sessionId: string; uploads_count: number }[]
  >([]);

  useEffect(() => {
    async function fetchScores() {
      setscorebord((await axios.get("http://localhost:3500/people")).data);
    }
    fetchScores();
  }, []);

  function getRowId(row: {
    user: string;
    sessionId: string;
    uploads_count: number;
  }) {
    return row.sessionId;
  }

  console.log(scorebord);
  return (
    <div style={{ height: "400px", width: "100%" }}>
      <DataGrid
        getRowId={getRowId}
        rows={scorebord}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        pageSizeOptions={[10, 20, 100]}
        checkboxSelection
      />
    </div>
  );
}
