import { Link } from "react-router";
import { CartIcon } from "./CartIcon";
import { NavigationDropdown } from "./NavigationDropdown";
import { navigationItems } from "./navigation-data";
import styles from "./Navigation.module.css";

interface NavigationProps {
  cartCount: number;
}

export function Navigation({ cartCount }: NavigationProps) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          REPLICA STORE
        </Link>

        <nav className={styles.nav}>
          {navigationItems.map((item) => (
            <NavigationDropdown key={item.title} item={item} />
          ))}
        </nav>

        <div className={styles.actions}>
          <Link to="/cart" className={styles.cartLink}>
            <CartIcon count={cartCount} />
          </Link>
        </div>
      </div>
    </header>
  );
}
