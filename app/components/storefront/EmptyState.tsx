import { Link } from "react-router";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  heading: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  heading,
  message,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>

      <h3 className={styles.heading}>{heading}</h3>
      <p className={styles.message}>{message}</p>

      {actionLabel && actionHref && (
        <Link to={actionHref} className={styles.action}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
