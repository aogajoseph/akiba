/* eslint-disable react/prop-types */
/* eslint-disable react/function-component-definition */

/**
=========================================================
* Akiba - v1.0.0
=========================================================

* Product Page: https://www.aogajoseph.github.io/akiba/
* Copyright 2025 Joseph Onyango (https://www.aogajoseph.github.io/)

Coded by Joseph Onyango

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import React, { useState } from "react";

// @mui material components
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

export default function data() {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = (row) => {
    console.log(`Download statement for: ${row.period}`);
    setAnchorEl(null);
  };

  const handleShare = (row) => {
    console.log(`Share statement for: ${row.period}`);
    setAnchorEl(null);
  };

  const SummaryStatement = ({ period }) => (
    <MDBox display="flex" alignItems="center" lineHeight={0}>
      <MDTypography display="block" variant="button" fontWeight="medium" ml={0} lineHeight={0}>
        {period}
      </MDTypography>
    </MDBox>
  );

  return {
    columns: [
      { Header: "period", accessor: "statementPeriod", width: "10%", align: "left" },
      {
        Header: "opening balance (Kshs)",
        accessor: "openingBalance",
        width: "15%",
        align: "center",
      },
      {
        Header: "total credits (Kshs)",
        accessor: "totalCredits",
        width: "15%",
        align: "center",
      },
      {
        Header: "total debits (Kshs)",
        accessor: "totalDebits",
        width: "15%",
        align: "center",
      },
      {
        Header: "uncleared funds (Kshs)",
        accessor: "unclearedFunds",
        width: "15%",
        align: "center",
      },
      {
        Header: "closing balance (Kshs)",
        accessor: "closingBalance",
        width: "15%",
        align: "center",
      },
      { Header: "options (Download/Share)", accessor: "options", align: "center" },
    ],

    rows: [
      {
        statementPeriod: <SummaryStatement period="Jan 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,500
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            11,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            9,300
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            312
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Feb 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            50,000
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            18,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            9,000
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            6,201
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Mar 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            30,400
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            500
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            6,200
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            10,120
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Apr 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            14,000
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            2,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            5,400
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            3,001
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="May 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            10,000
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            8,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            2,100
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            5,300
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Jun 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            3,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            1,300
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            4,164
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Jul 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            4,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            3,000
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            10,123
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Aug 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            5,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            1,500
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            8,550
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Sep 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            8,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            1,800
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            13,120
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Oct 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            800
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            12,001
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Nov 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            6,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            1,300
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            11,216
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
      {
        statementPeriod: <SummaryStatement period="Dec 2025" />,
        openingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            20,300
          </MDTypography>
        ),
        totalCredits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            6,300
          </MDTypography>
        ),
        totalDebits: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            2,600
          </MDTypography>
        ),
        unclearedFunds: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            0
          </MDTypography>
        ),
        closingBalance: (
          <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
            22
          </MDTypography>
        ),
        options: (
          <>
            <IconButton onClick={handleMenuClick}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => handleDownload({ period: "Jan 2025" })}>Download</MenuItem>
              <MenuItem onClick={() => handleShare({ period: "Jan 2025" })}>Share</MenuItem>
            </Menu>
          </>
        ),
      },
    ],
  };
}
