import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import "../styles/Nav.css";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";

type NavPage = "menu" | "booster" | "collection" | "settings" | "opening";

type NavItem = {
  key: "menu" | "booster" | "collection" | "settings";
  label: string;
  mobileLabel: string;
  to: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "menu",
    label: "Menu",
    mobileLabel: "Home",
    to: "/menu",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.75 10.25 12 4.5l7.25 5.75v8A1.75 1.75 0 0 1 17.5 20h-11A1.75 1.75 0 0 1 4.75 18.25z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.25 20v-5.25A1.25 1.25 0 0 1 10.5 13.5h3a1.25 1.25 0 0 1 1.25 1.25V20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "booster",
    label: "Booster",
    mobileLabel: "Booster",
    to: "/booster",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7.5 3.5h9a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9.5 7.5h5M9.5 11h5M9.5 14.5h3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "collection",
    label: "Collection",
    mobileLabel: "Collection",
    to: "/collection",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.75A1.75 1.75 0 0 1 8.75 3h7.5A1.75 1.75 0 0 1 18 4.75v10.5A1.75 1.75 0 0 1 16.25 17h-7.5A1.75 1.75 0 0 1 7 15.25z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M5.5 7.5v10.75A1.75 1.75 0 0 0 7.25 20h8.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Paramètres",
    mobileLabel: "Réglages",
    to: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 8.25A3.75 3.75 0 1 0 12 15.75A3.75 3.75 0 1 0 12 8.25Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.3 13.5a1.2 1.2 0 0 0 .24 1.32l.05.05a1.5 1.5 0 0 1 0 2.12l-.84.84a1.5 1.5 0 0 1-2.12 0l-.05-.05a1.2 1.2 0 0 0-1.32-.24a1.2 1.2 0 0 0-.73 1.1V19a1.5 1.5 0 0 1-1.5 1.5h-1.2a1.5 1.5 0 0 1-1.5-1.5v-.08a1.2 1.2 0 0 0-.73-1.1a1.2 1.2 0 0 0-1.32.24l-.05.05a1.5 1.5 0 0 1-2.12 0l-.84-.84a1.5 1.5 0 0 1 0-2.12l.05-.05a1.2 1.2 0 0 0 .24-1.32a1.2 1.2 0 0 0-1.1-.73H5A1.5 1.5 0 0 1 3.5 11.85v-1.2A1.5 1.5 0 0 1 5 9.15h.08a1.2 1.2 0 0 0 1.1-.73a1.2 1.2 0 0 0-.24-1.32l-.05-.05a1.5 1.5 0 0 1 0-2.12l.84-.84a1.5 1.5 0 0 1 2.12 0l.05.05a1.2 1.2 0 0 0 1.32.24a1.2 1.2 0 0 0 .73-1.1V5A1.5 1.5 0 0 1 12.35 3.5h1.2A1.5 1.5 0 0 1 15.05 5v.08a1.2 1.2 0 0 0 .73 1.1a1.2 1.2 0 0 0 1.32-.24l.05-.05a1.5 1.5 0 0 1 2.12 0l.84.84a1.5 1.5 0 0 1 0 2.12l-.05.05a1.2 1.2 0 0 0-.24 1.32a1.2 1.2 0 0 0 1.1.73H21a1.5 1.5 0 0 1 1.5 1.5v1.2A1.5 1.5 0 0 1 21 14.55h-.08a1.2 1.2 0 0 0-1.1.73Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

type AppNavbarProps = {
  currentPage: NavPage;
  visibleItems?: Array<NavItem["key"]>;
};

export default function AppNavbar({
  currentPage,
  visibleItems = ["menu", "booster", "collection", "settings"],
}: AppNavbarProps) {
  const links = NAV_ITEMS.filter((item) => visibleItems.includes(item.key));

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link to="/menu" className="topbar__brand" aria-label="Wankul">
          <img src={wankulLogo} className="topbar__logo" alt="Wankul" />
        </Link>

        <nav className="topbar__nav" aria-label="Navigation principale">
          {links.map((item) => {
            const isActive = item.key === currentPage;

            return (
              <Link
                key={item.key}
                className={`topbar__link ${isActive ? "is-active" : ""}`}
                data-navkey={item.key}
                data-center={item.key === "menu" ? "true" : "false"}
                to={item.to}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                <span className="topbar__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="topbar__text">{item.label}</span>
                <span className="topbar__textMobile">{item.mobileLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}