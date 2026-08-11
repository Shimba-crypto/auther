import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Not found");
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <p className="text-7xl font-extrabold gradient-text">404</p>
      <p className="text-slate-400 mt-3 mb-8">That page does not exist in the Auther universe.</p>
      <Link to="/" className="inline-block btn-primary text-white text-sm font-semibold px-6 py-3 rounded-xl">
        Back to home
      </Link>
    </div>
  );
}
