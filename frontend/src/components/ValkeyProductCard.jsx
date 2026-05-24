import React from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";

const ValkeyProductCard = ({ product, onCartChange }) => {
  const addToCart = async (event) => {
    event.preventDefault();
    await api.addCartItem({ productId: product.id, quantity: 1 });
    if (onCartChange) onCartChange();
  };

  return (
    <div className="product-card h-100 p-16 border border-gray-100 hover-border-main-600 rounded-8 position-relative transition-2">
      <button
        type="button"
        onClick={addToCart}
        className="product-card__cart btn bg-main-50 text-main-600 hover-bg-main-600 hover-text-white py-8 px-12 rounded-8 flex-align gap-8 position-absolute inset-block-start-0 inset-inline-end-0 me-12 mt-12"
      >
        <i className="ph ph-shopping-cart" /> Add
      </button>
      <Link to={`/product-details/${encodeURIComponent(product.id)}`} className="product-card__thumb flex-center bg-gray-50 rounded-8 p-16">
        <img src={product.image} alt={product.name} />
      </Link>
      <div className="product-card__content mt-16">
        <div className="flex-align gap-6">
          <span className="text-xs fw-bold text-gray-600">{product.rating}</span>
          <span className="text-15 fw-bold text-warning-600 d-flex">
            <i className="ph-fill ph-star" />
          </span>
          <span className="text-xs fw-bold text-gray-600">({product.reviewCount})</span>
        </div>
        <h6 className="title text-md fw-semibold mt-12 mb-8">
          <Link to={`/product-details/${encodeURIComponent(product.id)}`} className="link text-line-2">
            {product.name}
          </Link>
        </h6>
        <div className="flex-align gap-4 mb-8">
          <span className="text-main-600 text-md d-flex">
            <i className="ph-fill ph-storefront" />
          </span>
          <span className="text-gray-500 text-xs">{product.brand}</span>
        </div>
        <div className="product-card__price">
          <span className="text-gray-400 text-sm fw-semibold text-decoration-line-through me-8">
            {formatPrice(product.compareAtPrice)}
          </span>
          <span className="text-heading text-md fw-semibold">{formatPrice(product.price)}</span>
        </div>
      </div>
    </div>
  );
};

export default ValkeyProductCard;
