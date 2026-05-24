import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ValkeyProductCard = ({ product, onCartChange }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const stock = Number(product.availableStock ?? product.inventory?.quantity ?? 0);
  const outOfStock = stock <= 0;

  const addToCart = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!auth.user) {
      navigate("/account");
      return;
    }
    setPending(true);
    try {
      await api.addCartItem({ productId: product.id, quantity: 1 });
      setMessage("Added");
      if (onCartChange) onCartChange();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="demo-product-card">
      <Link to={`/product-details/${encodeURIComponent(product.id)}`} className="demo-product-card__image">
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="demo-product-card__body">
        <div className="demo-product-card__meta">
          <strong>{product.brand}</strong> - {product.rating} <i className="ph-fill ph-star" aria-hidden="true" /> - {product.reviewCount} reviews
        </div>
        <h3>
          <Link to={`/product-details/${encodeURIComponent(product.id)}`}>{product.name}</Link>
        </h3>
        <div className="demo-product-card__stock">
          {outOfStock ? "Out of stock" : `${stock} available`} {product.recommendationScore ? `- Score ${product.recommendationScore}` : ""}
        </div>
        <div className="demo-product-card__price">
          <strong>{formatPrice(product.price)}</strong>
          <span>{formatPrice(product.compareAtPrice)}</span>
        </div>
        {message && <div className={`demo-product-card__stock ${message === "Added" ? "text-main-600" : "text-danger-600"}`}>{message}</div>}
        <div className="demo-product-card__actions">
          <button className="demo-button" type="button" onClick={addToCart} disabled={pending || outOfStock}>
            <i className="ph ph-shopping-cart" aria-hidden="true" />
            {pending ? "Adding" : "Add"}
          </button>
          <Link className="demo-button demo-button--secondary" to={`/product-details/${encodeURIComponent(product.id)}`}>
            View
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ValkeyProductCard;
