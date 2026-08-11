import { NavLink } from "react-router-dom";
import { Home, MessageCircle, Radio, Gamepad2, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/inbox", label: "Inbox", icon: MessageCircle },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-40 shadow-[0_-1px_6px_rgba(0,0,0,0.03)]">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold transition-colors ${
              isActive ? "text-orange-500" : "text-gray-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} fill={isActive && Icon === Home ? "none" : "none"} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
