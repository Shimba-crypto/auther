import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

export default function Landing() {
  usePageTitle("");
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Auther</h1>
      <p className="text-gray-500 mt-3 max-w-xl">One login for all ZamAI apps. JohnWeb, ShimSearch, ShimbaData, NexasPay — single account, single password, works everywhere.</p>
      <div className="flex flex-wrap gap-3 mt-6">
        <Link to="/register" className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 font-medium">Get started</Link>
        <Link to="/login" className="text-sm text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:border-gray-500 font-medium">Log in</Link>
      </div>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{i:"🔐",t:"Secure",d:"bcrypt + JWT + httpOnly cookies"},{i:"🔑",t:"SSO",d:"one login across all apps"},{i:"🛡️",t:"Rate limits",d:"5 attempts / 15 min"},{i:"👤",t:"Admin",d:"manage users & access"}].map(f=>(
          <div key={f.t} className="border rounded-lg p-4"><div className="text-2xl mb-1">{f.i}</div><h3 className="font-semibold">{f.t}</h3><p className="text-sm text-gray-500 mt-0.5">{f.d}</p></div>
        ))}
      </div>
    </div>
  );
}
