import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import "../styles/Nav.css";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import { useAuth } from "../auth/AuthContext";

type NavPage =
  | "menu"
  | "booster"
  | "collection"
  | "market"
  | "settings"
  | "opening"
  | "admin";

type NavItem = {
  key: "menu" | "booster" | "collection" | "market" | "settings" | "admin";
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
          d="M5 5.75h5.25V11H5zM13.75 5.75H19V11h-5.25zM5 13H10.25V18.25H5zM13.75 13H19V18.25h-5.25z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
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
          d="M8 3.75h8l3 3.5v9.5A2.25 2.25 0 0 1 16.75 19h-9.5A2.25 2.25 0 0 1 5 16.75v-9.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8.4 7.5h7.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="m12 9.4.78 1.58 1.74.26-1.26 1.22.3 1.74L12 13.4l-1.56.8.3-1.74-1.26-1.22 1.74-.26z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
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
          d="M8.5 4.25h8a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V6.25a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 7.75h6M9.5 11h6M9.5 14.25h4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M4.5 7.25v10A2 2 0 0 0 6.5 19.25H15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "market",
    label: "Market",
    mobileLabel: "Market",
    to: "/market",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.75 8.5 6.4 5h11.2l1.65 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.25 8.5h13.5a1.25 1.25 0 0 1 1.25 1.25v6.5A3 3 0 0 1 17 19.25H7a3 3 0 0 1-3-3v-6.5A1.25 1.25 0 0 1 5.25 8.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 12.25h6M12 10v4.5"
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
          d="M6 6.5h12M6 12h12M6 17.5h12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9 6.5a1.5 1.5 0 1 0 0 .01M15 12a1.5 1.5 0 1 0 0 .01M11 17.5a1.5 1.5 0 1 0 0 .01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "admin",
    label: "Administration",
    mobileLabel: "Admin",
    to: "/admin",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3.5 19 6.25v5.25c0 4.25-2.65 7.43-7 9-4.35-1.57-7-4.75-7-9V6.25Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12.25 11.25 14 14.75 10.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
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
  visibleItems,
}: AppNavbarProps) {
  const { role } = useAuth();

  const defaultVisibleItems: Array<NavItem["key"]> =
    role === "admin"
      ? ["menu", "booster", "collection", "market", "settings", "admin"]
      : ["menu", "booster", "collection", "market", "settings"];

  const allowedItems = visibleItems ?? defaultVisibleItems;
  const links = NAV_ITEMS.filter((item) => allowedItems.includes(item.key));

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link to="/menu" className="topbar__brand" aria-label="Wankul">
          <img src={wankulLogo} className="topbar__logo" alt="Wankul" />
        </Link>

        <nav
          className="topbar__nav"
          aria-label="Navigation principale"
          data-count={links.length}
        >
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
