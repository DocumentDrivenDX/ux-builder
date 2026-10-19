import { useState } from "react";
import { Button } from "./Button.jsx";
import { DatePicker } from "./DatePicker.jsx";
import { Dialog } from "./Dialog.jsx";
import { Pagination } from "./Pagination.jsx";

/* Dates, the modal dialog and paging. */
export default { title: "UI Components/Dates, dialogs and paging", tags: ["autodocs"], parameters: { layout: "padded" } };

function DateDemo() { const [v, setV] = useState("2026-10-19"); return <DatePicker label="Hearing date" value={v} onChange={setV} hint="The court's listed date" />; }
export const DateField = { render: () => <DateDemo /> };

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open the dialog</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Close the matter?" description="It moves to the archive; you can reopen it later."
        actions={<><Button onClick={() => setOpen(false)}>Close matter</Button><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button></>} />
    </>
  );
}
export const ModalDialog = { render: () => <DialogDemo /> };

function PagerDemo() { const [page, setPage] = useState(2); const [size, setSize] = useState(20); return <Pagination page={page} pageSize={size} total={312} onPageChange={setPage} onPageSizeChange={setSize} />; }
export const Paging = { render: () => <PagerDemo /> };
