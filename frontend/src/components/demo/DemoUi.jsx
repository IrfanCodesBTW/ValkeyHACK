import React from "react";

export const Alert = ({ type = "info", children }) => (
  <div className={`demo-alert demo-alert--${type}`} role={type === "danger" ? "alert" : "status"}>
    {children}
  </div>
);

export const EmptyState = ({ icon = "ph-shopping-bag-open", title, children, action }) => (
  <div className="demo-empty">
    <span className="demo-empty__icon" aria-hidden="true">
      <i className={`ph ${icon}`} />
    </span>
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {action && <div className="demo-empty__action">{action}</div>}
  </div>
);

export const SkeletonGrid = ({ count = 8 }) => (
  <div className="demo-grid demo-grid--products" aria-label="Loading products">
    {Array.from({ length: count }).map((_, index) => (
      <div className="demo-skeleton-card" key={index}>
        <span />
        <strong />
        <em />
      </div>
    ))}
  </div>
);

export const Field = ({ id, label, hint, error, children }) => (
  <div className="demo-field">
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && !error && <small>{hint}</small>}
    {error && (
      <small className="demo-field__error" role="alert">
        {error}
      </small>
    )}
  </div>
);

export const PageHeader = ({ eyebrow, title, children, actions }) => (
  <section className="demo-page-header">
    <div>
      {eyebrow && <span className="demo-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
    {actions && <div className="demo-page-header__actions">{actions}</div>}
  </section>
);
