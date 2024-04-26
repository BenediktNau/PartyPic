import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { useEffect, useState } from "react";
import axios from "axios";

export default function BasicTable() {
  const [scorebord, setscorebord] = useState<
    { user: string; sessionId: string; uploads_count: number }[]
  >([]);

  useEffect(() => {
    async function fetchScores() {
      setscorebord((await axios.get("http://81.173.113.131:3500/people")).data);
    }
    fetchScores();
  }, []);
  console.log(scorebord);

  return (
    <TableContainer component={Paper}>
      <Table sx={{ width: "100%" }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Uploads</TableCell>
            <TableCell align="right">Name</TableCell>
            <TableCell align="right">SessionId</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scorebord.map((row) => (
            <TableRow
              key={row.sessionId}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row" align="center">
                {row.uploads_count}
              </TableCell>
              <TableCell align="right">{row.user}</TableCell>
              <TableCell align="right">{row.sessionId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
