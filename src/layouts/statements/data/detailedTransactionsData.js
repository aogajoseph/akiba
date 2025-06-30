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

import React from "react";

// @mui material components
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ShareIcon from "@mui/icons-material/Share";
import PrintIcon from "@mui/icons-material/Print";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const EntryNumber = ({ number }) => (
  <MDTypography display="block" variant="caption" color="text" fontWeight="medium">
    {number}
  </MDTypography>
);

const TransactionNumber = ({ txnNumber }) => (
  <MDBox display="flex" alignItems="center" lineHeight={0}>
    <MDTypography display="block" variant="button" fontWeight="medium">
      {txnNumber}
    </MDTypography>
  </MDBox>
);

const TransactionType = ({ type, icon }) => (
  <MDBox display="flex" alignItems="center">
    <MDBox mr={1}>
      <Icon sx={{ 
        color: (theme) => 
          theme.palette.mode === "dark" 
            ? "white" 
            : type === "Deposit" 
              ? "success.main" 
              : type === "Withdrawal" 
                ? "error.main" 
                : "info.main" 
      }}>
        {icon}
      </Icon>
    </MDBox>
    <MDTypography variant="button" fontWeight="medium" color="text">
      {type}
    </MDTypography>
  </MDBox>
);

const TransactionDetails = ({ details }) => (
  <MDTypography variant="button" color="text" fontWeight="regular">
    {details}
  </MDTypography>
);

const ActionButtons = () => (
  <MDBox display="flex" alignItems="center">
    <Tooltip title="Download">
      <IconButton size="small" sx={{ color: "#757575" }}>
        <FileDownloadIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Share">
      <IconButton size="small" sx={{ color: "#757575" }}>
        <ShareIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Print">
      <IconButton size="small" sx={{ color: "#757575" }}>
        <PrintIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </MDBox>
);

const data = {
  columns: [
    { Header: "#", accessor: "entryNumber", width: "3%", align: "center" },
    { Header: "Transaction ID", accessor: "transactionNumber", width: "12%", align: "left" },
    { Header: "Type", accessor: "transactionType", width: "12%", align: "left" },
    { Header: "Details", accessor: "transactionDetails", width: "30%", align: "left" },
    { Header: "Timestamp", accessor: "timestamp", width: "15%", align: "left" },
    { Header: "Amount(KES)", accessor: "amount", width: "10%", align: "right" },
    { Header: "Balance(KES)", accessor: "balance", width: "10%", align: "right" },
    { Header: "Actions", accessor: "actions", width: "8%", align: "center" },
  ],
  rows: [
    {
      entryNumber: <EntryNumber number="1" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0012025" />,
      transactionType: <TransactionType type="Deposit" icon="arrow_downward" />,
      transactionDetails: <TransactionDetails details="Initial deposit to account" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-01 09:30:45
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="success" fontWeight="medium">
          +10,000.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          10,000.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="2" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0022025" />,
      transactionType: <TransactionType type="Withdrawal" icon="arrow_upward" />,
      transactionDetails: <TransactionDetails details="ATM withdrawal" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-05 14:22:10
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="error" fontWeight="medium">
          -2,000.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          8,000.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="3" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0032025" />,
      transactionType: <TransactionType type="Transfer" icon="swap_horiz" />,
      transactionDetails: <TransactionDetails details="Transfer to Jane Doe (Savings Goal: Education)" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-10 11:05:32
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="error" fontWeight="medium">
          -1,500.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          6,500.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="4" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0042025" />,
      transactionType: <TransactionType type="Deposit" icon="arrow_downward" />,
      transactionDetails: <TransactionDetails details="Salary deposit" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-15 08:45:00
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="success" fontWeight="medium">
          +35,000.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          41,500.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="5" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0052025" />,
      transactionType: <TransactionType type="Withdrawal" icon="arrow_upward" />,
      transactionDetails: <TransactionDetails details="Online purchase - Amazon" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-18 16:30:22
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="error" fontWeight="medium">
          -5,200.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          36,300.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="6" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0062025" />,
      transactionType: <TransactionType type="Transfer" icon="swap_horiz" />,
      transactionDetails: <TransactionDetails details="Transfer from John Smith (Group Savings)" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-20 10:15:40
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="success" fontWeight="medium">
          +3,000.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          39,300.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="7" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0072025" />,
      transactionType: <TransactionType type="Withdrawal" icon="arrow_upward" />,
      transactionDetails: <TransactionDetails details="Rent payment" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-25 09:00:15
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="error" fontWeight="medium">
          -15,000.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          24,300.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
    {
      entryNumber: <EntryNumber number="8" />,
      transactionNumber: <TransactionNumber txnNumber="TXN0082025" />,
      transactionType: <TransactionType type="Deposit" icon="arrow_downward" />,
      transactionDetails: <TransactionDetails details="Refund - Cancelled subscription" />,
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          2025-01-28 14:50:30
        </MDTypography>
      ),
      amount: (
        <MDTypography variant="button" color="success" fontWeight="medium">
          +1,200.00
        </MDTypography>
      ),
      balance: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          25,500.00
        </MDTypography>
      ),
      actions: <ActionButtons />,
    },
  ],
};

export default data; 