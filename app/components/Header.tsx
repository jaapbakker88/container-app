import { Link } from "react-router";

function Header() {
  return (
    <header className="py-3 px-4 flex items-center justify-between">
      <Link to="/" className="text-blue-600 hover:underline text-sm">
        ← Back to overview
      </Link>

      <h1 className="font-bold text-base text-black/90">bin mate</h1>
    </header>
  );
}

export default Header;
