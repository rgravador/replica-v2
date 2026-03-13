import { useState, useRef, useEffect } from "react";
import type { NavItem } from "./navigation-data";
import styles from "./NavigationDropdown.module.css";

interface NavigationDropdownProps {
  item: NavItem;
}

export function NavigationDropdown({ item }: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!item.children || item.children.length === 0) {
    return (
      <a href={item.href} className={styles.trigger}>
        {item.title}
      </a>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {item.title}
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {item.children.map((child) => (
            <a key={child.title} href={child.href} className={styles.menuItem}>
              {child.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
