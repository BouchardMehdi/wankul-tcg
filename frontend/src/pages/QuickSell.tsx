import { Navigate } from "react-router-dom";

export default function QuickSell() {
  return <Navigate to="/collection?quickSellMode=1" replace />;
}