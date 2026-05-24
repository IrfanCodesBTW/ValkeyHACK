import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, EmptyState, SkeletonGrid } from "./demo/DemoUi";

const ProductDetailsOne = () => {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const productId = id ? decodeURIComponent(id) : "product:001";
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    setMessage("");
    setLoading(true);
    api
      .product(productId)
      .then((data) => {
        if (!alive) return;
        setProduct(data);
        setQuantity(1);
        api.trackView(data.id).catch(() => {});
      })
      .catch((error) => {
        if (alive) setMessage(error.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  const stock = Number(product?.availableStock ?? product?.inventory?.quantity ?? 0);

  const addToCart = async () => {
    setMessage("");
    if (!auth.user) {
      navigate("/account");
      return;
    }
    setPending(true);
    try {
      await api.addCartItem({ productId, quantity });
      setMessage("Added to cart.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <section className="demo-section">
        <div className="demo-shell">
          <SkeletonGrid count={2} />
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="demo-section">
        <div className="demo-shell">
          <EmptyState
            icon="ph-warning-circle"
            title="Product not found"
            action={
              <Link className="demo-button" to="/shop">
                Back to catalog
              </Link>
            }
          >
            {message || "The product could not be loaded."}
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="demo-section">
      <div className="demo-shell">
        {message && <Alert type={message === "Added to cart." ? "success" : "warning"}>{message}</Alert>}
        <div className="demo-detail-layout">
          <div className="demo-detail-media">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="demo-detail-info">
            <span className="demo-eyebrow">
              <i className="ph ph-storefront" aria-hidden="true" />
              {product.brand}
            </span>
            <h1>{product.name}</h1>
            <div className="demo-muted">
              SKU {product.sku} - {product.rating} <i className="ph-fill ph-star" aria-hidden="true" /> - {product.reviewCount} reviews
            </div>
            <p className="mt-24">{product.description}</p>
            <div className="demo-detail-price">
              <strong>{formatPrice(product.price)}</strong>
              <span>{formatPrice(product.compareAtPrice)}</span>
            </div>
            <div className={stock > 0 ? "demo-alert demo-alert--success" : "demo-alert demo-alert--warning"}>
              {stock > 0 ? `${stock} units available for checkout` : "Out of stock"}
            </div>
            <div className="d-flex gap-12 flex-wrap align-items-center">
              <div className="demo-qty" aria-label="Quantity">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                  <i className="ph ph-minus" />
                </button>
                <input readOnly value={quantity} aria-label="Selected quantity" />
                <button type="button" aria-label="Increase quantity" disabled={quantity >= stock} onClick={() => setQuantity((value) => Math.min(stock, value + 1))}>
                  <i className="ph ph-plus" />
                </button>
              </div>
              <button className="demo-button" type="button" onClick={addToCart} disabled={pending || stock <= 0}>
                <i className="ph ph-shopping-cart" aria-hidden="true" />
                {pending ? "Adding" : "Add to cart"}
              </button>
              <Link to="/cart" className="demo-button demo-button--secondary">
                View cart
              </Link>
            </div>
            <div className="demo-tags">
              {(product.tags || []).map((tag) => (
                <span className="demo-badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsOne;
