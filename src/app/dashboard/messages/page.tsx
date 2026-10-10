import { redirect } from "next/navigation";

/** Legacy inbox URL — conversations now live at /messages. */
export default function MessagesRedirect() {
  redirect("/messages");
}
