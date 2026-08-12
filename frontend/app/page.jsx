import OfficeClient from "../components/OfficeClient";

export default function Page() {
  return <OfficeClient apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"} />;
}
