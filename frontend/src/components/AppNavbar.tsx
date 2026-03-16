import { Link, useNavigate } from "react-router-dom";

import "../styles/Nav.css";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import { useAuth } from "../auth/AuthContext";

type NavPage = "menu" | "booster" | "collection" | "settings" | "opening";

type NavItem = {
  key: "menu" | "booster" | "collection" | "settings";
  label: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "menu", label: "Menu", to: "/menu" },
  { key: "booster", label: "Booster", to: "/booster" },
  { key: "collection", label: "Collection", to: "/collection" },
  { key: "settings", label: "Paramètres", to: "/settings" },
];

type AppNavbarProps = {
  currentPage: NavPage;
  visibleItems?: Array<NavItem["key"]>;
};

export default function AppNavbar({
  currentPage,
  visibleItems = ["menu", "booster", "collection", "settings"],
}: AppNavbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const links = NAV_ITEMS.filter(
    (item) => visibleItems.includes(item.key) && item.key !== currentPage
  );

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link to="/menu" className="topbar__brand" aria-label="Wankul">
          <img src={wankulLogo} className="topbar__logo" alt="Wankul" />
        </Link>

        <nav className="topbar__nav">
          {links.map((item) => (
            <Link key={item.key} className="topbar__link" to={item.to}>
              {item.label}
            </Link>
          ))}

          <button className="topbar__logout" onClick={handleLogout}>
            Se déconnecter
          </button>
        </nav>
      </div>
    </header>
  );
}
