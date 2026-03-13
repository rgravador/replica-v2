import { Link } from "react-router";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.section}>
          <h3 className={styles.heading}>REPLICA STORE</h3>
          <p className={styles.text}>
            Quality replica and historical weapons for collectors and enthusiasts.
          </p>
        </div>

        <div className={styles.section}>
          <h4 className={styles.subheading}>Quick Links</h4>
          <nav className={styles.links}>
            <Link to="/" className={styles.link}>Shop</Link>
            <a href="#about" className={styles.link}>About Us</a>
            <a href="#contact" className={styles.link}>Contact</a>
            <a href="#faqs" className={styles.link}>FAQs</a>
          </nav>
        </div>

        <div className={styles.section}>
          <h4 className={styles.subheading}>Legal</h4>
          <nav className={styles.links}>
            <a href="#warranty" className={styles.link}>Warranty & Returns</a>
            <a href="#disclaimer" className={styles.link}>Disclaimer</a>
            <a href="#license" className={styles.link}>Licensing</a>
          </nav>
        </div>

        <div className={styles.section}>
          <h4 className={styles.subheading}>Contact</h4>
          <p className={styles.text}>
            support@replicastore.com
          </p>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} Replica Store. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
