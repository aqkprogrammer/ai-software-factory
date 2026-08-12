import OfficeClient from "../components/OfficeClient";

/*  NEXT_PUBLIC_API_URL points at the FastAPI bridge. Set it to an empty string
    to run the UI with no backend at all — that's how the hosted demo runs, and
    it stops the app from retrying a socket that will never be there.        */
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Page() {
  return <OfficeClient apiUrl={API} />;
}
