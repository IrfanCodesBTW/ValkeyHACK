import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/cart", label: "Cart" },
  { to: "/account", label: "Account" }
];

const DemoLayout = ({ children, mainClassName = "" }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setMenuOpen(false);
  };

  return (
    <div className="demo-app">
      <header className="demo-header">
        <div className="demo-shell demo-header__inner">
          <Link className="demo-brand" to="/" onClick={() => setMenuOpen(false)}>
            <span className="demo-brand__mark" aria-hidden="true">
              <i className="ph ph-database" />
            </span>
            <span>
              <strong>Valkey Mart</strong>
              <small>Electronics marketplace</small>
            </span>
          </Link>

          <nav className={`demo-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `demo-nav__link${isActive ? " is-active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <form className="demo-header-search" onSubmit={submitSearch} role="search">
            <label className="sr-only" htmlFor="demo-header-search">
              Search products
            </label>
            <input
              id="demo-header-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search laptops, phones, audio"
            />
            <button type="submit" aria-label="Search">
              <i className="ph ph-magnifying-glass" />
            </button>
          </form>

          <div className="demo-header__actions">
            {auth.user ? (
              <button className="demo-link-button" type="button" onClick={auth.logout}>
                <i className="ph ph-sign-out" aria-hidden="true" />
                Logout
              </button>
            ) : (
              <Link className="demo-link-button" to="/account">
                <i className="ph ph-user" aria-hidden="true" />
                Sign in
              </Link>
            )}
            <button
              className="demo-menu-button"
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <i className={`ph ${menuOpen ? "ph-x" : "ph-list"}`} />
            </button>
          </div>
        </div>
      </header>

      <main className={`demo-main ${mainClassName}`}>{children}</main>

      <footer className="demo-footer">
        <div className="demo-shell demo-footer__inner">
          <div>
            <strong>Valkey Mart</strong>
            <p>Modern electronics shopping with reliable catalog, cart, and checkout flows.</p>
          </div>
          <div className="demo-footer__links">
            <Link to="/shop">Catalog</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/account">Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoLayout;
