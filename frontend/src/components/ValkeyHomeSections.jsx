import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import ValkeyProductCard from "./ValkeyProductCard";

const ValkeyHomeSections = () => {
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    api.trending({ window: "24h", limit: 8 }).then((data) => setTrending(data.results || [])).catch(() => setTrending([]));
    api.recommendations({ limit: 8 }).then((data) => setRecommendations(data.results || [])).catch(() => setRecommendations([]));
  }, []);

  const renderSection = (title, items) => (
    <section className="py-40">
      <div className="container container-lg">
        <div className="section-heading">
          <h5 className="mb-0">{title}</h5>
        </div>
        <div className="row gy-4 g-12 mt-8">
          {items.map((product) => (
            <div className="col-xxl-3 col-lg-4 col-sm-6" key={product.id}>
              <ValkeyProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      {renderSection("Trending Now", trending)}
      {renderSection("Recommended For You", recommendations)}
    </>
  );
};

export default ValkeyHomeSections;
