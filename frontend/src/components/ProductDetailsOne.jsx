import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatPrice } from "../api/client";

const ProductDetailsOne = () => {
  const { id } = useParams();
  const productId = id ? decodeURIComponent(id) : "product:001";
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
    api.product(productId).then((data) => {
      setProduct(data);
      api.trackView(data.id).catch(() => {});
    }).catch((error) => setMessage(error.message));
  }, [productId]);

  const addToCart = async () => {
    setMessage("");
    try {
      await api.addCartItem({ productId, quantity });
      setMessage("Added to cart.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!product) {
    return <section className="product-details py-80"><div className="container container-lg">{message || "Loading product..."}</div></section>;
  }

  return (
    <section className="product-details py-80">
      <div className="container container-lg">
        {message && <div className="alert alert-info">{message}</div>}
        <div className="row gy-4">
          <div className="col-lg-6">
            <div className="product-details__thumb-slider border border-gray-100 rounded-8 p-24 bg-gray-50">
              <div className="product-details__thumb flex-center">
                <img src={product.image} alt={product.name} />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <h4 className="mb-12">{product.name}</h4>
            <div className="flex-align gap-12 mb-24">
              <span className="text-warning-600"><i className="ph-fill ph-star" /> {product.rating}</span>
              <span className="text-gray-500">({product.reviewCount} reviews)</span>
              <span className="text-gray-500">SKU: {product.sku}</span>
            </div>
            <p className="text-gray-700">{product.description}</p>
            <div className="mt-32 flex-align gap-12">
              <h4 className="mb-0">{formatPrice(product.price)}</h4>
              <span className="text-gray-500 text-decoration-line-through">{formatPrice(product.compareAtPrice)}</span>
            </div>
            <div className="mt-32 flex-align gap-16">
              <div className="border border-gray-100 rounded-pill py-9 px-16 flex-align">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} type="button" className="quantity__minus p-4 flex-center"><i className="ph ph-minus" /></button>
                <input type="number" className="quantity__input border-0 text-center w-32" value={quantity} readOnly />
                <button onClick={() => setQuantity(quantity + 1)} type="button" className="quantity__plus p-4 flex-center"><i className="ph ph-plus" /></button>
              </div>
              <button onClick={addToCart} type="button" className="btn btn-main rounded-pill flex-align gap-8 px-48">
                <i className="ph ph-shopping-cart" /> Add To Cart
              </button>
              <Link to="/cart" className="btn btn-outline-main rounded-pill">Cart</Link>
            </div>
            <div className="mt-32">
              {(product.tags || []).map((tag) => <span className="badge bg-main-50 text-main-600 me-8" key={tag}>{tag}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsOne;
